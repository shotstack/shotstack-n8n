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

// Get Reference is ours, but the request under it is not: it issues the spec's
// getTemplates call, which proves the key and lists the account's templates.
// A declarative node cannot have an operation that sends no request.
const BORROWS = { getReference: 'getTemplates' };

// Download File is the only operation that calls no Shotstack endpoint at all.
// Its target is user data, so there is no route to check. The properties that
// keep it safe are checked instead, below.
const NO_ENDPOINT = new Set(['download']);

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
check('Follows the spec', 'every operation calls the method and path the spec gives it', () => {
	// The checks above compare names. Names being right proved nothing about the
	// request: changing url to '/rendr' left every other check green, so a node
	// that called the wrong endpoint would have shipped 33/33.
	if (!existsSync(OAS)) return { ok: false, actual: 'run npm ci first' };
	const oas = JSON.parse(readFileSync(OAS, 'utf8'));

	// operationId -> "METHOD /path", with parameter names flattened.
	const spec = {};
	for (const [path, item] of Object.entries(oas.paths)) {
		for (const [method, op] of Object.entries(item)) {
			if (!op.operationId) continue;
			spec[op.operationId] = `${method.toUpperCase()} ${path.replace(/\{[^}]+\}/g, '{}')}`;
		}
	}

	const properties = node().description.properties;
	// An n8n route can sit on the operation option or on any property shown for
	// it, so collect both and let the property win, which is how n8n merges them.
	const routeFor = (value) => {
		let method;
		let url;
		for (const p of properties.filter((x) => x.name === 'operation')) {
			const option = (p.options ?? []).find((o) => o.value === value);
			if (!option) continue;
			method = option.routing?.request?.method ?? method;
			url = option.routing?.request?.url ?? url;
		}
		for (const p of properties) {
			if (!p.displayOptions?.show?.operation?.includes(value)) continue;
			method = p.routing?.request?.method ?? method;
			url = p.routing?.request?.url ?? url;
		}
		if (url === undefined) return undefined;
		// '=/render/{{$value}}' -> '/render/{}'
		const path = String(url)
			.replace(/^=/, '')
			.replace(/\{\{[^}]*\}\}/g, '{}')
			.trim();
		return `${method ?? 'GET'} ${path}`;
	};

	const wrong = [];
	let checked = 0;
	for (const p of properties.filter((x) => x.name === 'operation')) {
		for (const option of p.options ?? []) {
			// An operation whose value is not an operationId may still call a real
			// endpoint. Get Reference issues GET /templates, which the spec names
			// getTemplates, so resolve it through the spec rather than declaring a
			// path here: a path written beside the code it checks is not a check.
			const expected = spec[BORROWS[option.value] ?? option.value];
			if (!expected) continue;
			checked += 1;
			const actual = routeFor(option.value);
			if (actual !== expected) wrong.push(`${option.value}: node sends "${actual}", spec says "${expected}"`);
		}
	}

	// Count the skips and assert the total. A bare `continue` lets an exemption
	// widen in the same edit that breaks something; this way adding one changes
	// a number the check compares. It also catches the whole spec failing to
	// load, which previously left every operation skipped and the check green.
	const total = properties
		.filter((x) => x.name === 'operation')
		.reduce((n, p) => n + (p.options ?? []).length, 0);
	if (checked + NO_ENDPOINT.size !== total) {
		wrong.push(`checked ${checked} of ${total} with ${NO_ENDPOINT.size} exempt: something was skipped silently`);
	}
	return {
		ok: wrong.length === 0,
		actual: wrong.length ? wrong.join(' | ') : `${checked} routes checked against the spec, ${NO_ENDPOINT.size} exempt`,
	};
});
check('Follows the spec', 'Download File cannot carry the API key to another host', () => {
	// There is no route to check here: the target is whatever URL the workflow
	// supplies. Two properties keep the key from following it, and neither is
	// obvious enough to survive a tidy-up unasserted.
	const properties = node().description.properties;
	const field = properties.find((p) => p.name === 'fileUrl');
	const missing = [];

	// Without this the node baseURL applies, a relative or protocol relative
	// url resolves against api.shotstack.io, and the credential attaches the key.
	if (field?.routing?.request?.baseURL !== '') missing.push('fileUrl no longer blanks baseURL');

	// The credential must treat a scheme-less // url as absolute, the way axios
	// does, or it reads one as relative and falls back to baseURL.
	const credential = readFileSync('dist/credentials/ShotstackApi.credentials.js', 'utf8');
	if (!/\[a-z\]\[a-z\\d\+\\-\.\]\*:\)\?/.test(credential) && !credential.includes('a-z\\d+\\-.')) {
		missing.push('the credential no longer matches axios on protocol relative urls');
	}
	return { ok: missing.length === 0, actual: missing.length ? missing.join('; ') : 'baseURL blanked, absolute-url rule matches axios' };
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
// Every markdown file has to earn its place. A repository grows documents on its
// own, and a reader who meets four of them cannot tell which one is current.
// Adding one to this list is the decision; the check only stops it drifting.
const DOCS_ALLOWED = new Set([
	'README.md', // the npm and n8n listing page
	'CHANGELOG.md', // what changed between published versions
	'LICENSE.md', // package.json declares MIT, and npm expects the file
]);
// The maintenance guide is internal and lives on dev only. It names the kill
// line and the gaps in our own cover, which do not belong beside a public
// package. Nothing links to it, so its absence on main breaks no reference.
const DEV_ONLY = 'MAINTAINING.md';
const branch = (() => {
	try {
		return sh('git rev-parse --abbrev-ref HEAD');
	} catch {
		return '';
	}
})();

// MAINTAINING.md lists the files that hold a name a saved workflow persists, so
// a reviewer knows which edits reach users. A list like that is worthless the
// day it stops matching, and nothing about adding a field would remind anyone.
check('Docs', 'the frozen-file list matches where the names actually live', () => {
	if (branch === 'main') return { ok: true, actual: 'the guide is not on main' };
	// Only this section. The guide names generated files elsewhere, and those
	// hold no persisted name.
	const section = (readFileSync(DEV_ONLY, 'utf8').split('\n## ').find((s) => s.startsWith('The files that need a second reader')) ?? '');
	const holders = sh('git ls-files "nodes/*.ts" "nodes/**/*.ts" "credentials/*.ts"')
		.split('\n')
		.filter(Boolean)
		.filter((f) => {
			const text = readFileSync(f, 'utf8');
			// A persisted name or a stored option value, as the node description
			// declares them. Helpers and generated data hold neither.
			return /^\t*name: '/m.test(text) || /^\t*value: '/m.test(text);
		});
	if (!section) return { ok: false, actual: 'the frozen-file section is gone from the guide' };
	const missing = holders.filter((f) => !section.includes(f));
	const stale = [...section.matchAll(/`((?:nodes|credentials)\/[\w./-]+\.ts)`/g)]
		.map((m) => m[1])
		.filter((f) => !holders.includes(f));
	const wrong = [...missing.map((f) => `unlisted ${f}`), ...stale.map((f) => `listed but holds no name: ${f}`)];
	return { ok: wrong.length === 0, actual: wrong.length ? wrong.join(', ') : `${holders.length} files, all listed` };
});
check('Docs', 'no markdown file beyond the essential set', () => {
	const found = sh('git ls-files "*.md"').split('\n').filter(Boolean);
	const allowed = new Set(DOCS_ALLOWED);
	if (branch !== 'main') allowed.add(DEV_ONLY);
	const wrong = [
		...found.filter((f) => !allowed.has(f)).map((f) => `extra ${f}`),
		...[...allowed].filter((f) => !found.includes(f)).map((f) => `missing ${f}`),
	];
	return { ok: wrong.length === 0, actual: wrong.length ? wrong.join(', ') : found.join(', ') };
});

check('Docs', 'the maintenance guide never reaches main', () => {
	const tracked = sh('git ls-files').split('\n').includes(DEV_ONLY);
	const onMain = sh(`git ls-tree --name-only -r main -- ${DEV_ONLY}`) !== '';
	if (onMain) return { ok: false, actual: `${DEV_ONLY} is committed on main. Remove it there.` };
	if (branch === 'main' && tracked) return { ok: false, actual: `${DEV_ONLY} is in this main checkout` };
	return { ok: true, actual: branch === 'main' ? 'absent, correct for main' : 'on this branch, absent from main' };
});
// A doc that names a file, an anchor or a command is making a claim. Check the
// claim. This is the whole class of error a reader spots at a glance, which is
// how this review started.
check('Docs', 'every path, anchor and command the docs name really exists', () => {
	const wrong = [];
	const files = sh('git ls-files "*.md"').split('\n').filter(Boolean);
	const tree = sh('git ls-files').split('\n').filter(Boolean);
	const properties = node().description.properties;

	for (const doc of files) {
		const text = readFileSync(doc, 'utf8');
		const dir = doc.includes('/') ? doc.slice(0, doc.lastIndexOf('/')) : '.';
		const anchors = [...text.matchAll(/^#+ (.+)$/gm)].map((m) =>
			m[1].toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'),
		);

		text.split('\n').forEach((line, i) => {
			const at = `${doc}:${i + 1}`;
			for (const m of line.matchAll(/\]\((?!https?:|#|mailto:)([^)#]+)/g)) {
				if (!existsSync(resolve(dir, m[1]))) wrong.push(`${at} dead link ${m[1]}`);
			}
			for (const m of line.matchAll(/\]\((#[^)]+)\)/g)) {
				if (!anchors.includes(m[1].slice(1))) wrong.push(`${at} dead anchor ${m[1]}`);
			}
			for (const m of line.matchAll(/`((?:nodes|credentials|scripts|test|icons)\/[\w./-]+)`/g)) {
				const named = m[1].replace(/\/$/, '');
				if (!existsSync(named) && !tree.some((f) => f.startsWith(`${named}/`))) {
					wrong.push(`${at} no such path ${m[1]}`);
				}
			}
			for (const m of line.matchAll(/npm run ([\w:]+)/g)) {
				if (!pkg.scripts[m[1]]) wrong.push(`${at} npm run ${m[1]} is not a script`);
			}
			for (const m of line.matchAll(/node ((?:scripts|test)\/[\w.-]+)/g)) {
				if (!existsSync(m[1])) wrong.push(`${at} node ${m[1]} does not exist`);
			}
			// A number quoted for a field must be the number the field ships. The
			// README advertised "10 by default, 60 at most" for a week after the
			// values became 5 and 10, and no name-matching check could see it.
			// [^\n] not [^|]: the field name and its numbers sit in different
			// cells of a markdown table, so the match has to cross a pipe.
			for (const m of line.matchAll(/\*\*([A-Z][\w ()]+?)\*\*[^\n]*?(\d+) by default, (\d+) at most/g)) {
				const field = properties.find((p) => p.displayName === m[1].trim());
				if (!field) continue;
				const max = field.typeOptions?.maxValue;
				if (String(field.default) !== m[2] || String(max) !== m[3]) {
					wrong.push(`${at} ${m[1]} ships ${field.default}/${max}, docs say ${m[2]}/${m[3]}`);
				}
			}
		});
	}
	return { ok: wrong.length === 0, actual: wrong.length ? wrong.slice(0, 3).join(' | ') : `${files.length} files, all references resolve` };
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
// A maintainer's name is legitimate; a path off someone's laptop is not.
sweep('no paths off a developer machine', /C:\\Users|\/Users\/[a-z]+\/|\/home\/[a-z]+\//i);
sweep('no personal email addresses', /\b[a-z0-9._%+-]+@shotstack\.io\b(?<!support@shotstack\.io)/i);
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
			// Imported by name anywhere, or re-exported. Same-file use does not
			// count. The tests reach built output through createRequire, so a
			// destructured require counts as a use too: without that this reads a
			// tested export as dead and pushes you to delete it or stop testing it.
			const importedElsewhere =
				new RegExp(`import[^;]*\\b${name}\\b[^;]*from`).test(imports) ||
				new RegExp(`\\{[^}]*\\b${name}\\b[^}]*\\}\\s*=\\s*require\\(`).test(imports);
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
