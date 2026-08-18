// Regenerates nodes/Shotstack/reference/recipeReference.ts from Shotstack's
// OpenAPI file, so the reference the node hands an AI can never drift from the
// real API.
//
//   node scripts/build-reference.mjs [path-to-openapi.json]
//
// Shotstack publishes no stable public address for the spec, so a copy lives
// beside this script and is used by default. Replace that copy when the API
// changes. The house rules next to it are ours, not the API's.
import { readFileSync, writeFileSync } from 'node:fs';

const specPath = process.argv[2] ?? new URL('./shotstack-openapi.json', import.meta.url);

const S = JSON.parse(readFileSync(specPath, 'utf8')).components.schemas;
const deref = (v) => (v && v.$ref ? S[v.$ref.split('/').pop()] : v);
const typeOf = (v) => {
	const d = deref(v) || {};
	if (d.enum) return d.enum.join('|');
	if (d.type === 'array') return `${deref(d.items)?.type || 'object'}[]`;
	return d.type || (v?.$ref ? v.$ref.split('/').pop() : '?');
};
const line = (name, schema, keep) => {
	const req = new Set(schema.required || []);
	const props = Object.entries(schema.properties || {})
		.filter(([k]) => !keep || keep.includes(k))
		.map(([k, v]) => `${k}${req.has(k) ? '*' : ''}:${typeOf(v)}`)
		.join(' ');
	return `  ${name}  ${props}`;
};

const out = [
	'SHOTSTACK RECIPE REFERENCE  (* = required)',
	'',
	'A recipe is: { "timeline": { "background", "fonts", "soundtrack", "tracks" }, "output": {...} }',
	'tracks is an array of { "clips": [...] }. TRACK 0 IS THE TOP LAYER. Background media goes in the LAST track.',
	'',
	'CLIP',
	line('', S.Clip, ['asset', 'start', 'length', 'fit', 'scale', 'position', 'offset', 'transition', 'effect', 'filter', 'opacity']),
	'',
	'ASSET TYPES',
];
for (const key of Object.keys(S).filter((k) => /Asset$/.test(k) && k !== 'Asset')) {
	const t = S[key].properties?.type?.enum?.[0];
	if (t) out.push(line(`"${t}"`.padEnd(17), S[key]));
}
out.push('', 'OUTPUT');
out.push(line('', S.Output, ['format', 'size', 'resolution', 'aspectRatio', 'fps', 'quality']));
out.push('  size = { "width": int, "height": int }');
out.push('', 'TRANSITION  { "in": <name>, "out": <name> }');
out.push(`  names: ${(S.Transition.properties.in.enum || []).join(' ')}`);
out.push('', readFileSync(new URL('./house-rules.txt', import.meta.url), 'utf8').trim());

const body = out.join('\n');
const ts = `// GENERATED FILE. Do not edit by hand.
// Rebuild with: node scripts/build-reference.mjs <shotstack-openapi.json>
// The API half comes from Shotstack's OpenAPI file. The house rules come from
// scripts/house-rules.txt and are ours.

export const RECIPE_REFERENCE = ${JSON.stringify(body)};
`;
writeFileSync(new URL('../nodes/Shotstack/reference/recipeReference.ts', import.meta.url), ts);
console.log('wrote recipeReference.ts —', body.length, 'chars');
