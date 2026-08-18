# Changelog

## 0.1.0 — unreleased

First version.

### Added

- **Shotstack** node with a Render resource and six operations:
  - **Render From Example** — the default. Ten ready-made edits in a
    dropdown, each rendering as-is. Nine are Shotstack's published templates;
    the vertical one is ours, because the library has no vertical example and
    vertical is the most common shape in real automation traffic. A new user
    can render a real video without writing any JSON.
  - **Render From Edit** — `POST /render` with a full Shotstack edit.
  - **Render From Template** — `POST /templates/render` with a template ID and
    merge fields.
  - **Get** — `GET /render/{id}`, with an Include Submitted Edit toggle and a
    Simplify toggle.
  - **Download Video** — fetches the finished file as binary data, so it can be
    attached to an email or uploaded straight from n8n.
  - **Get Hosted Asset** — `GET /assets/render/{id}` on the Serve API, for the
    permanent CDN URL. The URL returned by **Get** is a direct storage link that
    expires after 24 hours, so anything stored or published should use this.
- **Shotstack API** credential with a Sandbox/Production switch, defaulting to
  Sandbox so the node can be tried without spending credits. Includes a
  credential test.
- **Callback URL** on all three render operations, so a workflow can continue from a
  Webhook node instead of chaining a Wait node and polling.
- Responses are unwrapped from Shotstack's `{ success, message, response }`
  envelope, so workflows read `{{$json.id}}`.
- `usableAsTool` is enabled, so n8n AI Agent nodes can call the node directly.
