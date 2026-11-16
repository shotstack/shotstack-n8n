// What Render Template sends when its merge fields come from the template.
//
//   npm test
//
// Shotstack does not fill gaps in a merge list: a text field left out renders
// as a raw placeholder and an image left out fails the render. So a field left
// empty, or one added to the template after the step was set up, has to go out
// with the template's own value.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const node = new (Object.values(require(`../${pkg.n8n.nodes[0]}`))[0])();
const preSend = node.description.properties.find((p) => p.name === 'templateId').routing.send.preSend[0];

const TEMPLATE = {
	response: {
		template: {
			merge: [
				{ find: 'HEADLINE', replace: 'Your year in review' },
				{ find: 'PHOTO', replace: 'https://example.com/default.jpg' },
				{ find: 'LENGTH', replace: 5 },
			],
		},
	},
};

let lookups = 0;
let asked;
let answer = async () => TEMPLATE;
const context = (params, { item = {}, run = 'run-1' } = {}) => ({
	getNodeParameter: (name, fallback) => (name in params ? params[name] : fallback),
	getInputData: () => ({ json: item }),
	getCredentials: async () => ({ environment: 'sandbox' }),
	getExecutionId: () => run,
	getNode: () => ({ name: 'Shotstack' }),
	getItemIndex: () => 0,
	helpers: {
		httpRequestWithAuthentication: async (_type, options) => {
			lookups += 1;
			asked = options.url;
			return await answer();
		},
	},
});

const send = async (params, options) =>
	(await preSend.call(context({ mergeSource: 'template', templateId: 'tpl-1', ...params }, options), { body: {} }))
		.body.merge;

let passed = 0;
const check = async (label, run) => {
	await run();
	passed += 1;
	console.log(`  ok    ${label}`);
};

await check('a typed value wins, and an empty or missing field keeps the template value', async () => {
	const merge = await send(
		{
			'templateFields.mappingMode': 'defineBelow',
			'templateFields.value': { HEADLINE: 'Hello', PHOTO: '  ', GONE: 'renamed in Studio' },
		},
		{ run: 'run-typed' },
	);
	assert.deepEqual(merge, [
		{ find: 'HEADLINE', replace: 'Hello' },
		{ find: 'PHOTO', replace: 'https://example.com/default.jpg' },
		{ find: 'LENGTH', replace: 5 },
	]);
	assert.equal(asked, 'https://api.shotstack.io/edit/stage/templates/tpl-1');
});

await check("each value takes the type of the template's own value", async () => {
	const merge = await send(
		{ 'templateFields.mappingMode': 'defineBelow', 'templateFields.value': { HEADLINE: 42, LENGTH: '9' } },
		{ run: 'run-types' },
	);
	assert.deepEqual(merge, [
		{ find: 'HEADLINE', replace: '42' },
		{ find: 'PHOTO', replace: 'https://example.com/default.jpg' },
		{ find: 'LENGTH', replace: 9 },
	]);
});

await check('Map Automatically fills fields from input columns with the same names', async () => {
	const merge = await send(
		{ 'templateFields.mappingMode': 'autoMapInputData', 'templateFields.value': null },
		{ item: { PHOTO: 'https://example.com/row-1.jpg', LENGTH: '7', unrelated: 'ignored' }, run: 'run-auto' },
	);
	assert.deepEqual(merge, [
		{ find: 'HEADLINE', replace: 'Your year in review' },
		{ find: 'PHOTO', replace: 'https://example.com/row-1.jpg' },
		{ find: 'LENGTH', replace: 7 },
	]);
});

await check('the items of one run share one template lookup', async () => {
	const before = lookups;
	const params = { 'templateFields.mappingMode': 'defineBelow', 'templateFields.value': {} };
	await Promise.all([send(params, { run: 'run-shared' }), send(params, { run: 'run-shared' })]);
	assert.equal(lookups - before, 1);
	await send(params, { run: 'run-next' });
	assert.equal(lookups - before, 2, 'a later run must read the template again');
});

await check('a refused key says so, and Retry On Fail reads the template again', async () => {
	answer = async () => {
		throw Object.assign(new Error('Forbidden - perhaps check your credentials?'), { httpCode: '403' });
	};
	await assert.rejects(
		send({ 'templateFields.value': {} }, { run: 'run-refused' }),
		/Shotstack refused the API key/,
	);
	answer = async () => TEMPLATE;
	// Retry On Fail runs the step again inside the same run.
	assert.equal((await send({ 'templateFields.value': {} }, { run: 'run-refused' })).length, 3);
});

await check("the merge fields list shows the template's fields as text inputs", async () => {
	const { fields } = await node.methods.resourceMapping.getTemplateFields.call(
		context({ templateId: 'tpl-1' }, { run: undefined }),
	);
	assert.deepEqual(
		fields.map((f) => [f.id, f.type]),
		[
			['HEADLINE', 'string'],
			['PHOTO', 'string'],
			['LENGTH', 'string'],
		],
	);
});

await check('new steps start on From Template, and saved version 1 steps keep Fields', () => {
	assert.deepEqual(node.description.version, [1, 2]);
	const defaults = node.description.properties
		.filter((p) => p.name === 'mergeSource')
		.map((p) => [p.displayOptions.show['@version'][0], p.default]);
	assert.deepEqual(defaults, [
		[1, 'fields'],
		[2, 'template'],
	]);
});

console.log(`\n${passed} passing`);
