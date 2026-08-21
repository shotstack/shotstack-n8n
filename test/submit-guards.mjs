// What Render Asset refuses to send.
//
//   npm test
//
// An n8n expression left in a fixed-mode field arrives as literal text. Sending
// it produces a Shotstack error about a bad asset URL, so the user blames us
// rather than their own expression. That was 1,381 failed n8n renders in 90
// days. A bare {{ HEADLINE }} is a Shotstack merge placeholder and must pass.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const node = new (Object.values(require(`../${pkg.n8n.nodes[0]}`))[0])();

const preSend = node.description.properties.find(
	(p) => p.name === 'edit' && p.displayOptions?.show?.operation?.includes('postRender'),
).routing.send.preSend[0];

const context = (edit) => ({
	getNodeParameter: (name, fallback) => (name === 'edit' ? edit : fallback),
	getNode: () => ({ name: 'Shotstack' }),
	getItemIndex: () => 0,
});

const send = async (edit) => await preSend.call(context(edit), { headers: {}, body: {} });

let passed = 0;
const check = async (label, run) => {
	await run();
	passed += 1;
	console.log(`  ok    ${label}`);
};

const withSrc = (src) =>
	JSON.stringify({
		timeline: { tracks: [{ clips: [{ asset: { type: 'video', src }, start: 0, length: 4 }] }] },
		output: { format: 'mp4', size: { width: 1080, height: 1920 } },
	});

const rejected = async (edit) => {
	try {
		await send(edit);
		return null;
	} catch (error) {
		return error;
	}
};

// The two shapes that actually reached Shotstack, taken from the render log.
for (const expression of ['{{$json.videoUrl}}', "{{ $('Prepare Videos').item.json.videoUrl }}"]) {
	await check(`refuses ${expression}`, async () => {
		const error = await rejected(withSrc(expression));
		assert.ok(error, 'the edit was sent anyway');
		assert.match(error.message, /n8n expression/);
		assert.match(error.description, /fixed mode/);
	});
}

await check('names the expression it found, so the user can search for it', async () => {
	const error = await rejected(withSrc('{{ $json.clipUrl }}'));
	assert.match(error.description, /\$json\.clipUrl/);
});

await check('a Shotstack merge placeholder still goes through', async () => {
	const result = await send(withSrc('{{ VIDEO }}'));
	assert.equal(result.body.timeline.tracks[0].clips[0].asset.src, '{{ VIDEO }}');
});

await check('an edit with no placeholders at all goes through', async () => {
	const result = await send(withSrc('https://cdn.shotstack.io/x.mp4'));
	assert.ok(result.body.timeline);
});

await check('an empty edit still reports the empty field, not an expression', async () => {
	const error = await rejected('');
	assert.match(error.message, /empty/);
});

console.log(`\n${passed} passing`);
