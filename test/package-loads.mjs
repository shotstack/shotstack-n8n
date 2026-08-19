// n8n reads the `n8n` block in package.json, requires each path from dist, and
// instantiates the class. If a path, an icon or a description field is wrong,
// n8n drops the node at startup with no error the user can act on.
//
//   npm test
//
// This does what n8n's loader does, so a packaging mistake fails here instead
// of on someone's server.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const manifest = require('../package.json');

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

// n8n resolves an icon as "file:<path>" relative to the compiled file.
const iconExists = (from, value) =>
	existsSync(resolve(dirname(from), String(value).replace(/^file:/, '')));

const load = (relative) => {
	const path = resolve(root, relative);
	assert.ok(existsSync(path), `${relative} is listed in package.json but not in dist`);
	const exported = require(path);
	const Class = Object.values(exported).find((v) => typeof v === 'function');
	assert.ok(Class, `${relative} exports no class`);
	return { path, instance: new Class() };
};

check('package.json declares its nodes and credentials', () => {
	assert.equal(manifest.n8n.n8nNodesApiVersion, 1);
	assert.ok(manifest.n8n.nodes.length > 0, 'no nodes declared');
	assert.ok(manifest.n8n.credentials.length > 0, 'no credentials declared');
	assert.ok(
		manifest.keywords.includes('n8n-community-node-package'),
		'n8n will not find this package without the n8n-community-node-package keyword',
	);
	assert.ok(/^(@[^/]+\/)?n8n-nodes-/.test(manifest.name), `${manifest.name} is not a valid n8n node package name`);
});

for (const relative of manifest.n8n.credentials) {
	check(`${relative} loads`, () => {
		const { path, instance } = load(relative);
		assert.ok(instance.name, 'no name');
		assert.ok(instance.displayName, 'no displayName');
		assert.ok(instance.properties?.length, 'no properties');
		for (const [theme, value] of Object.entries(instance.icon ?? {})) {
			assert.ok(iconExists(path, value), `${theme} icon missing: ${value}`);
		}
	});
}

for (const relative of manifest.n8n.nodes) {
	check(`${relative} loads`, () => {
		const { path, instance } = load(relative);
		const d = instance.description;
		for (const field of ['displayName', 'name', 'version', 'inputs', 'outputs', 'properties']) {
			assert.ok(d[field] !== undefined, `description.${field} is missing`);
		}
		for (const [theme, value] of Object.entries(d.icon ?? {})) {
			assert.ok(iconExists(path, value), `${theme} icon missing: ${value}`);
		}

		// Every credential the node asks for must be one this package ships,
		// or n8n shows a credential picker with nothing in it.
		const shipped = manifest.n8n.credentials.map((c) => new (Object.values(require(resolve(root, c)))[0])().name);
		for (const { name } of d.credentials ?? []) {
			assert.ok(shipped.includes(name), `${name} is required but not shipped`);
		}

		// n8n's UX rules: every operation needs an action, and every property
		// needs a description it can show.
		for (const property of d.properties) {
			if (property.name !== 'operation') continue;
			for (const option of property.options ?? []) {
				assert.ok(option.action, `operation "${option.value}" has no action`);
				assert.ok(option.description, `operation "${option.value}" has no description`);
			}
		}
	});
}

check('the codex file names the node the way n8n registers it', () => {
	// n8n registers a node as "<package name>.<node name>". The codex file
	// carries the categories and documentation links, and n8n matches it on
	// that exact string, so a package rename silently unlinks it.
	for (const relative of manifest.n8n.nodes) {
		const { instance } = load(relative);
		const codex = require(resolve(root, relative.replace(/\.js$/, '.json')));
		assert.equal(codex.node, `${manifest.name}.${instance.description.name}`);
	}
});

check('every operation is reachable from a resource', () => {
	const { instance } = load(manifest.n8n.nodes[0]);
	const properties = instance.description.properties;
	const resources = properties.find((p) => p.name === 'resource')?.options?.map((o) => o.value) ?? [];
	assert.ok(resources.length > 0, 'no resource property');

	const operations = properties.filter((p) => p.name === 'operation');
	for (const property of operations) {
		const shownFor = property.displayOptions?.show?.resource ?? [];
		assert.ok(
			shownFor.some((r) => resources.includes(r)),
			`an operation list is shown for ${JSON.stringify(shownFor)}, which is not a resource`,
		);
	}
	const covered = operations.flatMap((p) => p.displayOptions?.show?.resource ?? []);
	const orphans = resources.filter((r) => !covered.includes(r));
	assert.deepEqual(orphans, [], `resource with no operations: ${orphans.join(' ')}`);
});

if (failed) {
	console.error(`\n${failed} failing. n8n would not load this package correctly.`);
	process.exit(1);
}
console.log(`\n${passed} passing`);
