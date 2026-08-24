# Changelog

## 0.1.0 — 2026-08-20

First version. Published as `@shotstack/n8n-nodes-shotstack`.

### Added

Every operation maps to an entry in Shotstack's OpenAPI spec. The node adds
none of its own. To fetch the rendered bytes, use n8n's HTTP Request node with
the URL this node returns. To give an AI the rules for writing an edit, link it
to Shotstack's published documentation from the Agent node's system message.

- **Shotstack** node with two resources. Operation names and stored values
  follow Shotstack's OpenAPI spec: the display name is the operation summary,
  the value is the `operationId`.
- **Render → Render Asset** — `POST /render` with a Shotstack edit. It accepts
  any number of clips, every asset type and the generative assets.
- **Render → Render Template** — `POST /templates/render` with a template ID and
  merge fields. The template can be picked from a searchable list of the
  templates in the account, or entered by ID.
- **Render → Get Render Status** — `GET /render/{id}`, with an Include Submitted
  Edit toggle and a Simplify toggle. **Wait for the Render To Finish** keeps
  checking until the render is done, which replaces the usual Wait node and
  Switch loop. A failed render stops the step with Shotstack's reason.
  **Give Up After** defaults to 5 minutes and allows 10. Measured across 113,759
  renders made from n8n, 99.62% finish inside 10 minutes and raising the ceiling
  to 15 would add 0.07%. Giving up does not stop the render, so anything longer
  belongs on a Callback URL.
- **Asset → Get Asset by Render ID** — `GET /assets/render/{id}` on the Serve
  API, for the permanent CDN URL. This operation waits up to two minutes for
  Shotstack to publish the file, so no Wait node is needed after the render
  finishes.
- **Shotstack API** credential with a Sandbox and Production switch, defaulting
  to Sandbox so the node can be tried without spending credits. Includes a
  credential test. The node sends the API key to `api.shotstack.io` and to no
  other host. An automated test verifies this against the built output on every
  release.

  The switch stores which environment you picked, not the API version that
  environment currently maps to. A credential is a row the user owns, and no
  release of this node can change one that already exists, so a version number
  stored there would outlive the version.
- **Callback URL** on Render Asset, so a workflow can continue from a Webhook
  node instead of chaining a Wait node and polling. Render Template has no
  callback field: the Edit API accepts one on `POST /templates/render` and does
  not act on it.
- Responses are unwrapped from Shotstack's response envelope, so workflows read
  `{{$json.id}}`. Get Asset by Render ID returns a hosted file rather than a
  render, so it names the render `renderId` and the file `assetId`.
- `usableAsTool` is enabled, so n8n AI Agent nodes can call the node directly.
- Render Asset refuses an edit that still holds an unevaluated n8n expression.
  A field left in fixed mode passes text like `{{ $json.videoUrl }}` through
  unchanged, and Shotstack then reports a bad asset URL, which points the user
  at us rather than at their own expression. Shotstack merge placeholders such
  as `{{ HEADLINE }}` are untouched.
- Both wait loops back off when Shotstack rate limits the account, and use the
  `Retry-After` header when it sends one. They used to read a 429 as "not ready
  yet" and poll again, adding load to the account already being throttled. The
  gap between polls also grows as a wait goes on.
- The User-Agent carries the package version, so renders can be traced to the
  release that made them. It is generated from `package.json` at build time.
