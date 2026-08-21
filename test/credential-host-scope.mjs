// The credential must send the API key to api.shotstack.io and nowhere else.
// Download File fetches whatever address the previous step produced, so a
// blanket header would hand the user's key to a stranger.
//
//   npm test
//
// Runs against dist, which is what npm publishes.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { ShotstackApi } from '../dist/credentials/ShotstackApi.credentials.js';

const credential = new ShotstackApi();
// authenticate() reads the host, never this. test/environment-mapping.mjs
// covers what the environment value does.
const credentials = { apiKey: 'SECRET-KEY-VALUE', environment: 'sandbox' };

const cases = [
	['Edit API', { baseURL: 'https://api.shotstack.io/edit/stage', url: '/render' }, true],
	['Serve API', { baseURL: 'https://api.shotstack.io/serve/stage', url: '/assets/render/x' }, true],
	['Ingest API', { baseURL: 'https://api.shotstack.io/ingest/stage', url: '/sources' }, true],
	// Download File sets baseURL to an empty string, so the host is in url.
	['the public CDN', { baseURL: '', url: 'https://cdn.shotstack.io/au/stage/o/r.mp4' }, false],
	['another subdomain', { baseURL: '', url: 'https://docs.shotstack.io/x' }, false],
	['a third party', { baseURL: '', url: 'https://evil.example.com/collect.mp4' }, false],
	['a lookalike host', { baseURL: '', url: 'https://api.shotstack.io.evil.com/x' }, false],
	['plain http', { baseURL: '', url: 'http://api.shotstack.io/edit/stage/render' }, false],
	// axios ignores baseURL when the url is absolute. The check must agree.
	[
		'absolute url beating baseURL',
		{ baseURL: 'https://api.shotstack.io/edit/stage', url: 'https://evil.example.com/x.mp4' },
		false,
	],
];

let failed = 0;
let passed = 0;
for (const [label, options, shouldSend] of cases) {
	const result = await credential.authenticate(credentials, { ...options, headers: {} });
	const sent = Boolean(result.headers && result.headers['x-api-key']);
	try {
		assert.equal(sent, shouldSend);
		passed += 1;
		console.log(`  ok    ${label}`);
	} catch {
		failed += 1;
		console.error(`  FAIL  ${label}: key sent ${sent}, expected ${shouldSend}`);
	}
}

// Every request must name this node, including the hand-rolled ones in the wait
// loops. n8n replaces a missing User-Agent with a bare "n8n", which is what a
// plain HTTP Request node sends, so a render made here becomes uncountable.
// Find the callers rather than list them. A hand-written list exempts every
// call site added later, which is how listSearch/getTemplates.ts came to make
// an authenticated request with no User-Agent at all.
const dist = new URL('../dist/nodes/', import.meta.url);
const files = (await readdir(dist, { recursive: true })).filter((f) => f.endsWith('.js'));
let callers = 0;

for (const name of files) {
	const source = await readFile(new URL(name, dist), 'utf8');
	// requestDefaults covers the declarative paths; the rest build their own.
	// Match any helpers.httpRequest, with or without .call — requiring .call hid
	// the reference operation's own fetch, which shipped with no User-Agent.
	const makesRequests = /helpers\.httpRequest|httpRequest(WithAuthentication)?\.call|requestDefaults/.test(
		source,
	);
	if (!makesRequests) continue;
	callers += 1;

	try {
		assert.match(source, /USER_AGENT|user-agent/i);
		passed += 1;
		console.log(`  ok    ${name.replace(/\\/g, '/')} sends a User-Agent`);
	} catch {
		failed += 1;
		console.error(`  FAIL  ${name.replace(/\\/g, '/')} makes requests without a User-Agent`);
	}
}
assert.ok(callers >= 3, `only found ${callers} request-making files — has the scan broken?`);

if (failed) {
	console.error(`\n${failed} failing`);
	process.exit(1);
}
console.log(`\n${passed} passing`);
