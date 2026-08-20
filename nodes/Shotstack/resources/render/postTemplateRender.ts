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
	operation: ['postTemplateRender'],
};

/**
 * Puts the merge list on the body, from whichever source the user chose.
 *
 * Keep this out of a routing expression. parseJson throws there, and an
 * expression that throws fails the whole node rather than the item, so
 * Continue On Fail never sees it and earlier renders are billed with no
 * output. A blank JSON field is the common way in: the field's own default
 * is an empty string.
 */
const buildMerge: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const source = this.getNodeParameter('mergeSource', 'fields') as string;
	const body = (requestOptions.body ?? {}) as IDataObject;
	let merge: unknown;

	if (source === 'json') {
		const raw = this.getNodeParameter('mergeJson', '') as string | unknown[];
		if (typeof raw === 'string') {
			const text = raw.trim();
			if (text) {
				try {
					merge = JSON.parse(text);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), 'Merge Fields (JSON) is not valid JSON', {
						description: `${(error as Error).message}. Expected [{"find": "HEADLINE", "replace": "Hello"}].`,
						itemIndex: this.getItemIndex(),
					});
				}
			}
		} else {
			merge = raw;
		}
	} else {
		const typed = this.getNodeParameter('merge', {}) as unknown;
		if (Array.isArray(typed)) {
			merge = typed;
		} else if (typeof typed === 'string') {
			// An expression or an AI agent can put the whole list here as text.
			// Dropping it silently renders the template with raw placeholders.
			const text = typed.trim();
			if (text) {
				try {
					merge = JSON.parse(text);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), 'Merge Fields is not valid JSON', {
						description: `${(error as Error).message}. Expected [{"find": "HEADLINE", "replace": "Hello"}].`,
						itemIndex: this.getItemIndex(),
					});
				}
			}
		} else if (typed && typeof typed === 'object') {
			const object = typed as IDataObject;
			if (object.mergeFields !== undefined) {
				merge = object.mergeFields as unknown[];
			} else if (object.find !== undefined) {
				// A bare { find, replace } instead of a list of them.
				merge = [object];
			} else if (Object.keys(object).length > 0) {
				merge = object;
			}
		}
	}

	if (merge === null) {
		throw new NodeOperationError(this.getNode(), 'Merge fields must be a list', {
			description: 'Expected [{"find": "HEADLINE", "replace": "Hello"}] and got null.',
			itemIndex: this.getItemIndex(),
		});
	}

	if (merge !== undefined && !Array.isArray(merge)) {
		throw new NodeOperationError(this.getNode(), 'Merge fields must be a list', {
			description: `Expected [{"find": "HEADLINE", "replace": "Hello"}] and got ${typeof merge}.`,
			itemIndex: this.getItemIndex(),
		});
	}

	// Leave the key out of an empty body rather than sending [].
	if (Array.isArray(merge) && merge.length > 0) body.merge = merge;
	requestOptions.body = body;
	return requestOptions;
};

export const postTemplateRenderDescription: INodeProperties[] = [
	{
		displayName: 'Template',
		name: 'templateId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: showOnly },
		description:
			'A template saved in your Shotstack account. Pick one from the list, or paste an ID. Create templates in Shotstack Studio',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a template…',
				typeOptions: {
					searchListMethod: 'getTemplates',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '980b66a0-6eb0-4454-81e2-01adbb0fac1f',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
							errorMessage: 'Not a valid Shotstack template ID',
						},
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'id',
				value: '={{ $value }}',
				preSend: [buildMerge],
			},
		},
	},
	{
		displayName: 'Merge Fields Source',
		name: 'mergeSource',
		type: 'options',
		noDataExpression: true,
		default: 'fields',
		displayOptions: { show: showOnly },
		description:
			'Whether to fill the placeholders one at a time, or hand over a ready-made list. Choose JSON when an earlier step or an AI agent builds the list.',
		options: [
			{
				name: 'Fields',
				value: 'fields',
				description: 'Type each placeholder and its value',
			},
			{
				name: 'JSON',
				value: 'json',
				description: 'Supply the whole list as [{"find":"NAME","replace":"value"}]',
			},
		],
	},
	{
		displayName: 'Merge Fields (JSON)',
		name: 'mergeJson',
		type: 'json',
		default: '',
		placeholder: '[{"find": "HEADLINE", "replace": "Hello"}]',
		displayOptions: { show: { ...showOnly, mergeSource: ['json'] } },
		description:
			'A list of find and replace pairs. Send every placeholder the template declares — one you leave out is not filled in from the template, it stays as raw text, and an image or video placeholder then fails the render.',
	},
	{
		displayName: 'Merge Fields',
		name: 'merge',
		placeholder: 'Add Merge Field',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		displayOptions: { show: { ...showOnly, mergeSource: ['fields'] } },
		description: 'Replaces placeholders in the template. A template placeholder written as {{ HEADLINE }} is matched by the find value HEADLINE.',
		options: [
			{
				displayName: 'Merge Field',
				name: 'mergeFields',
				values: [
					{
						displayName: 'Find',
						name: 'find',
						type: 'string',
						required: true,
						default: '',
						description: 'The placeholder name, without the braces',
					},
					{
						displayName: 'Replace',
						name: 'replace',
						type: 'string',
						required: true,
						default: '',
						description: 'The value to put in its place. Shotstack accepts any JSON type here, so for a number or a boolean use an expression such as {{ 4 }} rather than typing 4 as text — a template placeholder for a clip length or volume needs a real number.',
					},
				],
			},
		],
	},
];
