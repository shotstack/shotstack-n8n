// Writes nodes/Shotstack/reference/recipeReference.ts from Shotstack's OpenAPI
// file, so the reference the node hands an AI cannot drift from the real API.
//
//   node scripts/build-reference.mjs [path-to-openapi.json]
//
// Shotstack publishes no stable address for the spec, so a copy sits beside
// this script and is the default. Replace that copy when the API changes. The
// house rules beside it are ours, not the API's.
import { readFileSync, writeFileSync } from 'node:fs';

const specPath = process.argv[2] ?? new URL('./shotstack-openapi.json', import.meta.url);

const S = JSON.parse(readFileSync(specPath, 'utf8')).components.schemas;

// A $ref can name a schema the file does not define. Keep the raw node then,
// because it often carries the properties inline anyway.
const deref = (v) => {
	if (!v?.$ref) return v;
	return S[v.$ref.split('/').pop()] ?? v;
};

// Depth 0 prints a nested object's own keys. Deeper than that the reference
// becomes longer than the model can use.
const typeOf = (v, depth = 0) => {
	const d = deref(v) || {};
	if (d.enum) return d.enum.join('|');
	if (d.oneOf) return [...new Set(d.oneOf.map((o) => typeOf(o, depth + 1)))].join('|');
	if (d.type === 'array') return `${typeOf(d.items, depth + 1)}[]`;
	if (d.properties) {
		if (depth > 0) return 'object';
		const inner = Object.entries(d.properties)
			.map(([k, p]) => `${k}:${typeOf(p, depth + 1)}`)
			.join(' ');
		return `{ ${inner} }`;
	}
	return d.type ?? 'object';
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
// Skip the deprecated types. Listing html and title taught the model to write
// assets the API no longer wants.
for (const key of Object.keys(S).filter((k) => /Asset$/.test(k) && k !== 'Asset')) {
	const t = S[key].properties?.type?.enum?.[0];
	if (t && !S[key].deprecated) out.push(line(`"${t}"`.padEnd(17), S[key]));
}
out.push('', 'OUTPUT');
out.push(line('', S.Output, ['format', 'size', 'resolution', 'aspectRatio', 'fps', 'quality']));
out.push('  size = { "width": int, "height": int }');
out.push('', 'TRANSITION  { "in": <name>, "out": <name> }');
out.push(`  names: ${(S.Transition.properties.in.enum || []).join(' ')}`);
// Normalise the line endings. Windows checks this file out with CRLF, so the
// carriage returns would reach the model and fail the CI drift check on Linux.
const CARRIAGE_RETURNS = /\r\n?/g;
const houseRules = readFileSync(new URL('./house-rules.txt', import.meta.url), 'utf8')
	.replace(CARRIAGE_RETURNS, '\n')
	.trim();
out.push('', houseRules);

const body = out.join('\n');
const ts = `// GENERATED FILE. Do not edit by hand.
// Rebuild with: node scripts/build-reference.mjs <shotstack-openapi.json>
// The API half comes from Shotstack's OpenAPI file. The house rules come from
// scripts/house-rules.txt and are ours.

export const RECIPE_REFERENCE = ${JSON.stringify(body)};
`;
writeFileSync(new URL('../nodes/Shotstack/reference/recipeReference.ts', import.meta.url), ts);
console.log('wrote recipeReference.ts —', body.length, 'chars');
