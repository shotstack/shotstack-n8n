# @shotstack/n8n-nodes-shotstack

Render video and images from JSON, inside n8n.

[Shotstack](https://shotstack.io/docs/guide/getting-started/core-concepts/) renders
video and images from a JSON edit and returns a hosted URL. This node puts that in
your n8n workflows.

[Installation](#installation) · [Credentials](#credentials) · [Your first render](#your-first-render) · [Operations](#operations) · [Waiting for a render](#waiting-for-a-render) · [Use with AI agents](#use-with-ai-agents) · [Resources](#resources)

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
before you spend anything. It stores which environment you picked, not an API
version, so the node keeps working when Shotstack changes one. The node sends
your key to `api.shotstack.io` and to no other host.

**One credential holds one key and one environment.** Because the two
environments have different keys, create a second credential when you are ready
for Production, and switch the node to it. If the key and the switch disagree,
Shotstack answers 403 and names the environment it expected, so **Test** on the
credential catches it before any workflow runs.

## Your first render

Three Shotstack nodes in a row. Each one reads the previous step, so only the
first needs anything typed into it.

1. **Render → Render Asset.** Paste an edit into the **Edit** field. The
   placeholder shown in the field is a working one to start from.
2. **Asset → Get Asset by Render ID.** Returns the permanent CDN URL. Render ID
   already defaults to the id from step 1. This step waits for the render and
   for Shotstack to publish the file, up to two minutes, so do not add a Wait
   node. Most renders finish well inside that.
3. **Render → Get Render Status**, only for a render longer than two minutes.
   Turn on **Wait for the Render To Finish** and put this before step 2.

Most nodes that post, email or upload take a URL, so step 2 is usually the last
Shotstack step. If a node needs the bytes, put n8n's own **HTTP Request** node
after step 2 with the URL from it and the response format set to file.

Keep the credential on Sandbox while you build. Renders are free there, and the
output carries a watermark.

For long or bulk renders, replace steps 2 and 3 with a callback — see
[Waiting for a render](#waiting-for-a-render).

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

Every operation has an entry in the spec. The node adds none of its own.

### Render → Render Asset

Renders a video or image from a Shotstack edit. It accepts any number of clips,
every asset type and the generative assets. Point an AI agent at this operation.

| Field | Notes |
| --- | --- |
| **Edit** | The edit: a `timeline` of tracks and clips, plus `output` settings. Paste one from the [docs](https://shotstack.io/docs/guide/) or [Studio](https://shotstack.io/studio/). |
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

Returns the render `id`. This operation takes no Callback URL: the Edit API
accepts one on `POST /templates/render` and does not act on it. Use
**Wait for the Render To Finish**, or render the template's edit with
**Render Asset**, which does support a callback.

### Render → Get Render Status

Checks a render and returns its status.

| Field | Notes |
| --- | --- |
| **Render ID** | The id returned by either render operation. The default reads it from the previous step. |
| **Wait for the Render To Finish** | Off by default. On, the step keeps checking until the render is done — see [Waiting for a render](#waiting-for-a-render). |
| **Give Up After (Minutes)** | Only shown when waiting. 5 by default, 10 at most. Giving up does not stop the render. |
| **Include Submitted Edit** | Off by default, so polling responses stay small. |
| **Simplify** | On by default. Returns `id`, `status`, `url`, `poster`, `thumbnail`, `duration`, `renderTime`, `error` and `data`. |

**Branch on `failed` as well as `done`** — see the wait loop below. The
[API reference](https://shotstack.io/docs/api/) lists every status value.

The `url` from this operation is a temporary storage link. For a URL you intend
to keep, use **Asset → Get Asset by Render ID**.

### Asset → Get Asset by Render ID

Returns the permanent CDN URL for a finished render.

| Field | Notes |
| --- | --- |
| **Render ID** | The id returned by either render operation. The default reads it from the previous step. |
| **Main File Only** | On by default. Off returns [every asset the render produced](https://shotstack.io/docs/guide/serving-assets/serve-api/), one item each. |
| **Simplify** | On by default. Returns `assetId`, `renderId`, `url`, `filename` and `status`. The render is `renderId` here, because `assetId` is the hosted file. |

Use this for any URL you store, email, publish or hand to another system.

**A finished render is not yet a published file.** Shotstack renders the file,
then publishes it, as two steps. The Serve API answers 404 until the second step
completes. The publish time varies, so a fixed Wait node does not fit. This
operation waits for you, up to two minutes, and names the cause if the file does
not appear. Do not add a Wait node after the render finishes.

### Output shape

This node unwraps Shotstack's response envelope, so read `{{$json.id}}`, not
`{{$json.response.id}}`.

One operation is different. **Get Asset by Render ID** returns a hosted file,
not a render, so it names the render `renderId` and the file `assetId`. Read
`{{$json.renderId}}` after that step. Both Render ID fields already do.

## Waiting for a render

Rendering is asynchronous, so the render operations return an id, not a video.
See [how long a render takes](https://shotstack.io/docs/guide/architecting-an-application/limitations/).
There are four ways to get the finished file. Start at the top.

### Do nothing (most renders)

```
Shotstack (Render Asset) → Shotstack (Get Asset by Render ID) → next step
```

**Get Asset by Render ID** waits by itself, for up to two minutes. It covers
both the render and the separate step where Shotstack publishes the file to the
CDN, so most workflows need nothing else. No Wait node, no Switch, no loop.

### Wait for the Render To Finish (renders over two minutes)

Turn on **Wait for the Render To Finish** in **Render → Get Render Status**, and
put it before Get Asset by Render ID:

```
Shotstack (Render Asset) → Shotstack (Get Render Status, waiting) → Shotstack (Get Asset by Render ID) → next step
```

A failed render stops the step and reports the reason Shotstack gave, rather
than looping.

It holds the n8n execution open while it waits. **Give Up After** bounds that,
and it allows up to 10 minutes. Nine in ten renders finish inside a minute.

Two things to plan for. Your n8n can stop an execution before Give Up After
runs out: check
[`EXECUTIONS_TIMEOUT`](https://docs.n8n.io/hosting/configuration/environment-variables/executions/)
on a self-hosted instance, and note that n8n's own `EXECUTIONS_TIMEOUT_MAX`
defaults to one hour. And every input item waits, so a batch of render IDs can
use up that hour inside a single execution. Batch them, or use a callback.

Giving up does not stop the render. Shotstack finishes it and bills it either
way, so a long render belongs on a callback rather than a longer wait.

### Callback (best for long or bulk renders)

1. Add a **Webhook** node and copy its URL.
2. Paste that URL into **Callback URL** on **Render → Render Asset**.

Shotstack posts the finished render to that URL and the workflow continues from
the Webhook node. Nothing polls and nothing waits, so this suits a long render,
a generative render, or many at once. The URL must be publicly reachable — see
[Webhooks](https://shotstack.io/docs/guide/architecting-an-application/webhooks/).

A self-hosted n8n behind a home router or a company firewall cannot receive it.
In that case use the wait above, or the wait loop below.

### Wait loop

Use this when neither of the above fits: a render longer than the 10 minute
ceiling on Give Up After, and an n8n that Shotstack cannot reach with a
callback.

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

## Use with AI agents

The node is exposed as a tool, so an **AI Agent** node can call it directly.

Point an agent at **Render Asset**, or at **Render Template**. Render Template
is the safer of the two: an agent fills a handful of merge fields reliably, and
a forty-line timeline much less so. Save a template, then let the agent supply
the values. Set **Merge Fields Source** to **JSON** so it can hand over the whole
list at once.

**Give the agent the writing rules, and this node for the render.** Shotstack
publishes what a model needs to write a valid edit: the
[full documentation](https://shotstack.io/docs/guide/llms-full.txt) as one text
file, and the
[agent skill](https://github.com/shotstack/shotstack-cli/blob/main/skills/shotstack/SKILL.md).
Link to either from the Agent node's system message, or let the agent read it
with an **HTTP Request** tool. Both stay current on their own, which a copy
inside this node would not.

**The defaults that read the previous step do not apply in tool mode.** Render
ID defaults to `{{ $json.renderId || $json.id }}`. On the canvas that reads the
previous node. When an AI Agent calls the node, `$json` is the agent's own
arguments, so the default finds nothing. Set each field the agent must supply to
`{{ $fromAI('renderId') }}` or similar, so n8n asks the model for it by name.

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

## Contributing

Found a bug? Open an issue and include the render ID. It lets Shotstack look up
the exact job instead of guessing from a description.

Do not open a public issue for a problem that could expose an API key or
someone's rendered files. Use private vulnerability reporting on the repository
Security tab, or email support@shotstack.io.

## Licence

[MIT](LICENSE.md)
