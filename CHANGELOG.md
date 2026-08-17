# Changelog

## 0.1.0 — unreleased

First version.

### Added

- **Shotstack** node with a Render resource and three operations:
  - **Render From Edit** — `POST /render` with a full Shotstack edit.
  - **Render From Template** — `POST /templates/render` with a template ID and
    merge fields.
  - **Get** — `GET /render/{id}`, with a Simplify Output toggle returning
    `id`, `status`, `url` and `error`.
- **Shotstack API** credential with a Sandbox/Production switch, defaulting to
  Sandbox so the node can be tried without spending credits. Includes a
  credential test.
- **Callback URL** on both render operations, so a workflow can continue from a
  Webhook node instead of chaining a Wait node and polling.
- Responses are unwrapped from Shotstack's `{ success, message, response }`
  envelope, so workflows read `{{$json.id}}`.
- `usableAsTool` is enabled, so n8n AI Agent nodes can call the node directly.
