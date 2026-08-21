// Get Reference must hand back the reference even when Shotstack refuses the key.
//
//   npm test
//
// The whole 28,596 characters live in the package. The /templates call exists
// only because a declarative operation must send a request. So a 401 has to
// report the credential problem, not withhold the answer that prevents the
// caller writing a broken edit.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const node = new (Object.values(require(`../${pkg.n8n.nodes[0]}`))[0])();

const operation = node.description.properties
	.filter((p) => p.name === 'operation')
	.flatMap((p) => p.options ?? [])
	.find((o) => o.value === 'getReference');

const buildReference = operation.routing.output.postReceive[0];

const context = (detail = 'core', includeTemplates = true) => ({
	getNodeParameter: (name, fallback) =>
		name === 'detail' ? detail : name === 'includeTemplates' ? includeTemplates : fallback,
	getNode: () => ({ name: 'Shotstack' }),
	getItemIndex: () => 0,
	helpers: { httpRequest: async () => { throw new Error('not reached'); } },
});

const run = async (statusCode, body, opts = {}) =>
	(await buildReference.call(context(opts.detail, opts.includeTemplates), [], { statusCode, body, headers: {} }))[0]
		.json;

let passed = 0;
const check = async (label, fn) => {
	await fn();
	passed += 1;
	console.log(`  ok    ${label}`);
};

const OK_BODY = { response: { templates: [{ id: 'abc', name: 'Wellness Ad' }] } };

await check('the operation still sends a request at all', () => {
	// A declarative operation must send one, and postReceive hangs off its
	// answer. Deleting the "wasted" /templates call returns nothing at all.
	assert.equal(operation.routing.request.url, '/templates');
	assert.equal(operation.routing.request.method, 'GET');
});

await check('a refused key degrades, but a transient failure still throws', () => {
	const rule = operation.routing.request.ignoreHttpStatusErrors;
	assert.equal(rule.ignore, true);
	// Transient codes must throw so Retry On Fail and Continue On Error can act.
	// An item that "succeeded" is never retried.
	for (const code of [408, 429, 500, 502, 503, 504]) {
		assert.ok(rule.except.includes(code), `${code} must still throw`);
	}
	for (const code of [401, 403]) {
		assert.ok(!rule.except.includes(code), `${code} must degrade, not throw`);
	}
});

await check('a good key returns the reference and the templates', async () => {
	const json = await run(200, OK_BODY);
	assert.ok(json.reference.length > 20000, `reference was ${json.reference.length} characters`);
	assert.equal(json.templateCount, 1);
	assert.equal(json.credentialError, undefined);
});

for (const status of [401, 403]) {
	await check(`a ${status} still returns the full reference`, async () => {
		const json = await run(status, {});
		assert.ok(json.reference.length > 20000, 'the reference was withheld');
		assert.equal(json.referenceChars, json.reference.length);
		assert.match(json.credentialError, /refused the API key/);
		assert.match(json.credentialError, /reference above is complete/);
		// Absent, not zero. An empty array is a claim that the account has no
		// templates, and an agent acts on it by writing an edit from nothing
		// over the template the user already built.
		assert.equal(json.templateCount, undefined, 'a false zero is worse than silence');
		assert.equal(json.templates, undefined);
	});
}

await check('a 200 carrying HTML is not read as an empty account', async () => {
	// A proxy or a login redirect answers 200 with a page. Branching on the
	// status alone reads that as a real, empty template list.
	const json = await run(200, '<html><body>Sign in</body></html>');
	assert.ok(json.reference.length > 20000);
	assert.equal(json.templateCount, undefined, 'HTML was read as zero templates');
	assert.match(json.credentialError, /did not return a template list/);
});

await check('a genuinely empty account still reports zero', async () => {
	const json = await run(200, { response: { templates: [] } });
	assert.equal(json.templateCount, 0, 'a real empty list must still say zero');
	assert.equal(json.credentialError, undefined);
});

await check('a failure with Include Templates off still reports the key', async () => {
	const json = await run(401, {}, { includeTemplates: false });
	assert.match(json.credentialError, /refused the API key/);
	assert.equal(json.templates, undefined, 'templates must stay off when the toggle is off');
});

await check('the default configuration is the one that must not lie', () => {
	// Include Templates defaults to true, so the default is exactly the setting
	// that would emit a false zero. The safe setting existing is not enough.
	const field = node.description.properties.find((p) => p.name === 'includeTemplates');
	assert.equal(field.default, true);
});

console.log(`\n${passed} passing`);
