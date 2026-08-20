// Writes nodes/Shotstack/reference/recipeReference.ts from Shotstack's OpenAPI
// file, so the reference the node hands an AI cannot drift from the real API.
//
//   node scripts/build-reference.mjs [path-to-openapi.json]
//
// Shotstack publishes no stable address for the spec, so a copy sits beside
// this script and is the default. Replace that copy when the API changes.
//
// This covers what is allowed. How to write a good edit comes from Shotstack's
// agent skill instead — see scripts/vendor-skill.mjs.
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
	// Do not name soundtrack here. It is deprecated, and this sentence is the
	// first structural thing a model reads, so it outweighs the rules below.
	'A recipe is: { "timeline": { "background", "fonts", "tracks" }, "output": {...} }',
	'tracks is an array of { "clips": [...] }. TRACK 0 IS THE TOP LAYER. Background media goes in the LAST track.',
	'',
	// width and height belong here. They are clip properties, and the rules
	// below tell the model to size text with them, so leaving them out of the
	// grammar contradicts the rules.
	'CLIP',
	line('', S.Clip, ['asset', 'start', 'length', 'width', 'height', 'fit', 'scale', 'position', 'offset', 'transition', 'effect', 'filter', 'opacity']),
	'',
	'ASSET TYPES',
];
// Skip the deprecated types. The spec's own flag is set on html and title
// only, but Shotstack also deprecates text, caption and shape — that list
// lives in the agent skill, so read it from there rather than repeat it.
const skill = readFileSync(
	new URL('../node_modules/@shotstack/cli/skills/shotstack/shared/agent-core.md', import.meta.url),
	'utf8',
);
const from = skill.indexOf('### Deprecated');
const to = skill.indexOf('They still parse', from);
if (from === -1 || to <= from) {
	throw new Error('Could not read the deprecation list from @shotstack/cli. Check the skill layout.');
}
const deprecated = new Set((skill.slice(from, to).match(/`([a-z][a-z0-9-]*)`/g) ?? []).map((t) => t.slice(1, -1)));

for (const key of Object.keys(S).filter((k) => /Asset$/.test(k) && k !== 'Asset')) {
	const t = S[key].properties?.type?.enum?.[0];
	if (t && !S[key].deprecated && !deprecated.has(t)) out.push(line(`"${t}"`.padEnd(17), S[key]));
}
out.push('', 'OUTPUT');
out.push(line('', S.Output, ['format', 'size', 'resolution', 'aspectRatio', 'fps', 'quality']));
out.push('  size = { "width": int, "height": int }');
out.push('', 'TRANSITION  { "in": <name>, "out": <name> }');
out.push(`  names: ${(S.Transition.properties.in.enum || []).join(' ')}`);
// The craft half used to be a hand-written file appended here. It is now
// Shotstack's own agent skill, vendored by scripts/vendor-skill.mjs and joined
// at runtime, so nobody maintains a second copy of Shotstack's advice.
const body = out.join('\n');
const ts = `// GENERATED FILE. Do not edit by hand.
// Rebuild with: node scripts/build-reference.mjs <shotstack-openapi.json>
// The API half comes from Shotstack's OpenAPI file. The house rules come from
// scripts/house-rules.txt and are ours.

export const RECIPE_REFERENCE = ${JSON.stringify(body)};
`;
writeFileSync(new URL('../nodes/Shotstack/reference/recipeReference.ts', import.meta.url), ts);
console.log('wrote recipeReference.ts —', body.length, 'chars');
