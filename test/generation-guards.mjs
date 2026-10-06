// What Generate Asset sends, and when it stops waiting.
//
//   npm test
//
// Generation spends credits, so the body is built in code rather than in a
// routing expression: an unset Model or Options has to be absent, not empty,
// and an empty prompt has to fail here rather than after a billed round trip.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const node = new (Object.values(require(`../${pkg.n8n.nodes[0]}`))[0])();
const properties = node.description.properties;

const shownFor = (name, operation) =>
	properties.find(
		(p) => p.name === name && p.displayOptions?.show?.operation?.includes(operation),
	);

const preSend = shownFor('prompt', 'postGenerate').routing.send.preSend[0];
const paginate = shownFor('waitForAsset', 'postGenerate').routing.operations.pagination;

const node_ = () => ({ name: 'Shotstack' });

// A real job id: the wait loop puts it in a path, so it checks the shape.
const JOB = '8a1f2c3d-4e5b-5a6c-9d7e-1f2a3b4c5d6e';

const send = async (params) =>
	await preSend.call(
		{
			getNodeParameter: (name, fallback) => (name in params ? params[name] : fallback),
			getNode: node_,
			getItemIndex: () => 0,
		},
		{ headers: { 'x-shotstack-origin': 'n8n' }, body: {} },
	);

const rejected = async (params) => {
	try {
		await send(params);
		return null;
	} catch (error) {
		return error;
	}
};

// Polling a real endpoint is not what these cases are about. Any request here
// means the loop failed to stop on an answer it already had.
const neverPolls = {
	httpRequestWithAuthentication: async () => {
		throw new Error('polled when it should not have');
	},
};

// Answers each poll with the next status code, then with a finished job, so a
// loop that ignores an answer ends here instead of running out the clock.
const answering = (...codes) => {
	let calls = 0;
	return {
		calls: () => calls,
		httpRequestWithAuthentication: async () => {
			const statusCode = codes[calls++];
			if (statusCode === 'drop') throw new Error('socket hang up');
			return statusCode
				? { statusCode, body: {}, headers: {} }
				: { statusCode: 200, body: { id: JOB, status: 'done' }, headers: {} };
		},
	};
};

// n8n's sleep is a setTimeout, so this makes every poll gap instant. The clock
// has to move with it: the loop's deadline is wall clock, so instant sleeps
// alone would spin the loop for the full five minutes instead of ending it.
let clock = Date.now();
globalThis.setTimeout = (resolve, ms = 0) => {
	clock += ms;
	resolve();
};
Date.now = () => clock;

const wait = async (job, waitForAsset = true, helpers = neverPolls) =>
	await paginate.call(
		{
			makeRoutingRequest: async () => [{ json: job }],
			getNodeParameter: (name, fallback) =>
				name === 'waitForAsset' ? waitForAsset : name === 'giveUpAfter' ? 5 : fallback,
			getNode: node_,
			getItemIndex: () => 0,
			helpers,
		},
		{ options: { baseURL: 'https://api.shotstack.io/edit/stage', url: '/generate' } },
	);

let passed = 0;
const check = async (label, run) => {
	await run();
	passed += 1;
	console.log(`  ok    ${label}`);
};

await check('an unset model, options and length are left out of the body', async () => {
	const { body } = await send({ prompt: 'a lighthouse at sunset' });
	assert.deepEqual(body, { asset: { type: 'image', prompt: 'a lighthouse at sunset' } });
});

await check('a set model, options and length are sent', async () => {
	const { body } = await send({
		assetType: 'video',
		prompt: 'a lighthouse at sunset',
		model: 'seedance-2.0-text-to-video',
		modelOptions: '{"aspectRatio":"16:9"}',
		length: 5,
	});
	assert.deepEqual(body, {
		asset: {
			type: 'video',
			prompt: 'a lighthouse at sunset',
			model: 'seedance-2.0-text-to-video',
			options: { aspectRatio: '16:9' },
		},
		length: 5,
	});
});

