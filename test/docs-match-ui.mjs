// Checks that every control the documentation names exists in the node.
//
//   npm test
//
// Renaming an operation used to leave the README, the CHANGELOG and the text
// the node hands a customer's AI all pointing at a control that is not there.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHeader } from '../scripts/vendor-skill.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const manifest = require('../package.json');
const read = (name) => readFileSync(resolve(root, name), 'utf8');

let failed = 0;
let passed = 0;
const check = (label, run) => {
	try {
		run();
		passed += 1;
		console.log(`  ok    ${label}`);
	} catch (error) {
		failed += 1;
		console.error(`  FAIL  ${label}\n        ${error.message.split('\n')[0]}`);
	}
};

const node = new (Object.values(require(resolve(root, manifest.n8n.nodes[0])))[0])();
const properties = node.description.properties;

// Every operation, and the resource it belongs to, as the two strings a reader
// sees in the n8n UI.
const resources = new Map(
	(properties.find((p) => p.name === 'resource')?.options ?? []).map((o) => [o.value, o.name]),
);
const pairs = [];
for (const property of properties.filter((p) => p.name === 'operation')) {
	for (const value of property.displayOptions?.show?.resource ?? []) {
		for (const option of property.options ?? []) {
			pairs.push({ resource: resources.get(value), operation: option.name });
		}
	}
}

check('the documented operations are the ones the node has', () => {
	assert.ok(pairs.length > 0, 'no operations found on the node');

	// Only arrows whose left side is a real resource. "Settings → Community
	// Nodes" is an n8n menu path, not a claim about this node.
	const named = new Map();
	for (const { resource, operation } of pairs) {
		if (!named.has(resource)) named.set(resource, []);
		named.get(resource).push(operation);
	}

	let found = 0;
	const wrong = [];
	for (const file of ['README.md', 'CHANGELOG.md']) {
		const text = read(file);
		for (const [resource, operations] of named) {
			// The lookbehind stops "Get Hosted Asset → next step" reading as the
			// Asset resource. Escape the name: a future resource such as
			// "Ingest (Beta)" would otherwise become a capture group, and every
			// correctly documented line would read as wrong.
			const safe = resource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			for (const match of text.matchAll(new RegExp(`(?<![A-Za-z] )${safe} → \\*{0,2}(.+)`, 'g'))) {
				found += 1;
				// The operation name runs to the end of the phrase, so match by
				// prefix, then require a non-word character after it. Otherwise
				// "Render Assets" and "Render Asset (old)" both pass as "Render Asset".
				const rest = match[1];
				const known = operations.some((operation) => {
					if (!rest.startsWith(operation)) return false;
					const after = rest.slice(operation.length);
					return after === '' || /^[^\w]/.test(after);
				});
				if (!known) {
					wrong.push(`${file}: "${resource} → ${rest.split(/[|*.,]/)[0].trim()}"`);
				}
			}
		}
	}
	assert.ok(found > 0, 'no "Resource → Operation" pairs found in the docs');
	assert.deepEqual(wrong, [], `documented but not in the node: ${wrong.join('; ')}`);
});

check('every operation the node has is documented', () => {
	const readme = read('README.md');
	const missing = pairs
		.filter((p) => !readme.includes(`${p.resource} → ${p.operation}`))
		.map((p) => `${p.resource} → ${p.operation}`);
	assert.deepEqual(missing, [], `in the node but not in README.md: ${missing.join('; ')}`);
});

check('the text handed to an AI names the operations the node has', () => {
	// skill.ts is generated. Rebuilding the header needs no network, so compare
	// it here: a rename without a regenerate fails now, not on a customer's model.
	const source = read('nodes/Shotstack/reference/skill.ts');
	// Keep the annotation optional and assert the match. A parser that forbids
	// the annotation breaks on sight, and a bare [1] throws a TypeError that
	// sends the reader to a command which cannot fix it. recipe-rules.mjs agrees.
	const sourceMatch = source.match(/export const SKILL_SOURCE(?:: \w+)? = ([\s\S]*?);\r?\n/);
	const headerMatch = source.match(/export const SKILL_HEADER(?:: string)? = (".*?");\r?\n/s);
	assert.ok(sourceMatch, 'cannot read SKILL_SOURCE from skill.ts — has the generator changed?');
	assert.ok(headerMatch, 'cannot read SKILL_HEADER from skill.ts — has the generator changed?');
	const ref = JSON.parse(sourceMatch[1]).ref;
	const shipped = JSON.parse(headerMatch[1]);
	assert.equal(
		shipped,
		buildHeader(ref),
		'skill.ts is stale. Run: npm run vendor:skill, then commit the result',
	);
});

check('no document names a field the node does not have', () => {
	// Field labels appear in the README tables as **Bold**. Only check the ones
	// that look like a control, so ordinary emphasis does not fail the build.
	const labels = new Set();
	const walk = (list) => {
		for (const property of list ?? []) {
			if (property.displayName) labels.add(property.displayName);
			for (const option of property.options ?? []) {
				// An option's own name is documentable too: a README row reading
				// "| **Sandbox** |" describes a real control, not a typo.
				if (option.name) labels.add(option.name);
				walk(option.values);
			}
		}
	};
	walk(properties);
	// The credential's fields appear in the README the same way.
	for (const relative of manifest.n8n.credentials) {
		const credential = new (Object.values(require(resolve(root, relative)))[0])();
		walk(credential.properties);
	}
	for (const { operation } of pairs) labels.add(operation);
	for (const name of resources.values()) labels.add(name);

	// A bold phrase inside an operation table row is a field name by convention.
	// Rows holding an arrow are resource-and-operation pairs, already checked above.
	const rows = read('README.md').matchAll(/^\| \*\*([^*|]+)\*\* \|/gm);
	const unknown = [...rows]
		.map((m) => m[1].trim())
		.filter((label) => !label.includes(' → ') && !labels.has(label));
	assert.deepEqual(unknown, [], `README names fields the node does not have: ${unknown.join(', ')}`);
});

if (failed) {
	console.error(`\n${failed} failing. The documentation and the node disagree.`);
	process.exit(1);
}
console.log(`\n${passed} passing`);
