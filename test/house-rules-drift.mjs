// scripts/house-rules.txt is the text an AI reads before it writes a recipe, so
// it decides whether the render works. It is our copy of knowledge Shotstack
// maintains in the @shotstack/cli agent skill. A copy drifts.
//
// It already did. The rules told the model to name a font "Manrope ExtraBold"
// when the family must be the URL basename, so every render using a headline
// failed. Nothing caught it, because a bad recipe still returns 2xx from this
// node — the render fails later, at Shotstack.
//
//   npm test
//
// Two checks, because neither alone is enough:
//   1. shotstack validate on a recipe built from the rules. Catches fonts,
//      overlaps, non-public URLs and any schema change.
//   2. A read of the skill's deprecation table. validate accepts deprecated
//      assets, so only this catches the rules recommending an old one.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const houseRules = read('../scripts/house-rules.txt');
const skill = read('../node_modules/@shotstack/cli/skills/shotstack/shared/agent-core.md');
const fonts = read('../node_modules/@shotstack/cli/skills/shotstack/references/fonts.md');

let failed = 0;
const check = (label, run) => {
	try {
		run();
		console.log(`  ok    ${label}`);
	} catch (error) {
		failed += 1;
		console.error(`  FAIL  ${label}\n        ${error.message.split('\n')[0]}`);
	}
};

check('a recipe built from the house rules still validates', () => {
	const cli = fileURLToPath(new URL('../node_modules/@shotstack/cli/dist/shotstack.js', import.meta.url));
	const fixture = fileURLToPath(new URL('./recipe-following-house-rules.json', import.meta.url));
	// --strict so a warning fails too. The font mistake was a warning.
	execFileSync(process.execPath, [cli, 'validate', '--strict', fixture], { stdio: 'pipe' });
});

check('every font URL we hand out is in the official catalogue', () => {
	const ours = houseRules.match(/https:\/\/fonts\.gstatic\.com\/\S+\.ttf/g) ?? [];
	assert.ok(ours.length > 0, 'the house rules list no font URLs at all');
	const catalogue = skill + fonts;
	const invented = ours.filter((url) => !catalogue.includes(url));
	assert.deepEqual(invented, [], `not in the official catalogue: ${invented.join(' ')}`);
});

check('every font family we name matches its own URL basename', () => {
	const ours = houseRules.match(/https:\/\/fonts\.gstatic\.com\/\S+\.ttf/g) ?? [];
	const missing = ours
		.map((url) => url.split('/').pop().replace(/\.ttf$/, ''))
		.filter((basename) => !houseRules.includes(basename + ' '));
	assert.deepEqual(missing, [], `family missing beside its URL: ${missing.join(' ')}`);
});

check('the house rules name every asset type Shotstack deprecates', () => {
	// The skill states them in one sentence:
	//   `text`, `title`, `caption`, `html`, `shape`. They still parse but ...
	const start = skill.indexOf('### Deprecated');
	const sentence = skill.slice(start, skill.indexOf('They still parse', start));
	const deprecated = (sentence.match(/`([a-z][a-z0-9-]*)`/g) ?? []).map((t) => t.slice(1, -1));
	assert.ok(deprecated.length > 0, 'could not read the deprecation sentence from the skill');

	const unmentioned = deprecated.filter((name) => !houseRules.includes(`"${name}"`));
	assert.deepEqual(unmentioned, [], `deprecated by Shotstack but not flagged in our rules: ${unmentioned.join(' ')}`);
});

if (failed) {
	console.error(`\n${failed} failing. scripts/house-rules.txt has drifted from @shotstack/cli.`);
	process.exit(1);
}
console.log('\n4 passing');
