# Changelog

## 0.1.0 — 2026-08-20

First version. Published as `@shotstack/n8n-nodes-shotstack`.

### Added

- **Shotstack** node with three resources. Operation names and stored values
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
- **Asset → Get Asset by Render ID** — `GET /assets/render/{id}` on the Serve
  API, for the permanent CDN URL. This operation waits up to two minutes for
  Shotstack to publish the file, so no Wait node is needed after the render
  finishes.
- **Asset → Download File** — fetches a hosted file as binary data, so it can be
  attached to an email or uploaded straight from n8n.
- **Reference → Get Reference** — hands a language model everything it needs to
  write a working edit. Two parts, both maintained by Shotstack: the allowed
  values are generated from the `@shotstack/schemas` package, and the craft is
  Shotstack's agent skill, vendored from `shotstack/shotstack-cli` at a pinned
  commit. The command-line parts of that skill are left out, because an AI
  inside n8n has no terminal. **Detail** chooses Core, Full or Everything.
  **Include Templates** adds the templates saved in the account.
- **Shotstack API** credential with a Sandbox and Production switch, defaulting
  to Sandbox so the node can be tried without spending credits. Includes a
  credential test. The node sends the API key to `api.shotstack.io` and to no
  other host. An automated test verifies this against the built output on every
  release.
- **Callback URL** on both render operations, so a workflow can continue from a
  Webhook node instead of chaining a Wait node and polling.
- Responses are unwrapped from Shotstack's response envelope, so workflows read
  `{{$json.id}}`.
- `usableAsTool` is enabled, so n8n AI Agent nodes can call the node directly.
