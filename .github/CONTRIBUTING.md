# Maintaining this node

For whoever owns this repository. Users do not need this file.

## What it costs to keep

About **3 hours a month**, in bursts rather than weekly. Most months are zero.
One half-day per quarter does the release.

| Work | How often | Hours |
| --- | --- | --- |
| Quarterly release: bump `@shotstack/schemas`, regenerate, test, tag, resubmit to n8n | 4 a year | 4–6 each |
| Issue triage | ongoing | 1–2 a month, and it grows with installs |
| Platform work: a Node.js floor, an n8n major | about once a year | 4–8 a year |

Add **20–30 hours across the first quarter after launch**, when real users find
real problems.

For comparison, ElevenLabs runs a vendor-official n8n node with a funded team.
They spend 14 commits and 2 releases a year on it.

## Why Shotstack API releases do not force node work

The node posts the edit the user wrote. It does not model the Edit schema as
form fields. A new asset type, a new property or a new model reaches users
through the node on the day Shotstack ships it, with no release here.

Three things do force work:

1. **A new operation we choose to expose.** A product decision, on our cadence.
2. **The reference text.** `scripts/build-reference.mjs` and
   `scripts/vendor-skill.mjs` bake Shotstack's schema and agent skill into the
   package at build time. Both go stale until someone regenerates them. This is
   the one place a Shotstack change needs a release here.
3. **A platform change.** Rare. See the table above.

## Why n8n releases rarely force node work

- `n8nNodesApiVersion` is 1 and has never been 2.
- The `n8n-workflow` peer dependency is `*`, so its 2.0 cost node authors nothing.
- n8n's `BREAKING-CHANGES.md` covers the whole project history. The phrase
  "community node" appears in it zero times.
- Verified nodes may not have runtime dependencies, so there is no dependency
  or CVE upkeep. This package has none.

The tail risk is that n8n adds a rule later. It has done so once: from
1 May 2026 every community node must publish from CI with provenance. This
repository already does. Budget one surprise like that every year or two.

## The node has to lag, by design

Every new version goes back through n8n's review queue before n8n Cloud serves
it. Ten days is normal and the feedback is thin. So batch changes quarterly.
Do not try to match Shotstack's release cadence — it cannot be done, and the
queue is the reason.

One useful consequence: n8n Cloud serves the reviewed version, not npm's
latest. A bad publish does not reach Cloud users on its own.

## Handing this over

Do these before submitting for verification, not after.

1. **Name one owner and one backup.** Three hours a month owned by "the team"
   becomes zero hours a month. This is the whole thing.
2. **Use a role account for the n8n Creator Portal.** Verification ties the npm
   maintainer to the GitHub repository owner. If the person who submitted it
   leaves, the verification is stranded and cannot be moved.
3. **Configure npm Trusted Publishing** against this repository and
   `publish.yml`, so no long-lived token exists to rotate or lose.
4. **Add one line to the API team's definition of done:** does this change the
   Edit schema? If yes, tag this repository for the next quarterly release.
5. **Route the repository's issues** to the named owner. `package.json` already
   points `bugs.url` here.
6. **Agree a kill line now.** If installs stay under an agreed number after
   twelve months, deprecate on purpose with a final release and a README notice.
   n8n never forces this. Stale nodes sit on npm for years.

## Reviewing before you release

```bash
node scripts/review-check.mjs
```

Nineteen checks in one pass: build, lint, tests, the n8n verification
requirements, a clean history, that every operation value is a real
`operationId` and every display name matches the spec summary, that the two
operations with no spec entry say so, that an AI agent gets a real tool
description, and that the README has not started restating the API again.

It prints PASS or FAIL per row and exits non-zero on any FAIL. It does not
cover the one thing that matters most: a real render through the node.

## Releasing

```bash
node scripts/review-check.mjs
npm test        # the release command does NOT run these
npm run release
```

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
reads the package's npm provenance, fetches the source repository the
provenance attests to, and lints that source. So it cannot run against a local
checkout, and a failure can only be found once a version is on npm.

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

### If a bad version reaches npm

Within 72 hours `npm unpublish @shotstack/n8n-nodes-shotstack@<version>` removes
it. Use it only if the version is dangerous: it breaks anyone who already
installed, and npm will not let that version number be reused.

This is not a rollback. Self-hosted n8n installs are already on disk and npm
cannot recall them. Publishing a fixed version is the real remedy.

After 72 hours a version is permanent:

```bash
npm deprecate @shotstack/n8n-nodes-shotstack@<version> "Use <next version>. <reason>."
```

The package name is permanent either way. Unpublishing does not free it.

## Regenerating the embedded reference

```bash
node scripts/build-reference.mjs          # from @shotstack/schemas
npm run vendor:skill                      # from shotstack/shotstack-cli, at a pinned commit
npm run vendor:skill -- --latest          # report whether the pin has moved
```

`skill-freshness.yml` runs weekly. It fails if the pinned skill can no longer be
fetched, and reports without failing if the pin is merely behind.
