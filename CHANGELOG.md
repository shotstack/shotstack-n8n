# Changelog

## 0.2.0 — 2026-10-06

Adds AI generation of images, video and audio.

### Added

- **Generation** resource, for one AI image, video or audio file without
  rendering a whole edit. Shotstack bills generation in credits per asset, in
  Sandbox and in Production.
- **Generation → Generate Asset** — `POST /generate` with an asset type, a
  prompt, and optionally a model and its options. **Wait for the Asset** is on
  by default, so the step returns the finished URL rather than a job ID.
  **Give Up After** defaults to 5 minutes and allows 10: n8n runs items one at a
  time, so six waiting items at the maximum reach its one-hour limit.
  Generating the same asset twice returns the first result and is not billed
  again.
- **Generation → Quote Generation** — `POST /generate/quote`, the credits a
  generation would cost. It takes the same fields, starts no job and spends
  nothing.
- **Generation → Get Generation Status** — `GET /generate/{id}`, for a
  generation submitted without waiting.
- **Generation → List Generation Models** — `GET /models`, one item per model
  the account can use, each with the options it accepts. Point an AI agent here
  before it generates anything.
- The Model picker lists the account's models for the chosen asset type, so a
  newly launched model needs no release of this node.
- The wait stops as soon as waiting cannot help: a refused API key, a
  generation Shotstack reports it does not have, or a failed generation. A
  prompt that is not text, a Clip Length that is not a number, and Model
  Options that are not a JSON object are refused before anything is billed.

### Changed

- **Render → Render Asset** refuses an Edit of `{}` as empty before it reaches
  Shotstack, and names an Edit that is not a JSON object as such.

## 0.1.0 — 2026-08-24

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
