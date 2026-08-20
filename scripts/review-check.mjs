// Every mechanical check for the Shotstack n8n node, in one pass.
//   node scripts/review-check.mjs
// Anything it cannot prove, it says so rather than passing.
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const req = createRequire(`${process.cwd()}/`);
const rows = [];

const check = (group, what, run) => {
	let actual;
	let ok = false;
	try {
		({ ok, actual } = run());
	} catch (error) {
		actual = `threw: ${String(error.message).split('\n')[0].slice(0, 90)}`;
	}
	rows.push({ group, what, actual, ok });
};

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const quiet = (cmd) => {
	try {
		execSync(cmd, { stdio: 'ignore' });
		return 0;
	} catch (error) {
		return error.status ?? 1;
	}
};
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const node = () => new (Object.values(req(resolve(process.cwd(), pkg.n8n.nodes[0])))[0])();

// Does it build and pass
check('Builds and passes', 'npm run build', () => {
	const code = quiet('npm run build');
	return { ok: code === 0, actual: `exit ${code}` };
});
check('Builds and passes', 'npm run lint', () => {
	const code = quiet('npm run lint');
	return { ok: code === 0, actual: `exit ${code}` };
});
check('Builds and passes', 'npm test', () => {
	let out = '';
	let code = 0;
	try {
		out = sh('npm test');
	} catch (error) {
		out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
		code = 1;
	}
	const passing = (out.match(/^ {2}ok {4}/gm) || []).length;
	const failing = (out.match(/^ {2}FAIL/gm) || []).length;
	return { ok: code === 0 && failing === 0 && passing > 0, actual: `${passing} ok, ${failing} FAIL` };
});

// Can n8n publish and verify it
check('n8n requirements', 'zero runtime dependencies', () => {
	const deps = Object.keys(pkg.dependencies ?? {});
	return { ok: deps.length === 0, actual: deps.length ? deps.join(', ') : 'none' };
});
check('n8n requirements', 'package name form', () => ({
	ok: /^(@[^/]+\/)?n8n-nodes-/.test(pkg.name),
	actual: pkg.name,
}));
check('n8n requirements', 'community-node keyword', () => {
	const ok = (pkg.keywords ?? []).includes('n8n-community-node-package');
	return { ok, actual: ok ? 'present' : 'MISSING' };
});
check('n8n requirements', 'n8n block declares nodes + credentials', () => {
	const n = pkg.n8n?.nodes?.length ?? 0;
	const c = pkg.n8n?.credentials?.length ?? 0;
	return { ok: n > 0 && c > 0, actual: `${n} node(s), ${c} credential(s)` };
});
check('n8n requirements', 'every declared dist path exists', () => {
	const paths = [...(pkg.n8n?.nodes ?? []), ...(pkg.n8n?.credentials ?? [])];
	const missing = paths.filter((p) => !existsSync(p));
	return {
		ok: missing.length === 0,
		actual: missing.length ? `missing ${missing.join(', ')}` : `${paths.length} present`,
	};
});
check('n8n requirements', 'provenance configured', () => ({
	ok: pkg.publishConfig?.provenance === true,
	actual: String(pkg.publishConfig?.provenance),
}));
check('n8n requirements', 'licence', () => ({ ok: pkg.license === 'MIT', actual: pkg.license }));

// Is the history clean
check('History', 'no Co-Authored-By trailers', () => {
	const n = (sh('git log --format=%B').match(/Co-Authored-By/g) || []).length;
	return { ok: n === 0, actual: String(n) };
});
check('History', 'working tree clean', () => {
	// Ignore this script, which is meant to be dropped in and deleted again.
	const dirty = sh('git status --porcelain')
		.split('\n')
		.filter((line) => line.trim() && !line.includes('review-check.mjs'));
	return { ok: dirty.length === 0, actual: dirty.length === 0 ? 'clean' : `${dirty.length} changed` };
});

// Does it follow the OpenAPI spec, which is what Derk asked for
const OAS = 'node_modules/@shotstack/schemas/dist/api.bundled.json';
const OURS = new Set(['download', 'getReference']); // deliberately not API operations

