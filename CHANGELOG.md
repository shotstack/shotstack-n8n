# Changelog

## 0.1.0 — unreleased

First version. Published as `@shotstack/n8n-nodes-shotstack`.

### Added

- **Shotstack** node with two resources.
- **Reference → Get** hands a language model everything it needs to write a
  working recipe: every asset type with its nested shape, every allowed value,
  and the house rules that decide whether a render looks good. **Detail: Full**
  also fetches Shotstack's guide for language models. **Include Templates** adds
  the templates saved in the account.
- **Render → Render From Recipe (Best for AI)** — `POST /render` with a whole
  Shotstack recipe. The only operation with no ceiling: any number of clips, any
  asset type, and the generative assets.
- **Render → Render From Template** — `POST /templates/render` with a template
  ID and merge fields. The template can be picked from a searchable list of the
  templates in the account, or entered by ID.
- **Render → Get** — `GET /render/{id}`, with an Include Submitted Edit toggle
  and a Simplify toggle. **Wait For The Render To Finish** keeps checking until
  the render is done, which replaces the usual Wait node and Switch loop. A
  failed render stops the step with Shotstack's reason instead of looping.
- **Render → Get Hosted Asset** — `GET /assets/render/{id}` on the Serve API,
  for the permanent CDN URL. The URL returned by **Get** is a direct storage
  link that expires after 24 hours. This operation waits up to two minutes for
  Shotstack to publish the file, so no Wait node is needed after the render
  finishes.
- **Render → Download Video** — fetches the finished file as binary data, so it
  can be attached to an email or uploaded straight from n8n.
- **Shotstack API** credential with a Sandbox/Production switch, defaulting to
  Sandbox so the node can be tried without spending credits. Includes a
  credential test. The API key is sent to `api.shotstack.io` and to no other
  host, which a test in `test/` proves against the built output.
- **Callback URL** on both render operations, so a workflow can continue from a
  Webhook node instead of chaining a Wait node and polling.
- Responses are unwrapped from Shotstack's `{ success, message, response }`
  envelope, so workflows read `{{$json.id}}`.
- `usableAsTool` is enabled, so n8n AI Agent nodes can call the node directly.
