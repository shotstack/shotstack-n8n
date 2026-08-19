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
	operation: ['renderFromJson'],
};

const SAMPLE_EDIT =
	'{"timeline":{"tracks":[{"clips":[{"asset":{"type":"text","text":"Hello"},"start":0,"length":4}]}]},"output":{"format":"mp4","size":{"width":1080,"height":1920}}}';

/**
 * Builds the request body from the recipe and the callback.
 *
 * Both run here rather than in routing expressions, for two reasons.
 *
 * A bad recipe must fail this item, not the whole node. An expression that
 * throws does so while n8n is still resolving parameters, before any request
 * promise exists, so Continue On Fail never sees it and renders already sent
 * for earlier items are orphaned and billed.
 *
 * A blank Callback URL must leave the recipe alone. Routing a blank value
 * writes callback: undefined over one the user set inside their own recipe,
 * and JSON.stringify then drops the key, so their webhook never fires.
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
				description:
					'Paste a Shotstack recipe, or use Render From Template if you have one saved.',
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

	const callback = String(this.getNodeParameter('callback', '') ?? '').trim();
	requestOptions.body = callback ? { ...edit, callback } : edit;
	return requestOptions;
};

export const renderFromJsonDescription: INodeProperties[] = [
	{
		displayName: 'Edit',
		name: 'edit',
		type: 'json',
		required: true,
		// Empty on purpose. A working sample here would render, and bill, on any
		// accidental execute — including a tool call from an agent that omits it.
		default: '',
		placeholder: SAMPLE_EDIT,
		typeOptions: { rows: 12 },
		displayOptions: { show: showOnly },
		description:
			'The full Shotstack recipe: a timeline of tracks and clips, plus output settings. Paste one from the docs or Studio, or use the Reference action to get one written. Keep this field in fixed mode — in expression mode n8n evaluates Shotstack merge placeholders such as {{ HEADLINE }} and replaces them with nothing.',
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
			'Shotstack posts the finished render here. Point it at an n8n Webhook node so the workflow continues on its own, instead of waiting and polling. Leave blank to keep whatever callback the recipe already sets.',
	},
];
