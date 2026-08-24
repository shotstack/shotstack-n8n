# Maintaining the Shotstack n8n node

Owner: @Jesus-Shotstack.

This is the runbook. Three jobs cover almost everything that will ever come up.
If you are covering while the owner is away, read the one you need and stop
there.

Internal. This file lives on `dev` and never on `main`.

## Job 1. Someone filed an issue

Most issues are one of five things. Use the render ID in the report to find the
job in the Shotstack dashboard. That usually settles it.

| What they report | What it usually means |
| --- | --- |
| "Shotstack has no render with that ID" | The credential Environment does not match the key. A Production key cannot see a Sandbox render. |
| "My webhook never fires" | They used Callback URL on Render Template. That field is gone. The API accepts a callback there and then discards it. Send them to Wait for the Render To Finish. |
| Text renders as `{{ HEADLINE }}` | A partial merge. Shotstack replaces a template's merge list. It does not merge into it. Send every placeholder or send none. |
| "The edit still contains an n8n expression" | Their Edit field is in fixed mode, so n8n never evaluated `{{ $json.something }}` and it would reach Shotstack as text. The node stops it. Tell them to switch the field to expression mode, or build the edit in an earlier step. |
| The node will not install | Almost always n8n Cloud. Cloud installs verified nodes only. Your own n8n works today. |

If it is a real defect:

1. Reproduce it with `npm run dev`.
2. Write a test that fails.
3. Fix it.
4. Hold the fix for the next release, unless customers are blocked. Releases
   batch, for the reason in Job 3.

## Job 2. Shotstack changed the Edit schema

You only need this when Shotstack ships a new asset type, property or model.

Users get almost every API change without a release here. The node posts the
edit the user wrote. It does not model the schema as form fields, and it carries
no copy of Shotstack's documentation.

The spec package is a development dependency only. It is what the checks compare
the operations against, so refresh it when the API gains or moves an operation:

```bash
npm install @shotstack/schemas@latest
node scripts/review-check.mjs
npm test
```

A release is needed only when the API adds an operation, changes a method or a
path, or renames an operationId.

## Job 3. It is time to release

```bash
node scripts/review-check.mjs   # every check must pass
npm test
npm run release
```

Then submit the new version in the n8n Creator Portal. If it sits for more than
seven days, chase it in Discord `#community-nodes`.

**Batch changes into few releases.** Every new version goes back through n8n's
review queue before n8n Cloud serves it, and ten days is normal. Matching
Shotstack's release cadence is not possible, and the queue is why. One useful
consequence: n8n Cloud serves the reviewed version, not the latest on npm, so a
bad publish does not reach Cloud users on its own.