check('Follows the spec', 'every operation value is a real operationId', () => {
	if (!existsSync(OAS)) return { ok: false, actual: 'run npm ci first' };
	const oas = JSON.parse(readFileSync(OAS, 'utf8'));
	const ids = new Set(
		Object.values(oas.paths).flatMap((path) =>
			Object.values(path)
				.map((op) => op.operationId)
				.filter(Boolean),
		),
	);
	const values = node()
		.description.properties.filter((p) => p.name === 'operation')
		.flatMap((p) => (p.options ?? []).map((o) => o.value));
	const strays = values.filter((v) => !ids.has(v) && !OURS.has(v));
	return {
		ok: strays.length === 0,
		actual: strays.length ? `not in spec: ${strays.join(', ')}` : `${values.length} operations, all accounted for`,
	};
});
check('Follows the spec', 'display names match the spec summary', () => {
	if (!existsSync(OAS)) return { ok: false, actual: 'run npm ci first' };
	const oas = JSON.parse(readFileSync(OAS, 'utf8'));
	const summaryOf = {};
	for (const path of Object.values(oas.paths)) {
		for (const op of Object.values(path)) if (op.operationId) summaryOf[op.operationId] = op.summary;
	}
	const wrong = [];
	for (const p of node().description.properties.filter((x) => x.name === 'operation')) {
		for (const o of p.options ?? []) {
			const summary = summaryOf[o.value];
			if (summary && summary !== o.name) wrong.push(`${o.value}: "${o.name}" vs spec "${summary}"`);
		}
	}
	return { ok: wrong.length === 0, actual: wrong.length ? wrong.join(' | ') : 'all match' };
});
check('Follows the spec', 'the two non-spec operations say so', () => {
	const missing = [];
	for (const p of node().description.properties.filter((x) => x.name === 'operation')) {
		for (const o of p.options ?? []) {
			if (!OURS.has(o.value)) continue;
			if (!/not an api operation|no shotstack endpoint|reads the url|calls no/i.test(o.description ?? '')) {
				missing.push(o.value);
			}
		}
	}
	return {
		ok: missing.length === 0,
		actual: missing.length ? `${missing.join(', ')} do not explain themselves` : 'both explained in their description',
	};
});
check('Follows the spec', 'an AI agent gets a real tool description', () => {
	// n8n builds the tool description from `action`, not `description`.
	const weak = [];
	for (const p of node().description.properties.filter((x) => x.name === 'operation')) {
		for (const o of p.options ?? []) {
			if (!o.action || o.action.split(' ').length < 4) weak.push(`${o.value}: "${o.action}"`);
		}
	}
	return { ok: weak.length === 0, actual: weak.length ? `too thin: ${weak.join(', ')}` : 'all actions carry intent' };
});

