# @shotstack/n8n-nodes-shotstack

Render video and images from JSON, inside n8n.

[Shotstack](https://shotstack.io/docs/guide/getting-started/core-concepts/) renders
video and images from a JSON edit and returns a hosted URL. This node puts that in
your n8n workflows.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Waiting for a render](#waiting-for-a-render) · [Working with the file](#working-with-the-file) · [Use with AI agents](#use-with-ai-agents) · [Resources](#resources)

## Installation

Install `@shotstack/n8n-nodes-shotstack` from
[Settings → Community Nodes](https://docs.n8n.io/integrations/community-nodes/installation/gui-install/).

n8n Cloud installs [verified community nodes](https://docs.n8n.io/integrations/community-nodes/installation/verified-install/)
only. Verification is a separate n8n review that starts once the package is on
npm. Install this node on self-hosted n8n today.

## Credentials

You need a Shotstack API key from
[the dashboard](https://shotstack.io/docs/guide/getting-started/request-api-keys/).
Sandbox and Production have separate keys.

The credential's **Environment** switch defaults to Sandbox, so you can build
before you spend anything. The node sends your key to `api.shotstack.io` and to
no other host.

## Operations

Operation names and stored values come from
[Shotstack's OpenAPI spec](https://shotstack.io/docs/api/). The display name is
the operation summary and the value is the `operationId`, so the node's dropdown
and the API reference read the same way.

| Resource → Operation | API |
| --- | --- |
| **Render → Render Asset** | `POST /render` · `postRender` |
| **Render → Render Template** | `POST /templates/render` · `postTemplateRender` |
| **Render → Get Render Status** | `GET /render/{id}` · `getRender` |
| **Asset → Get Asset by Render ID** | `GET /assets/render/{id}` · `getAssetByRenderId` (Serve API) |
| **Asset → Download File** | none — see below |
| **Reference → Get Reference** | none — see below |

Two operations have no entry in the spec, because they do work that belongs to
the workflow rather than to the API:

- **Download File** fetches a hosted URL as binary data. No Shotstack endpoint
  returns bytes, and n8n needs them to attach or upload a file.
- **Get Reference** returns the schema and writing rules an AI agent needs
  before it can produce a valid edit. It reads `GET /templates` to list your
  templates and to confirm the key works.

### Render → Render Asset

Renders a video or image from a Shotstack edit. It accepts any number of clips,
every asset type and the generative assets. Point an AI agent at this operation.

| Field | Notes |
| --- | --- |
| **Edit** | The edit: a `timeline` of tracks and clips, plus `output` settings. Paste one from the [docs](https://shotstack.io/docs/guide/) or [Studio](https://shotstack.io/studio/), or have **Get Reference** produce one. |
| **Callback URL** | Optional. Shotstack posts the finished render here — see [Waiting for a render](#waiting-for-a-render). |

An edit can also generate its own media, which a template cannot do on its own.
See [Generative AI assets](https://shotstack.io/docs/guide/generating-assets/generative-ai/).
Shotstack bills each generated asset in Sandbox and in Production. All other
Sandbox renders are free.

Keep the **Edit** field in fixed mode. In expression mode, n8n evaluates
Shotstack merge placeholders such as `{{ HEADLINE }}` and removes them.

### Render → Render Template

Renders a template saved in your Shotstack account, filling in its placeholders.

| Field | Notes |
| --- | --- |
| **Template** | Pick one from the list, or paste an ID. Templates are made in [Shotstack Studio](https://shotstack.io/studio/). |
| **Merge Fields Source** | **Fields** for find/replace pairs, or **JSON** to supply the whole list at once. |
| **Merge Fields** | The find value is the placeholder name without braces. See [Merging data](https://shotstack.io/docs/guide/architecting-an-application/merging-data/). |
| **Callback URL** | Optional, as above. |

Returns the render `id`.

### Render → Get Render Status

Checks a render and returns its status.

| Field | Notes |
| --- | --- |
| **Render ID** | The id returned by either render operation. The default reads it from the previous step. |
| **Wait for the Render To Finish** | Off by default. On, the step keeps checking until the render is done — see [Waiting for a render](#waiting-for-a-render). |
| **Give Up After (Minutes)** | Only shown when waiting. 10 by default, 60 at most. |
| **Include Submitted Edit** | Off by default, so polling responses stay small. |
| **Simplify** | On by default. Returns `id`, `status`, `url`, `poster`, `thumbnail`, `duration`, `renderTime` and `error`. |

**Branch on `failed` as well as `done`** — see the wait loop below. The
[API reference](https://shotstack.io/docs/api/) lists every status value.

The `url` from this operation is a temporary storage link. For a URL you intend
to keep, use **Asset → Get Asset by Render ID**.

### Asset → Get Asset by Render ID

Returns the permanent CDN URL for a finished render.

| Field | Notes |
| --- | --- |
| **Render ID** | The id returned by either render operation. |
| **Main File Only** | On by default. Off returns [every asset the render produced](https://shotstack.io/docs/guide/serving-assets/serve-api/), one item each. |
| **Simplify** | On by default. Returns `id`, `renderId`, `url`, `filename`, `filesize` and `status`. |

Use this for any URL you store, email, publish or hand to another system.

**A finished render is not yet a published file.** Shotstack renders the file,
then publishes it, as two steps. The Serve API answers 404 until the second step
completes. The publish time varies, so a fixed Wait node does not fit. This
operation waits for you, up to two minutes, and names the cause if the file does
not appear. Do not add a Wait node after the render finishes.

### Asset → Download File

Fetches a hosted file as binary data, so the next node can attach it to an
email or upload it.

| Field | Notes |
| --- | --- |
| **File URL** | Defaults to `{{ $json.url }}`. Put this step after **Get Asset by Render ID** and it needs no setup. |
| **File Name** | Optional. Leave blank to use the name in the URL. |

Most posting nodes accept a URL and do not need this.

### Reference → Get Reference

Hands a language model everything it needs to write a working edit. **Call this
before asking an AI to build a video.**

| Field | Notes |
| --- | --- |
| **Detail** | `Core` is enough to write a good edit. `Full` adds ten topic guides. `Everything` also fetches Shotstack's full documentation bundle. |
| **Include Templates** | On by default. Adds this account's templates, so an AI can pick one instead of writing an edit from nothing. |

Returns `reference`, one string with two parts. Shotstack maintains both:

| Part | Source |
| --- | --- |
| Every asset type with its nested shape, and every allowed value | Generated from the [`@shotstack/schemas`](https://www.npmjs.com/package/@shotstack/schemas) package |
| How to write an edit that works and looks good | Shotstack's agent skill, from [`shotstack/shotstack-cli`](https://github.com/shotstack/shotstack-cli) |

Because Shotstack maintains this guidance upstream, an improvement reaches this
node without a rewrite here. The output carries `rulesSource`, which names the
exact upstream commit. The command-line parts of the skill are left out: they
tell the reader to run shell commands, and an AI inside n8n has no terminal.

`Everything` also fetches
[Shotstack's guide for language models](https://shotstack.io/docs/guide/llms-full.txt).
The step succeeds even if that fetch fails. It then returns
`documentationError`, which names what is missing.

To check an edit before you render it, without an API key:
[Shotstack CLI](https://shotstack.io/docs/guide/agents/cli/).

### Output shape

This node unwraps Shotstack's response envelope, so read `{{$json.id}}`, not
`{{$json.response.id}}`.

## Waiting for a render

Rendering is asynchronous, so the render operations return an id, not a video.
See [how long a render takes](https://shotstack.io/docs/guide/architecting-an-application/limitations/).
There are three ways to get the finished file.

### Wait for the Render To Finish (simplest)

Turn on **Wait for the Render To Finish** in **Render → Get Render Status**:

```
Shotstack (Render Asset) → Shotstack (Get Render Status, waiting) → Shotstack (Get Asset by Render ID) → next step
```

No Wait node, no Switch, no loop. A failed render stops the step and reports the
reason Shotstack gave, rather than looping.

It holds the n8n execution open while it waits, so use **Give Up After** to bound
it. Two things to plan for. Your n8n can stop an execution before that time —
check [`EXECUTIONS_TIMEOUT`](https://docs.n8n.io/hosting/configuration/environment-variables/executions/)
on a self-hosted instance. And the wait runs once per input item, at the same
time, so 50 render IDs means 50 poll loops at once. Batch them, or use a
callback.

### Callback (best for long or bulk renders)

1. Add a **Webhook** node and copy its URL.
2. Paste that URL into **Callback URL** on the render operation.

Shotstack posts the finished render to that URL and the workflow continues from
the Webhook node. Nothing polls and nothing waits, so this suits a long render,
a generative render, or many at once. The URL must be publicly reachable — see
[Webhooks](https://shotstack.io/docs/guide/architecting-an-application/webhooks/).

A self-hosted n8n behind a home router or a company firewall cannot receive it.
In that case use the wait above, or the wait loop below.

### Wait loop

Use this when neither of the above fits: a render longer than 60 minutes, or an
n8n that Shotstack cannot reach.

```
Render Asset → Wait (20s) → Get Render Status → Switch on {{$json.status}}
                    ↑                              ├─ done   → Get Asset by Render ID → next step
                    │                              ├─ failed → stop, report {{$json.error}}
                    └────────── anything else ─────┘
```

**Branch on `failed`, not just `done`.** A Switch that only routes `done` back
into the Wait node loops forever on a failed render, consuming your
[rate limit](https://shotstack.io/docs/guide/architecting-an-application/limitations/)
and holding an n8n execution open. Cap the number of passes as well.

## Working with the file

Two things to plan for when you use **Download File**:

- **The node holds the whole file in memory** while the workflow runs. This
  matches n8n's own HTTP Request node. A long 4K render can be hundreds of
  megabytes. On a small n8n instance, pass the URL to the next step instead, or
  configure [binary data storage](https://docs.n8n.io/hosting/scaling/binary-data/).
- **The node fetches the URL you give it**, including one on your own network.
  This is by design: it lets you download a render from private storage. Set the
  field from a Shotstack step, not from untrusted input.

## Use with AI agents

The node is exposed as a tool, so an **AI Agent** node can call it directly.

Point an agent at **Render Asset**, or at **Render Template**. Render Template
is the safer of the two: an agent fills a handful of merge fields reliably, and
a forty-line timeline much less so. Save a template, then let the agent supply
the values. Set **Merge Fields Source** to **JSON** so it can hand over the whole
list at once.

**Merge every field, or send none.** A partial merge replaces the template's
stored list. It does not add to it. A field the agent leaves out is not filled
in from the template. Text then renders as a raw placeholder, and an image or
video placeholder fails the render. Fill any gaps from the template's own
defaults before you send. See
[Templates](https://shotstack.io/docs/guide/architecting-an-application/templates/).

## Example workflows

See the [n8n template library](https://n8n.io/workflows/?search=shotstack). Those
templates use the plain HTTP Request node, because n8n's template library accepts
built-in nodes only. The API calls are identical. This node removes the wiring.

## Compatibility

Tested against n8n 2.35. Requires Node.js 20.19 or later; n8n 2.x itself asks for
22.22 or later.

## Resources

- [Shotstack documentation](https://shotstack.io/docs/guide/)
- [Edit API reference](https://shotstack.io/docs/api/)
- [Generative AI assets](https://shotstack.io/docs/guide/generating-assets/generative-ai/)
- [Serve API](https://shotstack.io/docs/guide/serving-assets/serve-api/)
- [Shotstack CLI](https://shotstack.io/docs/guide/agents/cli/)
- [n8n community nodes](https://docs.n8n.io/integrations/#community-nodes)

## Licence

[MIT](LICENSE.md)
