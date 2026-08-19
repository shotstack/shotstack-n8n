# @shotstack/n8n-nodes-shotstack

Render video and images from JSON, inside n8n.

[Shotstack](https://shotstack.io) is a video editing API. You describe a video as
JSON — a timeline of tracks and clips — and the API renders it and hands back a
hosted URL. This node puts that in your n8n workflows without hand-building HTTP
requests.

[n8n](https://n8n.io) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/)
workflow automation platform.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Waiting for a render](#waiting-for-a-render) · [Use with AI agents](#use-with-ai-agents) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

### Self-hosted

1. Go to **Settings → Community Nodes**.
2. Select **Install**.
3. Enter `@shotstack/n8n-nodes-shotstack`.
4. Agree to the risks and select **Install**.

### n8n Cloud

Not yet. Cloud only installs nodes n8n has **verified**, which is a separate
review that starts after a package is on npm. Until that review passes, this
node is self-hosted only.

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

### Reference → Get

Hands back everything a language model needs to write a working recipe. **Call
this before asking an AI to build a video.**

| Field | Notes |
| --- | --- |
| **Detail** | `Compact` (default) or `Full`. See below. |
| **Include Templates** | On by default. Adds this account's templates, so an AI can pick one instead of writing a recipe from nothing. |

Returns `reference`, a single string of about 13,700 characters holding every
asset type with its nested shape, every allowed value, and the rules that decide
whether a render looks good rather than merely succeeds.

The API half is generated from Shotstack's OpenAPI file by
`scripts/build-reference.mjs`, so it cannot drift. The house rules beside it are
in `scripts/house-rules.txt` and follow Shotstack's own agent skill.

To check a recipe before you render it, without an API key and without spending
credits:

```bash
npm install -g @shotstack/cli
shotstack validate recipe.json
```

**Detail: Full** also fetches
[Shotstack's guide for language models](https://shotstack.io/docs/guide/llms-full.txt),
about 271,000 characters with 213 worked examples. The two cover different
ground: the guide teaches by example, the compact reference is the exhaustive
list of allowed values. Effect names, transition names and the file-extension
lists appear only in the compact half.

Use Full with a model that has a large context window. If the fetch fails the
step still succeeds, with `documentationError` explaining what is missing.



### Render → Render From Recipe (Best for AI)

Renders a whole video recipe. **The only operation with no ceiling** — any
number of clips, any asset type, and the generative assets. This is the one to
point an AI agent at.

| Field | Notes |
| --- | --- |
| **Edit** | The whole recipe: a `timeline` of tracks and clips, plus `output` settings. Paste one from the [docs](https://shotstack.io/docs/guide/) or [Studio](https://shotstack.io/studio/), or build it with an expression. |
| **Callback URL** | Optional. Shotstack posts the finished render here — see [Waiting for a render](#waiting-for-a-render). |

A recipe can also contain Shotstack's generative assets, which a template
cannot add on its own:

| Asset type | You give | You get |
| --- | --- | --- |
| `text-to-image` | a prompt | an image |
| `image-to-video` | an image and a prompt | that image, moving |
| `text-to-speech` | text and a voice | narration |

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
| **Wait For The Render To Finish** | Off by default. On, the step keeps checking until the render is done — see [Waiting for a render](#waiting-for-a-render). |
| **Give Up After (Minutes)** | Only shown when waiting. 10 by default. |
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
| **Main File Only** | On by default. A render hosts the video **and** a poster and a thumbnail, as separate files. Off returns all of them, one item each. |
| **Simplify** | On by default. Returns `id`, `renderId`, `url`, `filename`, `filesize` and `status`. |

Use this for any URL you intend to store, email, publish or hand to another
system. The URL looks like `https://cdn.shotstack.io/...` and does not expire.

Call it once the render reports `done`.

**A finished render is not yet a published file.** Shotstack renders and then
publishes, as two separate steps, and until the second one finishes the Serve
API answers 404. The gap is not a fixed length — one measurement was 7 seconds,
another was over 23 — so no Wait node can be set to a number that always works.
This operation waits for you, up to two minutes, and reports the real cause if
the file never appears. Add no Wait after the render finishes.

### Render → Download Video

Fetches the finished video as a **file**, so the next node can attach it to an
email, upload it to Drive or push it anywhere that needs the actual bytes.

| Field | Notes |
| --- | --- |
| **Video URL** | Defaults to `{{ $json.url }}`, so placing this straight after **Get Hosted Asset** needs no setup. |
| **File Name** | Optional. Leave blank to keep Shotstack's name. |

Most posting nodes accept a URL and do not need this. Use it when the next step
needs the file itself.

Two limits worth knowing:

- **The whole file is held in memory** while the workflow runs, the same way
  n8n's own HTTP Request node handles binary data. A long 4K render can be
  hundreds of megabytes. On a small n8n instance, pass the URL on instead.
- **It fetches whatever URL you give it**, including one on your own network.
  That is deliberate — it is how you download a render from private storage —
  but it means the field should come from a Shotstack step, not from untrusted
  input. Your API key is never sent anywhere except `api.shotstack.io`.

### Output shape

Shotstack wraps every response as `{ success, message, response }`. This node
unwraps it, so read `{{$json.id}}` rather than `{{$json.response.id}}`.

## Waiting for a render

Rendering takes seconds to minutes, so **Render** returns an id, not a video.
There are three ways to get the finished file.

### Wait For The Render To Finish (simplest)

Turn on **Wait For The Render To Finish** in **Render → Get**. The step keeps
checking until the render is done, then returns it:

```
Shotstack (Render) → Shotstack (Get, waiting) → Shotstack (Get Hosted Asset) → next step
```

No Wait node, no Switch, no loop. A failed render stops the step and reports the
reason Shotstack gave, rather than looping forever.

It holds the n8n execution open while it waits, so use **Give Up After** to bound
it — 10 minutes by default, 60 at most.

Two things to watch. Your n8n may stop an execution before that: check
`EXECUTIONS_TIMEOUT` on a self-hosted instance. And the wait runs **once per
input item, at the same time** — 50 render IDs means 50 poll loops at once, so
batch them or use a callback instead.

### Callback (best for long or bulk renders)

1. Add a **Webhook** node and copy its URL.
2. Paste that URL into **Callback URL** on the render operation.

Shotstack posts to it when the render finishes, and the workflow continues from
the Webhook node. Nothing polls and nothing waits, so this is the one to use for
a long render, a generative render, or many at once.

**Shotstack must be able to reach that URL.** A self-hosted n8n behind a home
router or a company firewall cannot receive it. If that is you, use the wait
above, or the wait loop below for a render longer than 60 minutes.

### Wait loop

Use this when neither of the above fits: a render longer than 60 minutes, or an
n8n that Shotstack cannot reach.

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

**Point an agent at Render From Recipe, or at Render From Template.**

Render From Template is the safer of the two. An agent fills a handful of merge
fields reliably; a forty-line timeline much less so. Save a template, then let
the agent supply the values.

For that path, set **Merge Fields Source** to **JSON** so the agent can hand
over the whole list at once.

**Merge every field, or send none.** A partial merge replaces the template's
stored list rather than adding to it, so a field the agent leaves out is not
filled in from the template — text renders as a raw placeholder, and an image
or video placeholder fails the render. Fill any gaps from the template's own
defaults before you send.

## Example workflows

See the [n8n template library](https://n8n.io/workflows/?search=shotstack).

Those templates use the plain HTTP Request node rather than this one, because
n8n's template library only accepts n8n's built-in nodes. The API calls are
identical — this node just removes the wiring.

## Compatibility

Tested against n8n 2.35. Requires Node.js 20.19 or later; n8n 2.x itself asks for 22.22 or later.

## Resources

- [Shotstack documentation](https://shotstack.io/docs/guide/)
- [Edit API reference](https://shotstack.io/docs/api/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Licence

[MIT](LICENSE.md)
