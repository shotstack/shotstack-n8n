import { NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
	PreSendAction,
} from 'n8n-workflow';

const showOnly = {
	resource: ['render'],
	operation: ['postRender'],
};

const SAMPLE_EDIT =
	'{"timeline":{"tracks":[{"clips":[{"asset":{"type":"rich-text","text":"Hello"},"start":0,"length":4}]}]},"output":{"format":"mp4","size":{"width":1080,"height":1920}}}';

/**
 * Builds the request body from the edit and the callback.
 *
 * Keep this out of a routing expression. An expression that throws fails the
 * whole node rather than the item, so Continue On Fail never sees it and
 * earlier renders are billed with no output. A routed blank callback also
 * overwrites one the user set inside the edit, so their webhook never fires.
 */
const buildRenderBody: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const raw = this.getNodeParameter('edit', '') as string | IDataObject;

	let edit: IDataObject;
	if (typeof raw === 'string') {
		const text = raw.trim();
		if (!text) {
			throw new NodeOperationError(this.getNode(), 'The Edit field is empty', {
				description: 'Paste a Shotstack edit, or use Render Template if you have one saved.',
				itemIndex: this.getItemIndex(),
			});
		}
		try {
			edit = JSON.parse(text) as IDataObject;
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'The Edit field is not valid JSON', {
				description: (error as Error).message,
				itemIndex: this.getItemIndex(),
			});
		}
	} else {
		edit = (raw ?? {}) as IDataObject;
	}

	// A bare string, number or array parses cleanly and then spreads into a body
	// of numbered keys, which Shotstack rejects with nothing the user can act on.
	if (edit === null || typeof edit !== 'object' || Array.isArray(edit)) {
		throw new NodeOperationError(this.getNode(), 'The Edit field is not a Shotstack edit', {
			description: `An edit is a JSON object with a timeline and an output. Got ${Array.isArray(edit) ? 'an array' : typeof edit}.`,
			itemIndex: this.getItemIndex(),
		});
	}

	// An n8n expression left in a fixed-mode field arrives here as literal text.
	// Shotstack accepts the edit, fails on the asset download, and reports a bad
	// URL, so the user looks at Shotstack rather than at their own expression.
	// This was 1,381 failed renders from n8n in 90 days.
	//
	// Match `{{ $` only. A bare `{{ HEADLINE }}` is a Shotstack merge
	// placeholder and is valid here.
	const unresolved = JSON.stringify(edit).match(/\{\{\s*\\?\$[^}]*\}\}/);
	if (unresolved) {
		throw new NodeOperationError(this.getNode(), 'The edit still contains an n8n expression', {
			description: `Shotstack would receive ${unresolved[0]} as literal text and fail to fetch it. The Edit field is in fixed mode, so n8n did not evaluate it. Build the edit in an earlier step and reference it once, or switch the field to expression mode. A Shotstack merge placeholder such as {{ HEADLINE }} is fine and does not trigger this.`,
			itemIndex: this.getItemIndex(),
		});
	}

	const callback = String(this.getNodeParameter('callback', '') ?? '').trim();
	requestOptions.body = callback ? { ...edit, callback } : edit;
	return requestOptions;
};

export const postRenderDescription: INodeProperties[] = [
	{
		displayName: 'Edit',
		name: 'edit',
		type: 'json',
		required: true,
		// Empty on purpose. A sample here would render, and bill, on an accidental
		// execute, including a tool call from an agent that omits the field.
		default: '',
		placeholder: SAMPLE_EDIT,
		typeOptions: { rows: 12 },
		displayOptions: { show: showOnly },
		description:
			'The Shotstack edit: a timeline of tracks and clips, plus output settings. Paste one from the docs or Studio, or have an AI write one from the Shotstack guide. Keep this field in fixed mode. In expression mode, n8n evaluates Shotstack merge placeholders such as {{ HEADLINE }} and removes them.',
		routing: {
			send: { preSend: [buildRenderBody] },
		},
	},
	{
		displayName: 'Callback URL',
		name: 'callback',
		type: 'string',
		default: '',
		placeholder: 'https://your-n8n/webhook/shotstack-done',
		displayOptions: { show: showOnly },
		description:
			'Shotstack posts the finished render here. Point it at an n8n Webhook node so the workflow continues on its own, instead of waiting and polling. Leave blank to keep whatever callback the edit already sets.',
	},
];
