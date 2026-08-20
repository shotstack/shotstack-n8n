# AGENTS.md

Instructions for coding agents working in this repository. Humans want
[.github/CONTRIBUTING.md](.github/CONTRIBUTING.md), which this file does not
repeat.

This is a first-party n8n community node for the Shotstack API. It is
declarative: operations are described as data in `nodes/Shotstack/resources/`
and n8n builds the HTTP request. There is no imperative `execute()`.

## Commands

```bash
npm ci                          # install
npm test                        # builds first, then runs four test files
npm run lint                    # n8n's own ruleset, must exit 0
node scripts/review-check.mjs   # every check must pass
npm run dev                     # a real n8n with this node loaded, needs a real terminal
```

Run `node scripts/review-check.mjs` before you claim a change is finished. It
checks n8n's verification requirements, spec alignment and repo hygiene, and it
prints what it measured rather than what it hoped. Do not write the number of
checks into prose — it goes stale the moment one is added.

## Never

- **Never add a `Co-Authored-By` trailer**, or any other attribution trailer, to
  a commit.
- **Never add a runtime dependency.** n8n refuses to verify a community node
  that has any. `dependencies` in `package.json` must stay empty.
- **Never edit `nodes/Shotstack/reference/`.** Both files are generated. CI
  regenerates them and fails on any diff. Change the generator instead.
- **Never use `setTimeout`.** Use `sleep` from `n8n-workflow`; the lint blocks
  the former and n8n Cloud verification rejects it.
- **Never throw from inside a routing expression.** n8n evaluates those in a
  per-item loop with no error handling, so it fails the whole node instead of
  the item, and renders already submitted are billed with no way to reach them.
  Do the work in a `preSend` and throw `NodeOperationError` with `itemIndex`.
- **Never rename an operation's `value`.** It is the `operationId` from
  Shotstack's OpenAPI spec, and it is persisted in every saved user workflow.
  Display names are free to change; values are not.

## Ask first

- Force-pushing, or anything that rewrites published history.
- Opening a pull request. Draft the description and hand it over.
- Publishing, tagging a release, or touching `publish.yml`.
- Adding an operation. Coverage is a product decision, not a code one.
- Changing what `Get Reference` hands a model. That text decides what a
  customer's AI writes.

## Always

- Branch off `dev`. Only a tag on `main` publishes.
- Add or adjust a test when the change is behavioural, and prove the test works
  by breaking the thing it guards.
- Check a claim about the API against `node_modules/@shotstack/schemas/dist/api.bundled.json`,
  or against the live sandbox, before writing it down. The spec and the running
  service do not always agree, and the service wins.

## Things that have already caught people

- **`.mjs` files are unlinted.** ESLint resolves 236 rules for a file under
  `nodes/` and zero for a `.mjs`, and n8n's scanner globs only `.js`, `.ts` and
  `.json`. Nothing checks `scripts/` or `test/`.
- **The API returns the submitted edit unless you ask it not to.** `GET
  /render/{id}` includes `data` when the parameter is absent.
- **`POST /templates/render` accepts a `callback` and silently discards it.**
  Only `POST /render` honours one.
- **Routing headers merge with lodash `merge`**, which skips `undefined` rather
  than deleting a key. To drop an inherited header, delete it in a `preSend`.
- **n8n builds an AI tool's description from `action`, not `description`.** A
  bare verb tells a model nothing.

## Raising issues and pull requests

Report a defect as a GitHub issue using the bug template, and include the
render ID. For a change, branch off `dev`, get `npm test`, `npm run lint` and
`node scripts/review-check.mjs` green, then hand the branch and a draft
description to the owner named in CONTRIBUTING.