// Do the docs tell the truth
check('Docs', 'no Shotstack API behaviour restated in the README', () => {
	const readme = readFileSync('README.md', 'utf8');
	const smells = [
		[/\bqueued\b[^.]*\brendering\b[^.]*\bdone\b/s, 'render status enum copied'],
		[/24[- ]hours?/i, 'a hard-coded expiry'],
		[/~?\d{2},\d{3}\s*(characters|chars)/i, 'a character count'],
		[/inputSrc|"voice"/, 'a property the current assets do not have'],
	];
	const hits = smells.filter(([re]) => re.test(readme)).map(([, why]) => why);
	return { ok: hits.length === 0, actual: hits.length ? hits.join('; ') : 'none found' };
});
check('Docs', 'root markdown files', () => {
	const root = sh('git ls-files "*.md"')
		.split('\n')
		.filter((f) => f && !f.includes('/'));
	return { ok: root.length <= 4, actual: `${root.length} at root: ${root.join(', ')}` };
});
check('Docs', 'every README link resolves', () => {
	const links = [...readFileSync('README.md', 'utf8').matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
	const anchors = [...readFileSync('README.md', 'utf8').matchAll(/\]\((#[^)]+)\)/g)].map((m) => m[1]);
	const headings = [...readFileSync('README.md', 'utf8').matchAll(/^#+ (.+)$/gm)].map((m) =>
		m[1]
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-'),
	);
	const broken = anchors.filter((a) => !headings.includes(a.slice(1)));
	return {
		ok: broken.length === 0,
		actual: broken.length
			? `dead anchors: ${broken.join(', ')}`
			: `${anchors.length} anchors resolve, ${links.length} external links not fetched here`,
	};
});

// Sanity. The things a reader spots in ten seconds and a compiler never will.
const tracked = sh('git ls-files').split('\n').filter(Boolean);
const readable = tracked.filter(
	(f) =>
		!f.includes('package-lock.json') &&
		!f.endsWith('.svg') &&
		!f.startsWith('nodes/Shotstack/reference/') && // generated, and it quotes other people's prose
		!f.endsWith('review-check.mjs'), // this file holds the patterns, so it matches them all
);
const textOf = (f) => {
	try {
		return readFileSync(f, 'utf8');
	} catch {
		return '';
	}
};

const sweep = (label, pattern, files = readable) => {
	check('Sanity', label, () => {
		const hits = [];
		for (const f of files) {
			textOf(f)
				.split('\n')
				.forEach((line, i) => {
					if (pattern.test(line)) hits.push(`${f}:${i + 1}`);
				});
		}
		return { ok: hits.length === 0, actual: hits.length ? hits.slice(0, 3).join(', ') : 'none' };
	});
};

sweep('no TODO, FIXME or XXX left behind', /\b(TODO|FIXME|XXX)\b/);
sweep('no scaffold text from the n8n starter', /to be completed|delete if not|your-node|n8n-nodes-starter|lorem ipsum/i);
sweep('no local paths or usernames', /C:\\Users|\/Users\/[a-z]+\/|jesus/i);
sweep('no secrets', /sk_live|glsa_[A-Za-z0-9]|["'][A-Za-z0-9]{32,}["']\s*;?\s*\/\/\s*key/i);
sweep('no trailing whitespace', /[ \t]+$/);

check('Sanity', 'no console left in shipped node code', () => {
	const shipped = tracked.filter((f) => /^(nodes|credentials)\/.*\.ts$/.test(f));
	const hits = shipped.filter((f) => /\bconsole\./.test(textOf(f)));
	return { ok: hits.length === 0, actual: hits.length ? hits.join(', ') : 'none' };
});
check('Sanity', 'no run of blank lines', () => {
	const hits = readable.filter((f) => /\n{4,}/.test(textOf(f)));
	return { ok: hits.length === 0, actual: hits.length ? hits.join(', ') : 'none' };
});
check('Sanity', 'no empty section in any markdown file', () => {
	const empty = [];
	for (const f of tracked.filter((x) => x.endsWith('.md'))) {
		const lines = textOf(f).split('\n');
		lines.forEach((line, i) => {
			if (!/^#{2,6} /.test(line)) return; // a document title may be followed by a heading
			const rest = lines.slice(i + 1).filter((x) => x.trim());
			if (!rest.length || /^#{1,6} /.test(rest[0])) empty.push(`${f}:${i + 1}`);
		});
	}
	return { ok: empty.length === 0, actual: empty.length ? empty.join(', ') : 'every heading has content' };
});
check('Sanity', 'no export that nothing imports', () => {
	const code = tracked.filter((f) => /\.(ts|mjs)$/.test(f) && !f.startsWith('nodes/Shotstack/reference/'));
	const imports = code.map(textOf).join('\n');
	const stray = [];
	for (const f of code) {
		const body = textOf(f);
		for (const m of body.matchAll(/export const (\w+)/g)) {
			const name = m[1];
			// Imported by name anywhere, or re-exported. Same-file use does not count.
			const importedElsewhere = new RegExp(`import[^;]*\\b${name}\\b[^;]*from`).test(imports);
			if (!importedElsewhere) stray.push(`${name} in ${f}`);
		}
	}
	return { ok: stray.length === 0, actual: stray.length ? stray.join(', ') : 'every export is imported' };
});
check('Sanity', 'package.json metadata is filled in', () => {
	const missing = ['description', 'author', 'license', 'homepage', 'repository', 'bugs'].filter(
		(k) => !pkg[k] || (typeof pkg[k] === 'object' && Object.keys(pkg[k]).length === 0),
	);
	return { ok: missing.length === 0, actual: missing.length ? `missing ${missing.join(', ')}` : 'all present' };
});
check('Sanity', 'CHANGELOG names a real version and date', () => {
	const head = textOf('CHANGELOG.md').split('\n').find((l) => /^## /.test(l)) ?? '';
	const ok = /\d+\.\d+\.\d+/.test(head) && /\d{4}-\d{2}-\d{2}/.test(head) && !/unreleased/i.test(head);
	return { ok, actual: head.replace(/^##\s*/, '') || 'no version heading' };
});
check('Sanity', 'both icons exist and are referenced', () => {
	const themes = node().description.icon ?? {};
	const files = Object.values(themes).map((v) => String(v).replace(/^file:/, ''));
	const missing = files.filter((f) => !existsSync(resolve('nodes/Shotstack', f)));
	return {
		ok: Object.keys(themes).length === 2 && missing.length === 0,
		actual: missing.length ? `missing ${missing.join(', ')}` : `${Object.keys(themes).join(' + ')}`,
	};
});
check('Sanity', 'every field and operation has a description', () => {
	const blank = [];
	const walk = (list, where) => {
		for (const p of list ?? []) {
			if (p.displayName && !p.description && p.type !== 'options') blank.push(`${where}.${p.name}`);
			for (const o of p.options ?? []) {
				if (p.name === 'operation' && !o.description) blank.push(`operation ${o.value}`);
				walk(o.values, where);
			}
		}
	};
	walk(node().description.properties, 'node');
	return { ok: blank.length === 0, actual: blank.length ? blank.join(', ') : 'all described' };
});

let lastGroup = '';
let failed = 0;
for (const row of rows) {
	if (row.group !== lastGroup) {
		console.log(`\n${row.group}`);
		lastGroup = row.group;
	}
	if (!row.ok) failed += 1;
	console.log(`  ${row.ok ? 'PASS' : 'FAIL'}  ${row.what.padEnd(46)} ${row.actual}`);
}
console.log(
	`\n${rows.length - failed}/${rows.length} passed.${failed ? ' Every FAIL above is a real finding.' : ' Everything mechanical is green.'}`,
);
console.log('\nNot covered here, and the part that matters most: one live render.');
process.exit(failed ? 1 : 0);
