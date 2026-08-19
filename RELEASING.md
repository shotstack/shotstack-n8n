# Releasing

## Before the first release

Three things must be true. None of them are in this repository.

1. **The repository is public.** npm provenance is published to a public
   transparency log, so npm refuses to generate it for a private repository.
   n8n requires provenance for community nodes, so a private repository cannot
   produce a publishable package.
2. **Someone with owner rights on the `@shotstack` npm organisation has added a
   trusted publisher** — npmjs.com → package settings → Publish access →
   Trusted Publishers:
   - Repository owner: `shotstack`
   - Repository name: `shotstack-n8n`
   - Workflow name: `publish.yml`
   - Environment: blank

   npm may refuse to add a trusted publisher for a name that has never been
   published. If so, publish `0.1.0` once with a granular access token set as
   the `NPM_TOKEN` repository secret, then add the trusted publisher and remove
   the secret. The workflow already handles both paths.
3. **`publish.yml` keeps its name.** The filename is part of the trusted
   publisher entry. Rename it and every tag fails silently.

## Making a release

```bash
npm test        # the release command does NOT run these
npm run release
```

`npm run release` lints, builds, asks for the version, commits, tags and pushes.
**It does not run the tests** — its only local hook is lint and build — so run
them yourself first. The tag then starts `publish.yml`, which publishes to npm.

Three guards run in CI before anything is published:

- **The tag must be on `main`.** A tag on any other branch is refused.
- **The full test suite and the reference drift check run**, because a tag
  triggers neither `ci.yml` nor the release command's own hooks.
- **A prerelease tag goes to the `next` dist-tag.** Tagging `0.2.0-rc.1` would
  otherwise become `latest` and be served to every install, because the publish
  is a bare `npm publish` and npm does not read the version.

In CI the release command runs `npm publish` and nothing else. The version bump,
the tag and the changelog all happen on your machine.

`release-it` regenerates `.auto-changelog.md` from git history as it bumps.
`CHANGELOG.md` is written by hand and is the real one. Keep it that way — the
generated file is ignored by git.

## If a bad version reaches npm

**Within 72 hours** you can remove it:

```bash
npm unpublish @shotstack/n8n-nodes-shotstack@<version>
```

Use this only if the version is dangerous. Unpublishing breaks anyone who
already installed it, and npm will not let that exact version number be reused.

**After 72 hours** a version is permanent. Deprecate it and publish a fix:

```bash
npm deprecate @shotstack/n8n-nodes-shotstack@<version> "Use <next version>. <reason>."
npm run release   # publish the fix
```

A deprecated version still installs, but npm prints the message. `npm deprecate`
needs a token with publish rights, so it is a job for whoever owns the scope.

**The package name is permanent either way.** Unpublishing does not release the
name for reuse.

## What a release does not do

Publishing to npm makes the node installable on **self-hosted n8n only**.

n8n Cloud installs verified nodes only. Verification is a separate submission to
n8n, with its own review, and it can start only after the package is on npm.
Until it passes, the README should not tell Cloud users to install this.