Read [Releasing](#releasing) once before your first release. It has three
guards and one trap.

### The checks a script cannot do

`review-check.mjs` covers everything mechanical. These need a person, and none
of them has an automated equivalent. Work through them in a real n8n before you
tag.

1. **Run one render end to end.** Render Asset, then Get Asset by Render ID.
   This is the only test of the whole path.
2. **Press Test on the credential**, on Sandbox and on Production. The
   credential is the one part no static check can reach.
3. **Confirm a Production credential really reaches Production.** The render
   should have no watermark and should consume a credit.
4. **Open the template picker.** It should list the account's templates.
5. **Read one error out loud.** Break something on purpose, and check the
   message makes sense to a person who did not write the node.
6. **Reread the README for promises.** A timing, a screenshot or a claim about
   what Shotstack will do is a promise. A description is not.
7. **Hand this guide to someone else.** If they cannot finish Job 1 without
   asking the owner, the guide is wrong, not them.
8. **Check that every operation is still in the spec.** The node offers nothing
   the API does not. Keep it that way: a convenience operation is a promise to
   maintain something Shotstack never shipped.

## The files that need a second reader

n8n writes names into every saved workflow, and a credential is a row the user
owns that no release can reach. These files hold those names. A rename in one
of them does not fail: it silently empties a field in workflows that already
work.

Three kinds of name are frozen, and they break differently.

- **n8n stores it.** A field name, an option value, a picker mode, a collection
  key, the node type, the credential type. Rename one and the field in a saved
  workflow goes empty.
- **A user reads it.** An output key. Rename one and every expression after
  that step resolves to nothing.
- **Shotstack stores it.** The User-Agent product token, written to the render
  log on every call. Rename it and this node's renders stop being countable,
  including the ones already recorded, because nothing joins the old name to
  the new one.

Everything not named below is free to change. Display names, descriptions,
placeholders, docs, scripts, tests and the internal layout included.

Name each one. Never write a count instead. This table used to say "the nine
keys Simplify emits", which named none of them, and the README beside it listed
only eight.

| File | What is frozen in it |
| --- | --- |
| `package.json` | the package name `@shotstack/n8n-nodes-shotstack`, and the built paths `dist/nodes/Shotstack/Shotstack.node.js` and `dist/credentials/ShotstackApi.credentials.js` |
| `credentials/ShotstackApi.credentials.ts` | the credential type `shotstackApi`; the fields `environment` and `apiKey`; the values `sandbox` and `production` |
| `nodes/Shotstack/Shotstack.node.ts` | the node type `shotstack`; the behaviour of version 1, which n8n stamps on every saved node as typeVersion; the field `resource`; the values `render` and `asset` |
| `nodes/Shotstack/resources/render/index.ts` | the field `operation`; the values `postRender`, `postTemplateRender` and `getRender` |
| `nodes/Shotstack/resources/asset/index.ts` | the field `operation`; the value `getAssetByRenderId` |
| `nodes/Shotstack/Shotstack.node.json` | the codex key `@shotstack/n8n-nodes-shotstack.shotstack`. n8n matches the codex to the node on that exact string, which joins the package name to the node type, so it is a third place either can break |
| `nodes/Shotstack/resources/render/postRender.ts` | the fields `edit` and `callback` |
| `nodes/Shotstack/resources/render/postTemplateRender.ts` | the fields `templateId`, `mergeSource`, `mergeJson` and `merge`; the picker modes `list` and `id`; the collection key `mergeFields` and its fields `find` and `replace`; the values `fields` and `json` |
| `nodes/Shotstack/resources/render/getRender.ts` | the fields `renderId`, `waitForCompletion`, `giveUpAfter`, `includeData` and `simple`; the Simplify keys `id`, `status`, `url`, `poster`, `thumbnail`, `duration`, `renderTime`, `error` and `data` |
| `nodes/Shotstack/resources/asset/getAssetByRenderId.ts` | the fields `renderId`, `mainFileOnly` and `simple`; the Simplify keys `assetId`, `renderId`, `url`, `filename` and `status`. `assetId` departs from the spec on purpose: the spec calls it `id`, but only inside an asset object, and Simplify flattens that object away. Do not correct it back |
| `scripts/build-user-agent.mjs` | the product token `shotstack-n8n-node`. It writes the user agent file, which git ignores, so edit the generator and never the output. The version after the slash is meant to move |

A check reads this table. It walks the built node and fails if a frozen name is
missing here, or if a name here no longer exists in the code. Add a field and
the build tells you to add the row.

It reads the whole section as one block, so it does not prove a name sits in
the right row. Put each name under the file it comes from anyway. The check
catches the omission; only a reader catches the wrong row.

The check leaves one thing alone: the node version number. Raising it is how
you change a frozen name safely, so a check on it would fire on every release.
See the versioning rule under Rules.

One name is not frozen and still breaks in silence, because two files have to
agree on it. `nodes/Shotstack/Shotstack.node.ts` exports the list method as
`getTemplates`, and `nodes/Shotstack/resources/render/postTemplateRender.ts`
asks for it by that name. Rename one end only and the template picker returns
nothing, with no error. Change both ends together.

One more, and it is the filename rather than the contents:
`.github/workflows/publish.yml`. npm's trusted publisher entry names that file,
so renaming it stops publishing and reports nothing.

Two things that are frozen and are not files at all. The repository must keep
its name, because the same entry names it. The repository must stay public,
because npm refuses provenance for a private one.

## Rules

Break one of these and something fails quietly.

- **Never add a runtime dependency.** n8n refuses to verify a community node
  that has one. Keep `dependencies` in `package.json` empty.
- **Never edit `nodes/Shotstack/userAgent.ts`.** It is generated from the
  version in `package.json` by `scripts/build-user-agent.mjs`, and git ignores
  it. `npm run gen` writes it, and lint, build and install all run that first.
  Change the generator, never the file.
- **Never rename an operation's `value`.** The value is the `operationId` from
  Shotstack's OpenAPI spec, and n8n saves it inside every user workflow. You may
  change a display name. You may not change a value.
- **Change a frozen name by adding a version, never by editing one.** Raise
  `version` in `Shotstack.node.ts` and export the node through a
  `nodeVersions` map, keeping version 1 exactly as it shipped. n8n saves
  `typeVersion` on every node, so an existing workflow keeps running the old
  version and a new node gets the new one. Editing a name in place instead
  empties that field in every saved workflow, with no error.
- **Never use `setTimeout`.** Use `sleep` from `n8n-workflow`. The lint blocks
  `setTimeout` and n8n Cloud verification rejects it.
- **Never throw from inside a routing expression.** n8n evaluates those in a
  loop with no error handling. It fails the whole node instead of the one item.
  Shotstack still bills any render already submitted, and the workflow cannot
  reach it. Do the work in a `preSend` and throw `NodeOperationError` with
  `itemIndex`.
- **Never rename `publish.yml`.** The filename is part of npm's trusted
  publisher entry for this package. Rename it and every tag fails silently: no
  publish, no error anyone sees. The same applies to the repository name.
- **Never make the repository private.** npm writes provenance to a public
  transparency log and refuses to generate it for a private repository, so
  publishing stops.
- **Never add an attribution trailer to a commit**, including `Co-Authored-By`.
- **Check a claim about the API before you write it down.** Use
  `node_modules/@shotstack/schemas/dist/api.bundled.json`, or call the live
  sandbox. The spec and the running service disagree sometimes. The service
  wins.

Adding an operation is a product decision. Ask the owner first.

## Security

Do not open a public issue for anything that could expose an API key or
someone's rendered files. Use private vulnerability reporting on the repository
Security tab.

Three facts about what this package touches:

- The node sends the API key to `api.shotstack.io` and to no other host.
  `test/credential-host-scope.mjs` proves this against the built output on every
  release, including the case of a hostname that only looks like ours.
- The package has no runtime dependencies, so it installs no other code.

## Setting up

```bash
git clone https://github.com/shotstack/shotstack-n8n.git
cd shotstack-n8n
npm ci
npm test
```

You need Node.js 20.19 or later. `npm test` builds first, so a green run also
proves the build.

## Running it in a real n8n

```bash
npm run dev
```

This starts n8n with the node loaded from `dist/`. It needs a real terminal,
because it draws a live display. The first start takes several minutes. Your
local n8n keeps its credentials and its workflows in `~/.n8n`.

Add a **Shotstack API** credential. Set Environment to Sandbox. Paste a sandbox
key. Sandbox renders are free and carry a watermark.

`npm run dev` proves the node works. It does not prove the package installs.
Before a release, pack it and install the tarball into a clean n8n:

```bash
npm pack
# then in a clean n8n: npm install /path/to/shotstack-n8n-nodes-shotstack-<version>.tgz
```

## Changing something

1. Branch off `dev`.
2. Make the change. Add or adjust a test if the change alters behaviour. Prove
   the test works by breaking the thing it guards.
3. Run `node scripts/review-check.mjs`, `npm test` and `npm run lint`.
4. Open a pull request into `dev`. CI runs all of the above on every pull
   request.
5. Merge `dev` into `main`. Only a tag on `main` publishes.

**This file must never land on `main`.** Merging `dev` into `main` will try to
bring it back, and if you edited it since the last merge git reports a
modify/delete conflict on it. Either way the fix is the same:

```bash
git checkout main
git merge dev
git rm MAINTAINING.md     # resolves the conflict, or removes the re-add
git commit
```

`node scripts/review-check.mjs` fails if the file is on `main`, wherever you run
it, so a forgotten step shows up rather than shipping.

## Releasing

`npm run release` lints, builds, asks for the version, commits, tags and
pushes. The tag then starts `publish.yml`, which publishes to npm.

Three guards run in CI before anything is published:

- **The tag must be on `main`.** CI refuses a tag on any other branch.
- **The tests run.** A tag triggers neither
  `ci.yml` nor the release command's own hooks, so CI runs them here.
- **A prerelease tag goes to the `next` npm tag.** Otherwise `0.2.0-rc.1`
  becomes `latest` and every install gets it.

The same command does two different things in two places. On your machine it
runs `release-it`, which lints, builds, bumps the version, writes the changelog,
commits, tags and pushes. It does not publish. In CI it lints, builds, then runs
`npm publish` with provenance. Your machine makes the version and the tag. CI
does the publish.

While it bumps, `release-it` regenerates `.auto-changelog.md`. `CHANGELOG.md` is
written by hand and is the real one. The generated file goes to a different name
and git ignores it, so it cannot overwrite the real one.

### The verification scan runs after publish, not before

`npx @n8n/scan-community-package <name>` takes a published package name. It
reads the package's npm provenance, fetches the source repository that the
provenance names, and lints that repository. So it cannot run against a local
checkout. You can only find a failure once a version is on npm.

Publish `0.1.0-rc.1` first. A prerelease tag goes to the `next` npm tag, so a
scan failure never reaches anyone who runs a plain install. Scan the release
candidate. Then tag `0.1.0`.

The scan lints the attested source with `@n8n/eslint-plugin-community-nodes`
plus `no-console`. It treats a source repository it cannot reach as a failure.

The scan globs `**/*.js`, `**/*.ts` and `**/*.json`. The `.mjs` files under
`scripts/` and `test/` are outside it. They are outside `npm run lint` too:
eslint resolves 236 rules for a file under `nodes/` and **zero** for a `.mjs`
file. Nothing checks those files. That is why they may use `console`. If you
move that code into a `.ts` file, expect `no-console` to fire.

### Removing or deprecating a version

Within 72 hours, `npm unpublish @shotstack/n8n-nodes-shotstack@<version>`
removes it. Use this only for a version that is unsafe to install. It breaks
everyone who already installed, and npm never lets that version number be used
again.

This is not a rollback. Anyone running their own n8n already has the files on
disk, and npm cannot recall them. Publishing a fixed version is the real remedy.

After 72 hours a version is permanent:

```bash
npm deprecate @shotstack/n8n-nodes-shotstack@<version> "Use <next version>. <reason>."
```

The package name is permanent either way. Unpublishing does not free it.
