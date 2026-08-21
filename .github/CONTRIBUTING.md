# Maintaining the Shotstack n8n node

Owner: @Jesus-Shotstack. Ask anything in
[an issue](https://github.com/shotstack/shotstack-n8n/issues).
`.github/CODEOWNERS` asks the owner to review every pull request.

If you are covering while the owner is away, you need one of the three jobs
below. Everything after them is background. Read it later.

## Job 1. Someone filed an issue

Most issues are one of four things. Use the render ID in the report to find the
job in the Shotstack dashboard. That usually settles it.

| What they report | What it usually means |
| --- | --- |
| "Shotstack has no render with that ID" | The credential Environment does not match the key. A Production key cannot see a Sandbox render. |
| "My webhook never fires" | They used Callback URL on Render Template. That field is gone. The API accepts a callback there and then discards it. Send them to Wait for the Render To Finish. |
| Text renders as `{{ HEADLINE }}` | A partial merge. Shotstack replaces a template's merge list. It does not merge into it. Send every placeholder or send none. |
| "The edit still contains an n8n expression" | Their Edit field is in fixed mode, so n8n never evaluated `{{ $json.something }}` and it would reach Shotstack as text. The node stops it. Tell them to switch the field to expression mode, or build the edit in an earlier step. |
| The node will not install | Almost always n8n Cloud. Cloud installs verified nodes only. Your own n8n works today. |

If it is a real defect, do this:

1. Reproduce it with `npm run dev`.
2. Write a test that fails.
3. Fix it.
4. Hold the fix for the next quarterly release, unless customers are blocked.

## Job 2. Shotstack changed the Edit schema

You only need this when Shotstack ships a new asset type, property or model.

Users get most API changes without a release here. The node posts the edit the
user wrote. It does not model the schema as form fields. The one exception is
the text the node hands an AI, which is built in at build time.

```bash
npm install @shotstack/schemas@latest
node scripts/build-reference.mjs
npm run vendor:skill          # only if shotstack/shotstack-cli moved
node scripts/review-check.mjs
npm test
```

Commit the regenerated files under `nodes/Shotstack/reference/`. CI fails if
they do not match the installed schema package.

## Job 3. It is time to release

```bash
node scripts/review-check.mjs   # every check must pass
npm test
npm run release
```

Then submit the new version in the n8n Creator Portal. If it sits for more than
seven days, chase it in Discord `#community-nodes`.

Read [Releasing](#releasing) once before your first release. It has three
guards and one trap.

## Rules

Break one of these and something fails quietly.

- **Never add a runtime dependency.** n8n refuses to verify a community node
  that has one. Keep `dependencies` in `package.json` empty.
- **Never edit a generated file.** Three are generated, and an edit to any of
  them is lost on the next build or fails CI. Change the generator instead.

  | Generated file | Written by |
  | --- | --- |
  | `nodes/Shotstack/reference/recipeReference.ts` | `scripts/build-reference.mjs` |
  | `nodes/Shotstack/reference/skill.ts` | `scripts/vendor-skill.mjs` |
  | `nodes/Shotstack/userAgent.ts` | `scripts/build-user-agent.mjs`, which `npm run build` runs first |
- **Never rename an operation's `value`.** The value is the `operationId` from
  Shotstack's OpenAPI spec, and n8n saves it inside every user workflow. You may
  change a display name. You may not change a value.
- **Never use `setTimeout`.** Use `sleep` from `n8n-workflow`. The lint blocks
  `setTimeout` and n8n Cloud verification rejects it.
- **Never throw from inside a routing expression.** n8n evaluates those in a
  loop with no error handling. It fails the whole node instead of the one item.
  Shotstack still bills any render already submitted, and the workflow cannot
  reach it. Do the work in a `preSend` and throw `NodeOperationError` with
  `itemIndex`.
- **Never add an attribution trailer to a commit**, including `Co-Authored-By`.
- **Check a claim about the API before you write it down.** Use
  `node_modules/@shotstack/schemas/dist/api.bundled.json`, or call the live
  sandbox. The spec and the running service disagree sometimes. The service
  wins.

## Security

Do not open a public issue for anything that could expose an API key or
someone's rendered files. Use private vulnerability reporting on the repository
Security tab.

Three facts about what this package touches:

- The node sends the API key to `api.shotstack.io` and to no other host.
  `test/credential-host-scope.mjs` proves this against the built output on every
  release, including the case of a hostname that only looks like ours.
- Download File fetches whatever URL the workflow gives it. That is deliberate,
  because it is how you download a render from private storage. The node sends
  no credential and no Shotstack header on that request.
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

Adding an operation is a product decision. Ask the owner first.

## Releasing

`npm run release` lints, builds, asks for the version, commits, tags and
pushes. The tag then starts `publish.yml`, which publishes to npm.

Three guards run in CI before anything is published:

- **The tag must be on `main`.** CI refuses a tag on any other branch.
- **The tests and the reference drift check run.** A tag triggers neither
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

### Before the first release

1. **The repository must be public.** npm writes provenance to a public
   transparency log. It refuses to generate provenance for a private repository.
2. **An owner of the `@shotstack` npm organisation adds a trusted publisher.**
   Go to npmjs.com, then package settings, then Publish access, then Trusted
   Publishers. Set repository owner `shotstack`, repository name
   `shotstack-n8n`, workflow `publish.yml`, and leave environment blank.

   npm may refuse a trusted publisher for a name it has never seen. If that
   happens, publish `0.1.0` once with a granular access token in the `NPM_TOKEN`
   repository secret. Then add the trusted publisher and delete the secret.
   `publish.yml` handles both paths.
3. **Keep the name `publish.yml`.** The filename is part of the trusted
   publisher entry. Rename the file and every tag fails silently.

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

## Background: why this needs little work

About **3 hours a month**, in bursts. Most months are zero. One half day per
quarter does the release. Add 20 to 30 hours across the first quarter after
launch, when real users find real problems.

| Work | How often | Hours |
| --- | --- | --- |
| Quarterly release, and resubmit to n8n | 4 a year | 4 to 6 each |
| Issue triage | ongoing | 1 to 2 a month, and it grows with installs |
| Platform work, such as a new Node.js floor or an n8n major version | about once a year | 4 to 8 a year |

For comparison, ElevenLabs runs an official n8n node with a funded team. They
spend 14 commits and 2 releases a year on it.

**Most Shotstack API releases do not reach the node.** The node posts the edit
the user wrote. A new asset type, property or model works the day Shotstack
ships it. Only Job 2 above needs a release.

**n8n releases rarely reach it either.** `n8nNodesApiVersion` is 1 and has never
been 2. The `n8n-workflow` peer dependency is `*`, so its version 2.0 cost node
authors nothing. n8n's `BREAKING-CHANGES.md` covers the whole project history,
and the phrase "community node" appears in it zero times. Verified nodes may not
have runtime dependencies, so there is no CVE upkeep, and this package has none.

The tail risk is n8n adding a rule later. It has done that once: from 1 May 2026
every community node must publish from CI with provenance. This repository
already does. Budget one surprise like that every year or two.

**The node has to lag, by design.** Every new version goes back through n8n's
review queue before n8n Cloud serves it. Ten days is normal. So batch changes
quarterly. Matching Shotstack's release cadence is not possible, and the queue
is why. One useful consequence: n8n Cloud serves the reviewed version, not the
latest on npm. A bad publish does not reach Cloud users on its own.

## Still to settle

1. **Name a backup.** Three hours a month owned by one person with no cover is
   three hours a month that stops when that person is away.
2. **Use a role account for the n8n Creator Portal.** Verification ties the npm
   maintainer to the GitHub repository owner. If the person who submitted it
   leaves, the verification is stranded and nobody can move it. Fix this before
   submitting, not after.
3. **Turn on private vulnerability reporting.** Repository settings, then
   Security, then Private vulnerability reporting. Without it, a security
   finding arrives as a public issue.
4. **Configure npm trusted publishing** against this repository and
   `publish.yml`. Then no token exists to rotate or lose.
5. **Add one line to the API team's definition of done:** does this change the
   Edit schema? If yes, tag this repository for the next quarterly release.
6. **Agree a kill line.** If installs stay under an agreed number after twelve
   months, deprecate the node on purpose, with a final release and a note in the
   README. n8n never forces this. Stale nodes sit on npm for years.

## Regenerating the embedded reference

```bash
node scripts/build-reference.mjs          # from @shotstack/schemas
npm run vendor:skill                      # from shotstack/shotstack-cli, at a pinned commit
npm run vendor:skill -- --latest          # report whether the pin has moved
```

`skill-freshness.yml` runs weekly. It fails if it can no longer fetch the pinned
skill. It reports without failing if the pin is only behind.
