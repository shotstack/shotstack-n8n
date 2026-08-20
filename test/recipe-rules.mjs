// The node hands an AI two things: allowed values generated from Shotstack's
// OpenAPI file, and Shotstack's own agent skill vendored by
// scripts/vendor-skill.mjs. Neither is written here, so these checks are about
// the vendoring being sound rather than the advice being right.
//
//   npm test
//
// Offline on purpose. Whether the pin still matches upstream is a network
// question, and CI asks it as a separate step.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const vendored = read('../nodes/Shotstack/reference/skill.ts');

const constant = (name) => {
	const match = vendored.match(new RegExp(`export const ${name} = ("(?:[^"\\\\]|\\\\.)*");`, 's'));
	assert.ok(match, `${name} missing from the vendored skill`);
	return JSON.parse(match[1]);
};

let failed = 0;
let passed = 0;
const check = (label, run) => {
	try {
		run();
		passed += 1;
		console.log(`  ok    ${label}`);
	} catch (error) {
		failed += 1;
		const detail = [error.message.split('\n')[0], error.stderr?.toString(), error.stdout?.toString()]
			.filter(Boolean)
			.join('\n')
			.trim();
		console.error(`  FAIL  ${label}\n${detail.replace(/^/gm, '        ')}`);
	}
};

check('a recipe following the shipped rules still validates', () => {
	// A canary. Shotstack's offline checker catches same-track overlaps, unknown
	// fonts, non-public URLs and any schema change.
	const cli = fileURLToPath(new URL('../node_modules/@shotstack/cli/dist/shotstack.js', import.meta.url));
	const fixture = fileURLToPath(new URL('./canary-recipe.json', import.meta.url));
	execFileSync(process.execPath, [cli, 'validate', '--strict', fixture], { stdio: 'pipe' });
});

check('the vendored skill says where it came from', () => {
	const header = constant('SKILL_HEADER');
	assert.match(header, /shotstack\/shotstack-cli/, 'the header does not name the source repository');
	assert.match(header, /Apache-2\.0/, 'the header does not carry the licence');
	assert.match(header, /n8n workflow, not running a terminal/, 'the n8n context note is missing');
});

check('no link tells the model to open a file it cannot reach', () => {
	// The skill is written for an agent that reads files off disk. Pasted into
	// an n8n field nothing can, so vendor-skill.mjs rewrites those links to
	// addresses. Any left behind are dead instructions.
	const text = constant('SKILL_CORE') + constant('SKILL_TOPICS');
	const relative = text.match(/\]\((?:\.\.\/)?(?:shared|references)\/[a-z0-9-]+\.md\)/gi) ?? [];
	assert.deepEqual(relative, [], `relative links left: ${relative.slice(0, 3).join(' ')}`);
});

check('the command-line manual is left out', () => {
	// SKILL.md and ingest.md tell the reader to set environment variables and
	// run shell commands. An AI inside n8n has no terminal, so those files would
	// be instructions it cannot follow.
	const core = constant('SKILL_CORE');
	assert.doesNotMatch(core, /^===== SKILL\.md/m, 'SKILL.md is the CLI manual and must not be vendored');
	const commands = core.match(/shotstack (render|ingest|preview|init|login)\b/g) ?? [];
	assert.deepEqual(commands, [], `shell instructions reached the core: ${commands.join(' ')}`);
});

check('the core is small enough to be useful', () => {
	const core = constant('SKILL_CORE');
	assert.ok(core.length > 5000, `the core is only ${core.length} chars — did the vendoring fail?`);
	assert.ok(core.length < 60000, `the core is ${core.length} chars, too big for a default payload`);
});

if (failed) {
	console.error(`\n${failed} failing. Re-run: node scripts/vendor-skill.mjs`);
	process.exit(1);
}
console.log(`\n${passed} passing`);
