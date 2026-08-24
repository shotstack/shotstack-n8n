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
	// A trailer, so anchor it: a line of its own ending in a colon. Naming the
	// rule in a commit body is not breaking it. Case-insensitive, because
	// GitHub's own merge UI writes "Co-authored-by".
	const n = (sh('git log --format=%B').match(/^[ \t]*co-authored-by:/gim) || []).length;
	return { ok: n === 0, actual: String(n) };
});
// release-it runs the build before it bumps the version, and nothing rebuilds
// after. So a release commit carries the previous version in userAgent.ts while
// package.json holds the new one. CI rebuilds, so the published package is
// right and only the repository is wrong, which is why this needs saying.
check('n8n requirements', 'the User-Agent version matches package.json', () => {
	// Read the commit, not the working tree. This script builds first, and the
	// build regenerates userAgent.ts, which would heal the drift before the
	// check could see it.
	const committed = (path) => {
		try {
			return sh(`git show HEAD:${path}`);
		} catch {
			return '';
		}
	};
	const shipped = committed('nodes/Shotstack/userAgent.ts').match(/USER_AGENT = '([^']+)'/)?.[1];
	const version = JSON.parse(committed('package.json') || '{}').version;
	const expected = `shotstack-n8n-node/${version}`;
	return {
		ok: shipped === expected,
		actual: shipped === expected ? shipped : `${shipped} committed, but package.json says ${version}. Run npm run build and amend`,
	};
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
	const strays = values.filter((v) => !ids.has(v));
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
	// Names being right proves nothing about the request. A wrong url passes
	// every other check.
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
			const expected = spec[option.value];
			if (!expected) {
				wrong.push(`${option.value}: the spec has no operation by that name`);
				continue;
			}
			checked += 1;
			const actual = routeFor(option.value);
			if (actual !== expected) wrong.push(`${option.value}: node sends "${actual}", spec says "${expected}"`);
		}
	}

	// Assert the total. Without it a spec that failed to load would skip every
	// operation and leave the check green.
	const total = properties
		.filter((x) => x.name === 'operation')
		.reduce((n, p) => n + (p.options ?? []).length, 0);
	if (checked !== total) wrong.push(`checked ${checked} of ${total}: something was skipped silently`);
	return {
		ok: wrong.length === 0,
		actual: wrong.length ? wrong.join(' | ') : `${checked} of ${total} routes match the spec, none exempt`,
	};
});
check('Follows the spec', 'no operation is outside the spec', () => {
	if (!existsSync(OAS)) return { ok: false, actual: 'run npm ci first' };
	const oas = JSON.parse(readFileSync(OAS, 'utf8'));
	const ids = new Set(
		Object.values(oas.paths).flatMap((path) => Object.values(path).map((op) => op.operationId).filter(Boolean)),
	);
	const values = node()
		.description.properties.filter((p) => p.name === 'operation')
		.flatMap((p) => (p.options ?? []).map((o) => o.value));
	const outside = values.filter((v) => !ids.has(v));
	return {
		ok: outside.length === 0,
		actual: outside.length ? `outside the spec: ${outside.join(', ')}` : `${values.length} operations, every one in the spec`,
	};
});
// Both Render ID fields read the id on the incoming item. An output that names
// something else id sends the wrong value to Shotstack, which answers 400.
check('Follows the spec', 'no output calls two different things id', () => {
	const sets = [];
	const walk = (list) => {
		for (const property of list ?? []) {
			const steps = [
				...(property.routing?.output?.postReceive ?? []),
				...(property.options ?? []).flatMap((o) => o.routing?.output?.postReceive ?? []),
			];
			for (const step of steps) {
				if (step.type === 'setKeyValue') sets.push(Object.keys(step.properties ?? {}));
			}
			for (const option of property.options ?? []) walk(option.values);
		}
	};
	walk(node().description.properties);
	const wrong = sets
		.filter((keys) => keys.includes('id') && keys.includes('renderId'))
		.map((keys) => `one output emits both id and renderId: ${keys.join(', ')}`);
	return { ok: wrong.length === 0, actual: wrong.length ? wrong.join(' | ') : `${sets.length} outputs, none ambiguous` };
});
check('Follows the spec', 'an AI agent gets a real tool description', () => {
	// n8n builds the tool description from `action`, as `${action} in Shotstack`.
	// Two words or fewer is a bare verb and says nothing after that is appended.
	const weak = [];
	for (const p of node().description.properties.filter((x) => x.name === 'operation')) {
		for (const o of p.options ?? []) {
			if (!o.action || o.action.split(' ').length < 3) weak.push(`${o.value}: "${o.action}"`);
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
// Adding a file to this list is the decision. The check only stops the list
// drifting from what the repository holds.
const DOCS_ALLOWED = new Set([
	'README.md', // the npm and n8n listing page
	'CHANGELOG.md', // what changed between published versions
	'LICENSE.md', // package.json declares MIT, and npm expects the file
]);
// The maintenance guide is internal and lives on dev only. Nothing links to it,
// so its absence on main breaks no reference.
const DEV_ONLY = 'MAINTAINING.md';
// On a pull request GitHub checks out a detached merge commit, so asking git
// for the branch answers "HEAD" and a release PR reads as a dev branch. Take
// the branch from the event, and fall back to git for a local run.
const branch =
	process.env.GITHUB_BASE_REF ||
	process.env.GITHUB_REF_NAME ||
	(() => {
		try {
			return sh('git rev-parse --abbrev-ref HEAD');
		} catch {
			return '';
		}
	})();
// A checkout writes remote-tracking refs, so main is origin/main in CI and a
// bare main only in a local clone. Neither present means main was not fetched.
const MAIN_REF = ['refs/heads/main', 'refs/remotes/origin/main'].find(
	(ref) => quiet(`git rev-parse --verify --quiet ${ref}`) === 0,
);


// Frozen names no walk of the built node reaches. Each names the file whose row
// must carry it, and how to prove the file still writes it. Keep that proof
// structural: a bare word test also passes on a comment.
const UNWALKABLE = [
	{ file: 'package.json', names: () => [pkg.name, ...pkg.n8n.nodes, ...pkg.n8n.credentials] },
	{
		// n8n matches the codex to the node on this exact string, which joins
		// the package name to the node type. A third place either can break.
		file: 'nodes/Shotstack/Shotstack.node.json',
		names: () => [JSON.parse(readFileSync('nodes/Shotstack/Shotstack.node.json', 'utf8')).node],
	},
];

/**
 * Every name a rename can reach a user through, read from the built node.
 *
 * Mostly what n8n stores in a saved workflow. Also the list method key, which
 * two files must agree on, so both ends are collected here.
 */
const frozenNames = () => {
	const names = new Set();
	const fromPostReceive = (step) => {
		if (step.type !== 'setKeyValue') return;
		for (const key of Object.keys(step.properties ?? {})) names.add(key);
	};
	const walk = (list) => {
		for (const property of list ?? []) {
			if (property.name) names.add(property.name);
			// A picker stores its mode name beside the value, and names the method
			// that fills its list.
			for (const mode of property.modes ?? []) {
				names.add(mode.name);
				if (mode.typeOptions?.searchListMethod) names.add(mode.typeOptions.searchListMethod);
			}
			for (const step of property.routing?.output?.postReceive ?? []) fromPostReceive(step);
			for (const option of property.options ?? []) {
				if (option.value !== undefined) names.add(String(option.value));
				// A collection stores its option name as the key holding the rows.
				if (option.values) {
					names.add(option.name);
					walk(option.values);
				}
				for (const step of option.routing?.output?.postReceive ?? []) fromPostReceive(step);
			}
		}
	};
	const shotstack = node();
	walk(shotstack.description.properties);
	names.add(shotstack.description.name);
	for (const method of Object.keys(shotstack.methods?.listSearch ?? {})) names.add(method);
	// The product token only. Shotstack's render log keeps it, and nothing joins
	// an old token to a new one. The version after the slash is meant to move.
	names.add(String(req(resolve(process.cwd(), 'dist/nodes/Shotstack/userAgent.js')).USER_AGENT).split('/')[0]);
	for (const relative of pkg.n8n.credentials) {
		const credential = new (Object.values(req(resolve(process.cwd(), relative)))[0])();
		names.add(credential.name);
		walk(credential.properties);
	}
	return names;
};

// A reader wires the next step from this list. The README named eight of the
// nine keys, and the missing one was invisible without running the node.
check('Docs', 'the README names the keys Simplify really emits', () => {
	const properties = node().description.properties;
	const displayName = new Map();
	for (const property of properties) {
		if (property.name !== 'operation') continue;
		for (const option of property.options ?? []) displayName.set(option.value, option.name);
	}
	const readme = readFileSync('README.md', 'utf8');
	const wrong = [];
	let checked = 0;
	for (const property of properties) {
		if (property.name !== 'simple') continue;
		const heading = displayName.get(property.displayOptions?.show?.operation?.[0]);
		const emitted = (property.routing?.output?.postReceive ?? [])
			.filter((step) => step.type === 'setKeyValue')
			.flatMap((step) => Object.keys(step.properties ?? {}));
		const section = readme.split('\n### ').find((s) => s.split('\n')[0].trim().endsWith(heading));
		const row = section?.split('\n').find((line) => line.startsWith('| **Simplify**'));
		if (!row) {
			wrong.push(`no README Simplify row for ${heading}`);
			continue;
		}
		checked += 1;
		const documented = [...row.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
		const missing = emitted.filter((key) => !documented.includes(key));
		const extra = documented.filter((key) => !emitted.includes(key));
		if (missing.length) wrong.push(`${heading}: README omits ${missing.join(', ')}`);
		if (extra.length) wrong.push(`${heading}: README names ${extra.join(', ')}, which it does not emit`);
	}
	// Counted, so a third Simplify field cannot slip through unchecked.
	const expected = properties.filter((p) => p.name === 'simple').length;
	if (checked !== expected) wrong.push(`checked ${checked} of ${expected} Simplify fields`);
	return { ok: wrong.length === 0, actual: wrong.length ? wrong.join(' | ') : `${checked} Simplify rows match the node` };
});


// The guide says everything it does not name is free to change, so a name
// missing from it is not a gap. It is a wrong answer.
check('Docs', 'the guide names every name a saved workflow keeps', () => {
	if (branch === 'main') return { ok: true, actual: 'the guide is not on main' };
	const section =
		readFileSync(DEV_ONLY, 'utf8')
			.split('\n## ')
			.find((s) => s.startsWith('The files that need a second reader')) ?? '';
	if (!section) return { ok: false, actual: 'the frozen-name section is gone from the guide' };

	const wrong = [];
	const unreachable = [];
	for (const entry of UNWALKABLE) {
		const text = readFileSync(entry.file, 'utf8');
		for (const name of entry.names()) {
			unreachable.push(name);
			if (entry.proof && !entry.proof(text, name)) wrong.push(`${entry.file} no longer writes ${name}`);
		}
	}


	// This does not prove a name sits in the row for its own file. The section is
	// read as one block, so a misfiled name passes. Omission is the dangerous
	// case and that is caught.
	const all = new Set([...frozenNames(), ...unreachable]);
	const tracked = new Set(sh('git ls-files').split('\n'));
	const listed = new Set([...section.matchAll(/`([^`]+)`/g)].map((m) => m[1]));
	for (const name of all) if (!listed.has(name)) wrong.push(`unlisted ${name}`);
	// No exemption by shape. A backticked token is either a name the code holds
	// or a file the repo tracks.
	for (const token of listed) {
		if (!all.has(token) && !tracked.has(token)) {
			wrong.push(`listed but neither a live name nor a tracked file: ${token}`);
		}
	}

	return {
		ok: wrong.length === 0,
		actual: wrong.length
			? wrong.sort().join(', ')
			: `${all.size} names, ${unreachable.length} beyond the reach of a walk, all in the guide`,
	};
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
	// Say so rather than pass. This check cannot tell "the guide is off main"
	// from "main was never fetched", and the second must not read as the first.
	if (!MAIN_REF) return { ok: false, actual: 'main is not in this clone, so this proves nothing' };
	const onMain = sh(`git ls-tree --name-only -r ${MAIN_REF} -- ${DEV_ONLY}`) !== '';
	if (onMain) return { ok: false, actual: `${DEV_ONLY} is committed on main. Remove it there.` };
	if (branch === 'main' && tracked) return { ok: false, actual: `${DEV_ONLY} is in this main checkout` };
	return { ok: true, actual: branch === 'main' ? 'absent, correct for main' : 'on this branch, absent from main' };
});
// A doc that names a file, an anchor or a command is making a claim. Check it.
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
			// A number quoted for a field must be the number the field ships.
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
			// count. A destructured require counts too, because the tests reach
			// built output that way and would otherwise read as dead code.
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
