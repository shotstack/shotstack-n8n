# Reporting a security problem

Email **support@shotstack.io**. Do not open a public issue for anything that
could expose someone's API key or their rendered files.

Tell us what you found, how to reproduce it, and which version of the node you
were running. You do not need a proof of concept.

## What this package touches

The node holds one thing worth protecting: your Shotstack API key, stored in an
n8n credential and encrypted by n8n.

- The key is sent to `api.shotstack.io` and to no other host. A test in
  `test/credential-host-scope.mjs` checks this against the built output on every
  release, including the lookalike-hostname case.
- **Download File fetches whatever URL the workflow gives it**, which may be a
  host you do not control, or one on your own network. That is deliberate: it is
  how you download a render from private storage. The node sends no credential
  and no Shotstack headers on that request. Set the field from a Shotstack step
  rather than from untrusted input.
- The package has no runtime dependencies, so it pulls in no third-party code at
  install time.

## Supported versions

The latest published version. This node is pre-1.0, so fixes go out in a new
release rather than as patches to older ones.