await check('an empty prompt never reaches the API', async () => {
	const error = await rejected({ prompt: '   ' });
	assert.ok(error, 'the generation was sent anyway');
	assert.match(error.message, /empty/);
});

await check('options that are not JSON are named as such', async () => {
	const error = await rejected({ prompt: 'a cat', modelOptions: '{aspectRatio: 16:9}' });
	assert.match(error.message, /not valid JSON/);
});

await check('options that parse to an array are refused', async () => {
	const error = await rejected({ prompt: 'a cat', modelOptions: '["16:9"]' });
	assert.match(error.message, /not a JSON object/);
});

await check('a cached generation comes back done, with no poll at all', async () => {
	const items = await wait({ id: JOB, status: 'done', url: 'https://cdn/x.png' });
	assert.equal(items[0].json.url, 'https://cdn/x.png');
});

await check('a generation that failed on submit stops the step', async () => {
	await assert.rejects(
		async () => await wait({ id: JOB, status: 'failed', error: 'the model refused it' }),
		/generation failed/,
	);
});

await check('waiting turned off hands back the job without polling', async () => {
	const items = await wait({ id: JOB, status: 'queued' }, false);
	assert.equal(items[0].json.status, 'queued');
});

await check('a refused key stops the wait on the first poll', async () => {
	const helpers = answering(401);
	await assert.rejects(
		async () => await wait({ id: JOB, status: 'queued' }, true, helpers),
		/refused the API key/,
	);
	assert.equal(helpers.calls(), 1);
});

await check('a 404 stops the wait, but not on the first poll or after a dropped one', async () => {
	const helpers = answering(404, 'drop', 404);
	await assert.rejects(
		async () => await wait({ id: JOB, status: 'queued' }, true, helpers),
		/no generation with that ID/,
	);
	assert.equal(helpers.calls(), 3);
});

await check('a 202 keeps the status moving, so the timeout names the real one', async () => {
	// The API answers 202 while the job is processing. A loop that only reads
	// 200 reports whatever the submit said, however long it really ran.
	const helpers = {
		httpRequestWithAuthentication: async () => ({
			statusCode: 202,
			body: { id: JOB, status: 'processing' },
			headers: {},
		}),
	};
	await assert.rejects(
		async () => await wait({ id: JOB, status: 'queued' }, true, helpers),
		/still processing/,
	);
});

await check('a 202 saying done is not taken as final', async () => {
	// The job is still being written at that point, so its url may be missing.
	let calls = 0;
	const helpers = {
		httpRequestWithAuthentication: async () => {
			calls += 1;
			return calls === 1
				? { statusCode: 202, body: { id: JOB, status: 'done' }, headers: {} }
				: {
						statusCode: 200,
						body: { id: JOB, status: 'done', url: 'https://cdn/x.png' },
						headers: {},
					};
		},
	};
	const items = await wait({ id: JOB, status: 'queued' }, true, helpers);
	assert.equal(items[0].json.url, 'https://cdn/x.png');
	assert.equal(calls, 2);
});

await check('an id the API sends back that is not an id never reaches a URL', async () => {
	await assert.rejects(
		async () => await wait({ id: '../../render/abc', status: 'queued' }),
		/generation ID we cannot use/,
	);
});

await check('a prompt that is not text never bills a generation', async () => {
	const error = await rejected({ prompt: { brief: 'a cat' } });
	assert.ok(error, 'the generation was sent anyway');
	assert.match(error.message, /not text/);
});

await check('a length that is not a number is named, not silently dropped', async () => {
	const error = await rejected({ prompt: 'a cat', length: '5 seconds' });
	assert.ok(error, 'the generation was sent anyway');
	assert.match(error.message, /not a number/);
});

await check('the wait cannot be set past the point where six items eat the n8n hour', () => {
	const field = properties.find(
		(x) => x.name === 'giveUpAfter' && x.displayOptions?.show?.waitForAsset,
	);
	assert.ok(field, 'Generate Asset has no Give Up After');
	assert.ok(field.typeOptions.maxValue * 6 <= 60, 'six waiting items can exceed the n8n hour');
});

console.log(`\n${passed} passing`);
