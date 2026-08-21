// How long the node waits, and what it does when Shotstack throttles it.
//
//   npm test
//
// Both wait loops used to treat a 429 as "not ready yet" and poll again on the
// same gap, which adds load to the account already being throttled.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { pollGapMs, isRateLimited, RATE_LIMIT_HELP } = require('../dist/nodes/Shotstack/polling.js');
const pkg = require('../package.json');
const node = new (Object.values(require(`../${pkg.n8n.nodes[0]}`))[0])();

let passed = 0;
const check = (label, run) => {
	run();
	passed += 1;
	console.log(`  ok    ${label}`);
};

const ok = { statusCode: 200 };
const limited = (headers = {}) => ({ statusCode: 429, headers });

check('a normal poll gap grows, then stops at the ceiling', () => {
	const gaps = [0, 1, 2, 3, 6, 9, 30].map((a) => pollGapMs(a, 5000, 20000, ok));
	assert.deepEqual(gaps, [5000, 5000, 5000, 10000, 20000, 20000, 20000]);
});

check('a 429 waits longer than a normal poll would', () => {
	for (const attempt of [0, 3, 9]) {
		assert.ok(
			pollGapMs(attempt, 5000, 20000, limited()) > pollGapMs(attempt, 5000, 20000, ok),
			`attempt ${attempt} did not back off`,
		);
	}
});

check('Retry-After in seconds is honoured', () => {
	assert.equal(pollGapMs(0, 5000, 20000, limited({ 'retry-after': '45' })), 45000);
});

check('a Retry-After date, which is legal, falls back to the doubled gap', () => {
	const gap = pollGapMs(0, 5000, 20000, limited({ 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' }));
	assert.equal(gap, 10000, 'a date parses to NaN and must not become a zero wait');
});

check('no backoff waits longer than a minute', () => {
	assert.equal(pollGapMs(30, 5000, 20000, limited({ 'retry-after': '9999' })), 60000);
});

check('isRateLimited only fires on 429', () => {
	for (const statusCode of [200, 400, 401, 403, 404, 500]) {
		assert.equal(isRateLimited({ statusCode }), false);
	}
	assert.equal(isRateLimited({ statusCode: 429 }), true);
	assert.equal(isRateLimited(undefined), false);
});

check('the rate limit message names the real limits', () => {
	assert.match(RATE_LIMIT_HELP, /300 Edit/);
	assert.match(RATE_LIMIT_HELP, /Callback URL/);
});

// Measured over 113,759 n8n renders: 99.62% finish inside 10 minutes, and 15
// minutes adds 0.07%. n8n's own EXECUTIONS_TIMEOUT_MAX defaults to one hour,
// so the cap must stay small enough that a handful of stuck items cannot use
// it up. Raising this later is safe. Lowering it silently overrides what users
// already saved, so it can only go one way.
check('the wait cap stays where the render data put it', () => {
	const field = node.description.properties.find((p) => p.name === 'giveUpAfter');
	assert.equal(field.default, 5);
	assert.equal(field.typeOptions.maxValue, 10);
	assert.ok(field.typeOptions.maxValue * 6 <= 60, 'six stuck items must not use up the n8n hour');
});

check('waiting stays off by default, so nothing holds a worker unasked', () => {
	assert.equal(
		node.description.properties.find((p) => p.name === 'waitForCompletion').default,
		false,
	);
});

console.log(`\n${passed} passing`);
