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

const wait = async (job, waitForAsset = true) =>
	await paginate.call(
		{
			makeRoutingRequest: async () => [{ json: job }],
			getNodeParameter: (name, fallback) => (name === 'waitForAsset' ? waitForAsset : fallback),
			getNode: node_,
			getItemIndex: () => 0,
			helpers: neverPolls,
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

await check('an idempotency key rides along without losing the telemetry headers', async () => {
	const { headers } = await send({ prompt: 'a cat', idempotencyKey: 'take-2' });
	assert.equal(headers['Idempotency-Key'], 'take-2');
	assert.equal(headers['x-shotstack-origin'], 'n8n');
});

await check('a cached generation comes back done, with no poll at all', async () => {
	const items = await wait({ id: 'abc', status: 'done', url: 'https://cdn/x.png' });
	assert.equal(items[0].json.url, 'https://cdn/x.png');
});

await check('a generation that failed on submit stops the step', async () => {
	await assert.rejects(
		async () => await wait({ id: 'abc', status: 'failed', error: 'the model refused it' }),
		/generation failed/,
	);
});

await check('waiting turned off hands back the job without polling', async () => {
	const items = await wait({ id: 'abc', status: 'queued' }, false);
	assert.equal(items[0].json.status, 'queued');
});

console.log(`\n${passed} passing`);
