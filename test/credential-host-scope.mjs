// The credential must send the API key to api.shotstack.io and nowhere else.
// Download Video fetches whatever address the previous step produced, so a
// blanket header would hand the user's key to a stranger.
//
//   npm test
//
// Runs against dist, which is what npm publishes.
import assert from 'node:assert/strict';
import { ShotstackApi } from '../dist/credentials/ShotstackApi.credentials.js';

const credential = new ShotstackApi();
const credentials = { apiKey: 'SECRET-KEY-VALUE', environment: 'stage' };

const cases = [
	['Edit API', { baseURL: 'https://api.shotstack.io/edit/stage', url: '/render' }, true],
	['Serve API', { baseURL: 'https://api.shotstack.io/serve/stage', url: '/assets/render/x' }, true],
	['Ingest API', { baseURL: 'https://api.shotstack.io/ingest/stage', url: '/sources' }, true],
	// Download Video sets baseURL to an empty string, so the host is in url.
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
for (const [label, options, shouldSend] of cases) {
	const result = await credential.authenticate(credentials, { ...options, headers: {} });
	const sent = Boolean(result.headers && result.headers['x-api-key']);
	try {
		assert.equal(sent, shouldSend);
		console.log(`  ok    ${label}`);
	} catch {
		failed += 1;
		console.error(`  FAIL  ${label}: key sent ${sent}, expected ${shouldSend}`);
	}
}

if (failed) {
	console.error(`\n${failed} failing`);
	process.exit(1);
}
console.log(`\n${cases.length} passing`);
