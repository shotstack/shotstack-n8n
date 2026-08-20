// Copies Shotstack's official agent skill into this repo, so the node hands an
// AI the rules Shotstack maintains rather than a set we wrote and had to keep
// correct ourselves.
//
//   node scripts/vendor-skill.mjs           check the pin, rewrite the file
//   node scripts/vendor-skill.mjs --latest  move the pin to master and rewrite
//
// Pinned to a commit, not to a branch. The skill is the text that decides what
// a customer's AI writes, so it has to change when this node releases, not
// whenever someone merges upstream. Otherwise the same node version produces
// different videos on different days and a bug report cannot be reproduced.
//
// Upstream is Apache-2.0. The licence and the source commit ship with the text.
import { writeFileSync } from 'node:fs';

const REPO = 'shotstack/shotstack-cli';
const PIN = '671d476a6d6e071fb48dfb073fc3038f2fdd70de'; // v0.8.1, 2026-08-17

// The skill is written for an agent sitting at a terminal, so part of it is the
// command-line tool's manual. Those files are left out: they tell a reader to
// set environment variables and run shell commands, and the AI reading this is
// inside an n8n workflow with no terminal.
//
// The split is measured, not chosen. Counting invocations of the shotstack
// command per file separates the manual from the craft:
//   SKILL.md 13, references/ingest.md 15, references/onboarding.md 2  -> manual
//   everything below 0 or 1, except agent-core's 3, which all read
//   "validate before you render" and are advice worth keeping.
const CORE = ['shared/agent-core.md'];
const TOPICS = [
	'references/timeline.md',
	'references/positioning.md',
	'references/fonts.md',
	'references/motion.md',
	'references/caption.md',
	'references/html5.md',
	'references/html5-snippets.md',
	'references/svg.md',
	'references/asset-library.md',
	'references/troubleshooting.md',
];
const EXCLUDED = 'SKILL.md, references/ingest.md, references/onboarding.md (command-line manual)';

const wantLatest = process.argv.includes('--latest');

const resolveRef = async () => {
	if (!wantLatest) return PIN;
	const response = await fetch(`https://api.github.com/repos/${REPO}/commits/master`);
	if (!response.ok) throw new Error(`Could not read master: HTTP ${response.status}`);
	return (await response.json()).sha;
};

const rawUrl = (ref, path) => `https://raw.githubusercontent.com/${REPO}/${ref}/skills/shotstack/${path}`;
const blobUrl = (ref, path) => `https://github.com/${REPO}/blob/${ref}/skills/shotstack/${path}`;

/** Resolves a link written inside `from` against the skill's own folder. */
const resolveLink = (from, link) => {
	const parts = from.split('/').slice(0, -1).concat(link.split('/'));
	const out = [];
	for (const part of parts) {
		if (part === '.' || part === '') continue;
		if (part === '..') out.pop();
		else out.push(part);
	}
	return out.join('/');
};

/**
 * Turns a file written for a file-reading agent into text that stands alone.
 *
 * The skill tells its reader to open `references/motion.md`. Pasted into an n8n
 * field nothing can, so a model is left following a dead instruction.
 */
const flatten = (markdown, ref, from) =>
	markdown
		// Line endings first. The frontmatter pattern below anchors on \n, so a
		// file served with CRLF would keep its frontmatter and hand a model a
		// block of skill-runner configuration.
		.replace(/\r\n?/g, '\n')
		// Drop the YAML frontmatter. It configures a skill runner, and says
		// nothing a model needs to write a recipe.
		.replace(/^---\n[\s\S]*?\n---\n/, '')
		// Every markdown link, however it is written. An earlier version required
		// a shared/ or references/ prefix, so sibling links like ](html5.md) —
		// six of them — stayed relative and pointed at nothing.
		.replace(/\]\(([^)\s]+\.md)\)/gi, (whole, link) =>
			/^[a-z]+:/i.test(link) ? whole : `](${blobUrl(ref, resolveLink(from, link))})`,
		)
		.trim();

const fetchFile = async (ref, path) => {
	const response = await fetch(rawUrl(ref, path));
	if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}. Has the skill moved?`);
	return flatten(await response.text(), ref, path);
};

const join = async (ref, paths) => {
	const parts = [];
	for (const path of paths) {
		parts.push(`===== ${path} =====\n\n${await fetchFile(ref, path)}`);
	}
	return parts.join('\n\n');
};

const ref = await resolveRef();

// Report and stop, before writing. Writing first left the tree holding a skill
// vendored at master while PIN still named the old commit, and nothing else
// checks the two agree — so the node would ship text nobody pinned while
// rulesSource told users it came from somewhere else.
if (wantLatest && ref !== PIN) {
	console.log(`master is ${ref.slice(0, 7)}, PIN is ${PIN.slice(0, 7)}. Nothing written.`);
	console.log(`Set PIN to ${ref}, then run without --latest and commit both files.`);
	process.exit(1);
}

const core = await join(ref, CORE);
const topics = await join(ref, TOPICS);

// The one piece of writing that stays ours, and it is about the reader's
// situation, not about video. Every rule below this line is Shotstack's.
const header = [
	"SHOTSTACK'S OFFICIAL RULES FOR WRITING AN EDIT.",
	`Source: ${REPO} at ${ref.slice(0, 7)}, Apache-2.0. Maintained by Shotstack.`,
	'',
	'Three things before you read it. It was written for an agent at a terminal;',
	'you are writing JSON for an n8n workflow.',
	'',
	'1. Do not fetch anything. The rules below open by telling you to download the',
	'   schema. It is already above, under SHOTSTACK RECIPE REFERENCE, and it is',
	'   the exhaustive list. You have no way to fetch, and no need to.',
	'2. You cannot run the shotstack command. Where the text uses it, that is a',
	'   person checking a recipe by hand. Skip those steps.',
	'3. Where the rules and the reference above disagree on which asset types are',
	'   current, the reference wins. It is generated from the schema; the rules are',
	'   pinned text and can lag. The REPLACED list above is the authority.',
	'',
	'Put the JSON you produce in the Edit field of Render From Recipe.',
].join('\n');

const ts = `// GENERATED FILE. Do not edit by hand.
// Rebuild with: node scripts/vendor-skill.mjs
//
// Shotstack's official agent skill, vendored from ${REPO}
// at ${ref}. Licensed Apache-2.0 by Shotstack.

export const SKILL_SOURCE = ${JSON.stringify({ repo: REPO, ref, license: 'Apache-2.0', url: blobUrl(ref, 'SKILL.md') }, null, 1)};

export const SKILL_HEADER: string = ${JSON.stringify(header)};

export const SKILL_CORE: string = ${JSON.stringify(core)};

export const SKILL_TOPICS: string = ${JSON.stringify(topics)};
`;

writeFileSync(new URL('../nodes/Shotstack/reference/skill.ts', import.meta.url), ts);

console.log(`vendored ${REPO} at ${ref.slice(0, 7)}`);
console.log(`  core   ${CORE.length} files, ${core.length} chars`);
console.log(`  topics ${TOPICS.length} files, ${topics.length} chars`);
console.log(`  left out ${EXCLUDED}`);
