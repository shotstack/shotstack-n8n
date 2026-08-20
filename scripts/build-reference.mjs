// Writes nodes/Shotstack/reference/recipeReference.ts: every asset type the API
// accepts, with its nested shape and allowed values.
//
//   node scripts/build-reference.mjs
//
// The schema comes from @shotstack/schemas, Shotstack's own published package,
// so bumping that dependency updates what the node tells an AI is allowed.
//
// This covers what is allowed. How to write a good edit comes from Shotstack's
// agent skill instead — see scripts/vendor-skill.mjs.
import { readFileSync, writeFileSync } from 'node:fs';

// The `json` entry point, not the bundled OpenAPI file beside it. That file is
// real but the package does not export it, so reaching for it breaks whenever
// the layout changes.
const { edit } = await import('@shotstack/schemas/json');
const S = edit.$defs;

// A $ref can name a schema the file does not define. Keep the raw node then,
// because it often carries the properties inline anyway.
const deref = (v) => {
	if (!v?.$ref) return v;
	return S[v.$ref.split('/').pop()] ?? v;
};

// A few enums are enormous. Inlining the transition list on the clip line
// printed all 62 names twice, before the TRANSITION section printed them again.
const LONG_ENUM = 400;

// Depth 0 prints a nested object's own keys. Deeper than that the reference
// becomes longer than a model can use.

const typeOf = (v, depth = 0) => {
	const d = deref(v) || {};
	if (d.enum) {
		const joined = d.enum.join('|');
		return joined.length > LONG_ENUM ? `<one of ${d.enum.length}, listed below>` : joined;
	}
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
// Skip the deprecated types. The schema flags most of them, and the agent skill
// names two more (caption, shape), so take the union rather than repeat either.
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
// Rebuild with: node scripts/build-reference.mjs
// Generated from the @shotstack/schemas package.

export const RECIPE_REFERENCE = ${JSON.stringify(body)};
`;
writeFileSync(new URL('../nodes/Shotstack/reference/recipeReference.ts', import.meta.url), ts);
console.log('wrote recipeReference.ts —', body.length, 'chars');
