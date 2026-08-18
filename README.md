# n8n-nodes-shotstack

Render video and images from JSON, inside n8n.

[Shotstack](https://shotstack.io) is a video editing API. You describe a video as
JSON — a timeline of tracks and clips — and the API renders it and hands back a
hosted URL. This node puts that in your n8n workflows without hand-building HTTP
requests.

[n8n](https://n8n.io) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/)
workflow automation platform.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Waiting for a render](#waiting-for-a-render) · [Use with AI agents](#use-with-ai-agents) · [Example workflows](#example-workflows) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

### n8n Cloud

Search for **Shotstack** in the nodes panel and select **Install**. Verified
community nodes install without leaving the editor.

### Self-hosted

1. Go to **Settings → Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-shotstack`.
4. Agree to the risks and select **Install**.

## Credentials

You need a Shotstack API key. Create a free account at
[dashboard.shotstack.io](https://dashboard.shotstack.io) and copy a key from the
**API Keys** page.

Shotstack has two environments and **each has its own key**:

| Environment | What it does |
| --- | --- |
| **Sandbox** | Free renders. Output carries a watermark. Use this while you build. |
| **Production** | Consumes credits. No watermark. |

The credential defaults to **Sandbox**, so you can try the node before spending
anything. Switch to Production and paste the matching key when you go live.

## Operations

### Render → Render From Example

Renders a ready-made edit. **Start here** — it is the fastest way to a real
video, and it needs nothing but a key.

| Field | Notes |
| --- | --- |
| **Example** | Pick one of ten edits. |
| **Callback URL** | Optional, see [Waiting for a render](#waiting-for-a-render). |

Every one of these was rendered on the sandbox before release. Shapes and
lengths below are measured, not estimated.

| Example | Shape | Length |
| --- | --- | --- |
| Vertical Social Short (9:16) | **1080×1920 vertical** | 6s |
| Starter: Title, Image and Video | SD 16:9 | 10s |
| Photo Slideshow (Ken Burns) | HD 16:9 | 29s |
| Car Sale Slideshow | 1920×1080 | 36s |
| Car Walkaround | HD 16:9 | 13s |
| Real Estate Listing (with Merge Fields) | SD 16:9 | 36s |
| Hotel or Travel Slideshow | 1920×1080 | 30s |
| Kinetic Text | 1024×576 | 17s |
| News Summary Video | HD 16:9 | 31s |
| Health and Wellbeing Advert | **1080×1080 square** | 15s |

Nine come from Shotstack's [template library](https://shotstack.io/templates/).
The vertical one is ours — the library has no vertical example, and vertical is
the most common shape in real automation traffic.

**To change one:** run it, then switch to **Render From Edit** and paste the
JSON from that template's page in the library. The examples render as-is; they
are a starting point, not a form. Only the real estate listing carries merge
placeholders, and using them needs **Render From Template**, not this operation.

### Render → Render From Edit

Renders a video or image from a full Shotstack edit.

| Field | Notes |
| --- | --- |
| **Edit** | The whole edit: a `timeline` of tracks and clips, plus `output` settings. Paste one from the [docs](https://shotstack.io/docs/guide/) or [Studio](https://shotstack.io/studio/), or build it with an expression. |
| **Callback URL** | Optional. Shotstack posts the finished render here — see [Waiting for a render](#waiting-for-a-render). |

Returns the render `id`. The video is not ready yet.

Everything the Edit API supports works here, because the edit is passed through
untouched. That includes generative asset types such as `text-to-speech`,
`text-to-image` and `image-to-video` — they are clips inside the timeline, not
separate operations.

### Render → Render From Template

Renders a template saved in your Shotstack account, filling in its placeholders.

| Field | Notes |
| --- | --- |
| **Template ID** | From the Studio or the templates endpoint. |
| **Merge Fields** | Find/replace pairs. A placeholder written `{{ HEADLINE }}` in the template is matched by the find value `HEADLINE`. |
| **Callback URL** | Optional, as above. |

Returns the render `id`.

### Render → Get

Checks a render and returns its status.

| Field | Notes |
| --- | --- |
| **Render ID** | The id returned by any render operation. |
| **Include Submitted Edit** | Off by default. Keeps polling responses small. |
| **Simplify** | On by default. Returns `id`, `status`, `url`, `poster`, `thumbnail`, `duration`, `renderTime` and `error`. Turn it off for the full response. |

`status` moves through `queued` → `preprocessing` → `fetching` → `rendering` →
`saving` → `done`. A failed render reports `failed`, with a reason in `error`.
**Branch on `failed` as well as `done`** — see the wait loop below.

> **The `url` from this operation expires after 24 hours.** It is a direct
> storage link. For a permanent URL, use **Get Hosted Asset**.

### Render → Get Hosted Asset

Returns the permanent CDN URL for a finished render.

| Field | Notes |
| --- | --- |
| **Render ID** | The id returned by any render operation. |
| **Simplify** | On by default. Returns `id`, `renderId`, `url`, `filename`, `filesize` and `status`. |

Use this for any URL you intend to store, email, publish or hand to another
system. The URL looks like `https://cdn.shotstack.io/...` and does not expire.

Call it once the render reports `done`.

### Output shape

Shotstack wraps every response as `{ success, message, response }`. This node
unwraps it, so read `{{$json.id}}` rather than `{{$json.response.id}}`.

## Waiting for a render

Rendering takes seconds to minutes, so **Render** returns an id, not a video.
There are two ways to get the finished file. Use the first if you can.

### Callback (preferred)

1. Add a **Webhook** node and copy its URL.
2. Paste that URL into **Callback URL** on the render operation.

Shotstack posts to it when the render finishes, and the workflow continues from
the Webhook node. Nothing polls and nothing waits.

### Wait loop

Use this when the callback cannot reach you — for example a self-hosted n8n
behind a home router.

```
Shotstack (Render) → Wait (20s) → Shotstack (Get) → Switch on {{$json.status}}
                          ↑                            ├─ done   → Get Hosted Asset → next step
                          │                            ├─ failed → stop, report {{$json.error}}
                          └────────── anything else ───┘
```

**Branch on `failed`, not just `done`.** A Switch node that only routes `done`
back into the Wait node will loop forever on a failed render, burning API calls
against the rate limit and holding an n8n execution open.

Also cap the number of passes. Renders usually finish in seconds but can take
minutes, so allow roughly 30 passes at 20 seconds before giving up.

## Use with AI agents

The node is exposed as a tool, so an **AI Agent** node can call it directly.

**Point an agent at Render From Template, or at Render From Edit.** Not at
Render From Example — its dropdown cannot be driven by an expression, so an
agent handed that operation can only fire a fixed stock clip.

Render From Template usually works best. An agent fills three merge fields
reliably; a forty-line timeline much less so. Save a template, then let the
agent supply the text.

## Example workflows

See the [n8n template library](https://n8n.io/workflows/?search=shotstack).

Those templates use the plain HTTP Request node rather than this one, because
n8n's template library only accepts n8n's built-in nodes. The API calls are
identical — this node just removes the wiring.

## Compatibility

Tested against n8n 1.x. Requires Node.js 20 or later.

## Resources

- [Shotstack documentation](https://shotstack.io/docs/guide/)
- [Edit API reference](https://shotstack.io/docs/api/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Licence

[MIT](LICENSE.md)
