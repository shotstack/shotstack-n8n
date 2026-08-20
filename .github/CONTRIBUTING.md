# Maintaining the Shotstack n8n node

**Owner:** @Jesus-Shotstack, Growth Engineering. **Backup:** not named yet.
Reach the owner through [an issue](https://github.com/shotstack/shotstack-n8n/issues)
or support@shotstack.io. `.github/CODEOWNERS` requests their review on every
pull request. Security problems go to
[SECURITY.md](SECURITY.md), not to a public issue.

If you are covering while the owner is away, you need one of the three jobs
below. Everything after them is background you can read later.

---

## Job 1 — someone filed an issue

Most issues are one of four things. The render ID in the report is what settles
it: it lets you look the job up in the Shotstack dashboard.

| What they report | Usually means |
| --- | --- |
| "Shotstack has no render with that ID" | The credential Environment does not match the key. A Sandbox render is invisible to a Production key. |
| "My webhook never fires" | They used Callback URL on Render Template. That field does not exist any more; the API accepts a callback there and discards it. Point them at Wait for the Render To Finish. |
| Text renders as `{{ HEADLINE }}` | A partial merge. A template's merge list is replaced, not merged, so every placeholder must be sent. |
| The node will not install | Almost always n8n Cloud, which installs verified nodes only. Self-hosted works today. |

If it is a real defect: reproduce it with `npm run dev`, add a test that fails,
fix it, and let it ride to the next quarterly release unless customers are
blocked.

## Job 2 — Shotstack changed the Edit schema

Only needed when Shotstack ships a new asset type, property or model. Users get
API changes without a release here, because the node posts the edit they wrote
rather than modelling the schema as form fields. The one exception is the text
the node hands an AI, which is baked in at build time.

```bash
npm install @shotstack/schemas@latest
node scripts/build-reference.mjs
npm run vendor:skill          # only if shotstack/shotstack-cli moved
node scripts/review-check.mjs
npm test
```

Commit the regenerated `nodes/Shotstack/reference/` files. CI fails if they do
not match the installed schema package.

## Job 3 — it is time to release

```bash
node scripts/review-check.mjs   # 32 checks, all must pass
npm test
npm run release
```

Then submit the new version in the n8n Creator Portal. Chase it in Discord
`#community-nodes` if it sits for more than seven days.

Full detail in [Releasing](#releasing) below. Read it once before your first
release — there are three guards and one trap.

---

## Setting up

```bash
git clone https://github.com/shotstack/shotstack-n8n.git
cd shotstack-n8n
npm ci
npm test
```

Node.js 20.19 or later. `npm test` builds first, so a green run also proves the
build.

## Running it in a real n8n

```bash
npm run dev
```

Starts n8n with the node loaded from `dist/`. It needs a real terminal — it
draws a live display — and the first start takes several minutes. Your local
n8n, its credentials and its workflows persist in `~/.n8n`.

Add a **Shotstack API** credential, set Environment to Sandbox, and paste a
sandbox key. Sandbox renders are free and watermarked.

`npm run dev` proves the node works. It does not prove the package installs.
Before a release, pack it and install the tarball into a clean n8n:

```bash
npm pack
# then in a clean n8n: npm install /path/to/shotstack-n8n-nodes-shotstack-<version>.tgz
```

## Changing something

1. Branch off `dev`.
2. Make the change. Add or adjust a test if the change is behavioural.
3. `node scripts/review-check.mjs`, `npm test`, `npm run lint`.
4. Open a pull request into `dev`. CI runs all of the above on every PR.
5. `dev` merges into `main`, and only a tag on `main` publishes.

Do not edit `nodes/Shotstack/reference/` by hand. It is generated, and CI fails
if it drifts from the schema package.

## Releasing

`npm run release` lints, builds, asks for the version, commits, tags and pushes.
The tag then starts `publish.yml`, which publishes to npm.

Three guards run in CI before anything is published:

- **The tag must be on `main`.** A tag on any other branch is refused.
- **The tests and the reference drift check run**, because a tag triggers
  neither `ci.yml` nor the release command's own hooks.
- **A prerelease tag goes to the `next` dist-tag.** Otherwise `0.2.0-rc.1`
  becomes `latest` and is served to every install.

The same command behaves differently in the two places. On your machine it runs
release-it: lint, build, bump, changelog, commit, tag, push, and no publish. In
CI it runs lint, build, then `npm publish` with provenance. The version bump and
the tag happen on your machine; only the publish happens in CI.

While bumping, release-it regenerates `.auto-changelog.md`. `CHANGELOG.md` is
written by hand and is the real one. The generated file is pointed elsewhere and
ignored by git, so it cannot overwrite it.

### The verification scan runs after publish, not before

`npx @n8n/scan-community-package <name>` takes a published package name. It
reads the package's npm provenance, fetches the source repository the provenance
attests to, and lints that. So it cannot run against a local checkout, and a
failure can only be found once a version is on npm.

Publish `0.1.0-rc.1` first. A prerelease tag goes to the `next` dist-tag, so a
scan failure never reaches anyone who runs a plain install. Scan the release
candidate, then tag `0.1.0`.

The scan lints the attested source with `@n8n/eslint-plugin-community-nodes`
plus `no-console`, and treats an unreachable source repository as a hard
failure.

It globs `**/*.js`, `**/*.ts` and `**/*.json`, so the `.mjs` files under
`scripts/` and `test/` are outside it. They are outside `npm run lint` too:
eslint resolves 236 rules for a file under `nodes/` and **zero** for a `.mjs`.
Nothing checks those files, which is why they may use `console`. Do not move
that code into a `.ts` file without expecting `no-console` to fire.

### Before the first release

1. **The repository must be public.** npm publishes provenance to a public
   transparency log and refuses to generate it for a private repository.
2. **An owner of the `@shotstack` npm organisation adds a trusted publisher** —
   npmjs.com → package settings → Publish access → Trusted Publishers:
   repository owner `shotstack`, repository name `shotstack-n8n`, workflow
   `publish.yml`, environment blank.

   npm may refuse to add one for a name that has never been published. If so,
   publish `0.1.0` once with a granular access token in the `NPM_TOKEN`
   repository secret, then add the trusted publisher and delete the secret.
   `publish.yml` handles both paths.
3. **`publish.yml` keeps its name.** The filename is part of the trusted
   publisher entry. Rename it and every tag fails silently.

### Removing or deprecating a version

Within 72 hours `npm unpublish @shotstack/n8n-nodes-shotstack@<version>` removes
it. Use it only for a version that is unsafe to install: it breaks anyone who
already installed, and npm will not let that version number be reused.

This is not a rollback. Self-hosted n8n installs are already on disk and npm
cannot recall them. Publishing a fixed version is the real remedy.

After 72 hours a version is permanent:

```bash
npm deprecate @shotstack/n8n-nodes-shotstack@<version> "Use <next version>. <reason>."
```

The package name is permanent either way. Unpublishing does not free it.

---

## Background: why this does not need much work

About **3 hours a month**, in bursts. Most months are zero. One half-day per
quarter does the release. Add 20–30 hours across the first quarter after launch,
when real users find real problems.

| Work | How often | Hours |
| --- | --- | --- |
| Quarterly release, and resubmit to n8n | 4 a year | 4–6 each |
| Issue triage | ongoing | 1–2 a month, and it grows with installs |
| Platform work: a Node.js floor, an n8n major | about once a year | 4–8 a year |

For comparison, ElevenLabs runs a vendor-official n8n node with a funded team.
They spend 14 commits and 2 releases a year on it.

**Shotstack API releases mostly do not reach the node.** It posts the edit the
user wrote. A new asset type, property or model works the day Shotstack ships
it. Only Job 2 above needs a release.

**n8n releases rarely reach it either.** `n8nNodesApiVersion` is 1 and has never
been 2. The `n8n-workflow` peer dependency is `*`, so its 2.0 cost node authors
nothing. n8n's `BREAKING-CHANGES.md` covers the whole project history and the
phrase "community node" appears in it zero times. Verified nodes may not have
runtime dependencies, so there is no CVE upkeep, and this package has none.

The tail risk is n8n adding a rule later. It has done so once: from 1 May 2026
every community node must publish from CI with provenance. This repository
already does. Budget one surprise like that every year or two.

**The node has to lag, by design.** Every new version goes back through n8n's
review queue before n8n Cloud serves it. Ten days is normal. Batch changes
quarterly; matching Shotstack's cadence is not possible and the queue is why.
One useful consequence: n8n Cloud serves the reviewed version, not npm's latest,
so a bad publish does not reach Cloud users on its own.

## Still to settle

1. **Name a backup.** Three hours a month owned by one person with no cover is
   three hours a month that stops when they are away.
2. **Use a role account for the n8n Creator Portal.** Verification ties the npm
   maintainer to the GitHub repository owner. If the person who submitted it
   leaves, the verification is stranded and cannot be moved. Fix this before
   submitting, not after.
3. **Configure npm Trusted Publishing** against this repository and
   `publish.yml`, so no long-lived token exists to rotate or lose.
4. **Add one line to the API team's definition of done:** does this change the
   Edit schema? If yes, tag this repository for the next quarterly release.
5. **Agree a kill line.** If installs stay under an agreed number after twelve
   months, deprecate on purpose with a final release and a README notice. n8n
   never forces this. Stale nodes sit on npm for years.

## Regenerating the embedded reference

```bash
node scripts/build-reference.mjs          # from @shotstack/schemas
npm run vendor:skill                      # from shotstack/shotstack-cli, at a pinned commit
npm run vendor:skill -- --latest          # report whether the pin has moved
```

`skill-freshness.yml` runs weekly. It fails if the pinned skill can no longer be
fetched, and reports without failing if the pin is merely behind.
