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
	// The type annotation is optional here on purpose. It exists so TypeScript
	// widens the string instead of emitting a 110 KB literal type, and a parser
	// that required its absence broke the moment it was added.
	const match = vendored.match(new RegExp(`export const ${name}(?:: string)? = ("(?:[^"\\\\]|\\\\.)*");`, 's'));
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

check('the shipped skill matches the pin the script names', () => {
	// Offline. Catches a tree where someone ran --latest, saw it fail, and left
	// skill.ts vendored at master while PIN still names the old commit — the
	// node would then ship text nobody pinned and say otherwise in rulesSource.
	const script = read('../scripts/vendor-skill.mjs');
	const pin = script.match(/^const PIN = '([0-9a-f]{40})'/m)?.[1];
	assert.ok(pin, 'could not read PIN from vendor-skill.mjs');
	const shipped = vendored.match(/"ref": "([0-9a-f]{40})"/)?.[1];
	assert.equal(shipped, pin, 'skill.ts was vendored at a different commit than PIN');
});

check('the vendored skill says where it came from', () => {
	const header = constant('SKILL_HEADER');
	assert.match(header, /shotstack\/shotstack-cli/, 'the header does not name the source repository');
	assert.match(header, /Apache-2\.0/, 'the header does not carry the licence');
	assert.match(header, /writing JSON for an n8n workflow/, 'the n8n context note is missing');
});

check('no link tells the model to open a file it cannot reach', () => {
	// The skill is written for an agent that reads files off disk. Pasted into
	// an n8n field nothing can, so vendor-skill.mjs rewrites those links to
	// addresses.
	//
	// Match every markdown link and keep the ones that are not addresses. An
	// earlier version of this check reused the generator's own pattern, which
	// required a shared/ or references/ prefix, so it shared the generator's
	// blind spot and passed green while six sibling links stayed relative.
	const text = constant('SKILL_CORE') + constant('SKILL_TOPICS');
	const relative = [...text.matchAll(/\]\(([^)\s]+\.md)\)/g)]
		.map((m) => m[1])
		.filter((link) => !/^[a-z]+:/i.test(link));
	assert.deepEqual([...new Set(relative)], [], `links that point at nothing: ${relative.slice(0, 4).join(' ')}`);
});

check('the command-line manual is left out', () => {
	// SKILL.md and ingest.md tell the reader to set environment variables and
	// run shell commands. An AI inside n8n has no terminal.
	const core = constant('SKILL_CORE');
	assert.doesNotMatch(core, /^===== SKILL\.md/m, 'SKILL.md is the CLI manual and must not be vendored');
	assert.doesNotMatch(core, /^===== references\/ingest\.md/m, 'ingest.md is the upload manual');
});

check('the header answers every instruction the model cannot follow', () => {
	// Whatever the skill tells the reader to do outside n8n, the header has to
	// name. It opens by saying to download the schema, and it uses the shotstack
	// command throughout — both across core and topics, not just core.
	const text = constant('SKILL_CORE') + constant('SKILL_TOPICS');
	const header = constant('SKILL_HEADER');

	if (/fetch one of these|download the schema/i.test(text)) {
		assert.match(header, /Do not fetch anything/, 'the skill says to fetch a schema and the header does not answer it');
	}
	if (/\bshotstack [a-z]+\b/.test(text)) {
		assert.match(header, /cannot run the shotstack command/, 'the skill uses the CLI and the header does not answer it');
	}
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
