// The credential stores `sandbox` or `production`. The URL needs `stage` or
// `v1`. Two places do that mapping: apiPathFor for code, and an inline ternary
// for the routing baseURLs, because n8n evaluates those itself and cannot call
// a function. This test fails if the two ever disagree.
//
//   npm test
//
// Why it matters: a credential is a row the user owns. No release of this node
// can change one that already exists, so the stored values are permanent from
// the first publish.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { Tournament } = require('@n8n/tournament');
const { apiPathFor, EDIT_BASE_URL, SERVE_BASE_URL } = require('../dist/nodes/Shotstack/environment.js');
const { ShotstackApi } = await import('../dist/credentials/ShotstackApi.credentials.js');

const tournament = new Tournament();
let passed = 0;
const check = (label, run) => {
	run();
	passed += 1;
	console.log(`  ok    ${label}`);
};

check('the credential stores words, not API version numbers', () => {
	const environment = new ShotstackApi().properties.find((p) => p.name === 'environment');
	const values = environment.options.map((o) => o.value);
	assert.deepEqual(values, ['sandbox', 'production'], 'a value here is permanent after publish');
	assert.equal(environment.default, 'sandbox', 'the default must not be able to spend credits');
});

for (const [name, url] of [
	['EDIT_BASE_URL', EDIT_BASE_URL],
	['SERVE_BASE_URL', SERVE_BASE_URL],
]) {
	for (const environment of ['sandbox', 'production']) {
		check(`${name} agrees with apiPathFor for ${environment}`, () => {
			const resolved = tournament.execute(url, { $credentials: { environment } });
			assert.ok(
				resolved.endsWith(`/${apiPathFor(environment)}`),
				`expression gave "${resolved}", apiPathFor gave "${apiPathFor(environment)}"`,
			);
		});
	}

	check(`${name} falls back to sandbox with no credential`, () => {
		assert.ok(tournament.execute(url, {}).endsWith('/stage'));
	});
}

check('apiPathFor sends anything unrecognised to sandbox', () => {
	for (const value of ['', 'v1', 'stage', 'PRODUCTION', undefined, null, 0]) {
		assert.equal(apiPathFor(value), 'stage', `"${value}" must not reach production`);
	}
});

// The bug this replaced: getAssetByRenderId guessed the environment by looking
// for '/serve/v1' in the URL it had just built. Nothing may read it back out.
const dist = new URL('../dist/nodes/', import.meta.url);
const built = (await readdir(dist, { recursive: true })).filter((f) => f.endsWith('.js'));
for (const name of built) {
	const source = await readFile(new URL(name, dist), 'utf8');
	check(`${name.replace(/\\/g, '/')} does not paste the environment straight into a URL`, () => {
		assert.doesNotMatch(source, /\/edit\/\{\{\s*\$credentials\.environment/);
		assert.doesNotMatch(source, /\/serve\/\{\{\s*\$credentials\.environment/);
		assert.doesNotMatch(source, /includes\(['"]\/serve\/v1['"]\)/);
	});
}

// The README shows the credential to a reader who has not opened the node.
check('the README does not still name the old stored values', () => {
	const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
	assert.doesNotMatch(readme, /`stage`|`v1`/, 'those are URL segments now, not user-facing values');
});

console.log(`\n${passed} passing`);
