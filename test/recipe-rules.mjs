// The node hands an AI a generated list of allowed values and Shotstack's own
// agent skill. It writes neither, so these check the vendoring, not the advice.
//
//   npm test
//
// Offline. Whether the pin still matches upstream is a network question, and
// skill-freshness.yml asks it weekly.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const vendored = read('../nodes/Shotstack/reference/skill.ts');

const constant = (name) => {
	// Keep the annotation optional. It is what stops TypeScript emitting a
	// 110 KB literal type, and a parser that forbids it breaks on sight.
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
		// execFileSync puts the child's output on .stderr, not in .message.
		const detail = [error.message.split('\n')[0], error.stderr?.toString(), error.stdout?.toString()]
			.filter(Boolean)
			.join('\n')
			.trim();
		console.error(`  FAIL  ${label}\n${detail.replace(/^/gm, '        ')}`);
	}
};

check('a recipe following the shipped rules still validates', () => {
	// Shotstack's own checker. It catches same-track overlaps, unknown fonts,
	// non-public URLs and any schema change.
	const cli = fileURLToPath(new URL('../node_modules/@shotstack/cli/dist/shotstack.js', import.meta.url));
	const fixture = fileURLToPath(new URL('./canary-recipe.json', import.meta.url));
	execFileSync(process.execPath, [cli, 'validate', '--strict', fixture], { stdio: 'pipe' });
});

check('the shipped skill matches the pin the script names', () => {
	// Otherwise the node ships text nobody pinned, while rulesSource names a
	// different commit.
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
	// Match every markdown link and keep whatever is not an address. Do not
	// reuse the generator's pattern here: an earlier version did, inherited its
	// blind spot, and passed while six links still pointed at nothing.
	const text = constant('SKILL_CORE') + constant('SKILL_TOPICS');
	const relative = [...text.matchAll(/\]\(([^)\s]+\.md)\)/g)]
		.map((m) => m[1])
		.filter((link) => !/^[a-z]+:/i.test(link));
	assert.deepEqual([...new Set(relative)], [], `links that point at nothing: ${relative.slice(0, 4).join(' ')}`);
});

check('the command-line manual is left out', () => {
	// Those files tell the reader to run shell commands. An AI in n8n cannot.
	const core = constant('SKILL_CORE');
	assert.doesNotMatch(core, /^===== SKILL\.md/m, 'SKILL.md is the CLI manual and must not be vendored');
	assert.doesNotMatch(core, /^===== references\/ingest\.md/m, 'ingest.md is the upload manual');
});

check('the header answers every instruction the model cannot follow', () => {
	// Search core and topics both. The skill asks the reader to download a
	// schema and to run the CLI, and the header has to answer each.
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
