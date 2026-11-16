import { NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
	PreSendAction,
} from 'n8n-workflow';
import { templateMerge } from '../../resourceMapping/getTemplateFields';

const showOnly = {
	resource: ['render'],
	operation: ['postTemplateRender'],
};

/**
 * A value in the JSON type of the template's own value. Shotstack keeps each
 * value's type, so a sheet's "5" fills a number placeholder as 5, and a number
 * fills a text placeholder as text.
 */
const likeTemplate = (value: unknown, templateValue: unknown): unknown => {
	if (typeof templateValue === 'number' && typeof value === 'string' && Number.isFinite(Number(value))) {
		return Number(value);
	}
	if (typeof templateValue === 'string' && (typeof value === 'number' || typeof value === 'boolean')) {
		return String(value);
	}
	return value;
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

	if (source === 'template') {
		// Built from the template as it is now. Shotstack does not fill gaps, so a
		// field left empty, or added in Studio after this step was set up, goes out
		// with the template's own value instead of as a raw placeholder.
		// skipValidation: n8n would otherwise refuse "9" for a number, or an emptied
		// field, before likeTemplate gets to convert it.
		const id = this.getNodeParameter('templateId', '', { extractValue: true }) as string;
		const given = ((this.getNodeParameter('templateFields.mappingMode', 'defineBelow') === 'autoMapInputData'
			? this.getInputData().json
			: this.getNodeParameter('templateFields.value', {}, { skipValidation: true })) ?? {}) as IDataObject;
		merge = (id ? await templateMerge.call(this, id) : []).map(({ find, replace }) => {
			const value = given[find];
			const empty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
			return { find, replace: empty ? replace : likeTemplate(value, replace) };
		});
	} else if (source === 'json') {
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

const mergeSourceV1: INodeProperties = {
	displayName: 'Merge Fields Source',
	name: 'mergeSource',
	type: 'options',
	noDataExpression: true,
	default: 'fields',
	displayOptions: { show: { ...showOnly, '@version': [1] } },
	description:
		"Whether to fill in the chosen template's own fields, type each placeholder yourself, or hand over a ready-made list. Choose JSON when an earlier step or an AI agent builds the list.",
	options: [
		{
			name: 'From Template',
			value: 'template',
			description: "Load the chosen template's merge fields and fill in each one",
		},
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
	mergeSourceV1,
	// A new default needs a new version: n8n leaves a default value out of a saved workflow,
	// so changing version 1's default would switch every saved step to the new source.
	{ ...mergeSourceV1, default: 'template', displayOptions: { show: { ...showOnly, '@version': [2] } } },
	{
		displayName: 'Merge Fields',
		name: 'templateFields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		displayOptions: { show: { ...showOnly, mergeSource: ['template'] } },
		description:
			"The chosen template's merge fields. Leave one empty to keep the template's own value.",
		typeOptions: {
			loadOptionsDependsOn: ['templateId.value'],
			resourceMapper: {
				resourceMapperMethod: 'getTemplateFields',
				mode: 'add',
				fieldWords: { singular: 'merge field', plural: 'merge fields' },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: true,
				noFieldsError: 'No merge fields yet. Pick a template above, or add placeholders to it in Shotstack Studio.',
			},
		},
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
