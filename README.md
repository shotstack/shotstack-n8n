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

Checks a render and returns the finished video URL once it is done.

| Field | Notes |
| --- | --- |
| **Render ID** | The id returned by either render operation. |
| **Simplify Output** | On by default. Returns `id`, `status`, `url` and `error`. Turn it off for the full response. |

`status` moves through `queued` → `fetching` → `rendering` → `saving` → `done`.
A failed render reports `failed` with a reason in `error`.

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
Shotstack (Render)  →  Wait (20s)  →  Shotstack (Get)  →  If  status = done
                            ↑                               │
                            └───────── false ───────────────┘
                                                            └── true → next step
```

Cap the loop so a failed render cannot spin forever. Ten passes at 20 seconds
covers most renders.

## Use with AI agents

The node is exposed as a tool, so an **AI Agent** node can call it directly.

**Render From Template** works better than **Render From Edit** for agents. An
agent fills three merge fields reliably; a forty-line timeline much less so.
Save a template, then let the agent supply the text.

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
