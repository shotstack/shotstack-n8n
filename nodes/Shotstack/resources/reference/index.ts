import type {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { RECIPE_REFERENCE } from '../../reference/recipeReference';

const showOnly = {
	resource: ['reference'],
};

// Shotstack's whole guide as plain text, written for language models.
const FULL_DOCS_URL = 'https://shotstack.io/docs/guide/llms-full.txt';

/**
 * Builds the answer a language model needs to write a working recipe.
 *
 * The request behind it is a real call to /templates. That proves the key
 * works, and it names the templates this account can already render.
 */
const buildReference = async function (
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const includeTemplates = this.getNodeParameter('includeTemplates', true) as boolean;
	const detail = this.getNodeParameter('detail', 'compact') as string;

	const body = (response.body ?? {}) as IDataObject;
	const payload = (body.response ?? {}) as IDataObject;
	const templates = ((payload.templates ?? []) as IDataObject[]).map((t) => ({
		id: t.id,
		name: t.name,
	}));

	const json: IDataObject = { reference: RECIPE_REFERENCE };

	if (detail === 'full') {
		try {
			// Fetched, not embedded, so it stays current.
			const docs = (await this.helpers.httpRequest({
				method: 'GET',
				url: FULL_DOCS_URL,
				json: false,
			})) as string;
			json.documentation = docs;
			json.documentationChars = String(docs).length;
		} catch {
			// The reference alone is still useful. Report the gap, do not fail.
			json.documentation = '';
			json.documentationError = `Could not reach ${FULL_DOCS_URL}. The compact reference above is still complete for asset types and allowed values.`;
		}
	}

	if (includeTemplates) {
		json.templates = templates;
		json.templateCount = templates.length;
	}
	return [{ json }];
};

export const referenceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnly },
		options: [
			{
				name: 'Get',
				value: 'get',
				description:
					'Get the recipe reference: every asset type, every allowed value, and the rules that make a render look good. Give this to an AI before asking it to write a recipe.',
				action: 'Get the recipe reference',
				routing: {
					request: {
						method: 'GET',
						url: '/templates',
					},
					output: { postReceive: [buildReference] },
				},
			},
		],
		default: 'get',
	},
	{
		displayName: 'Detail',
		name: 'detail',
		type: 'options',
		default: 'compact',
		displayOptions: { show: { ...showOnly, operation: ['get'] } },
		description:
			'How much to hand the model. Compact is enough to write a valid recipe. Full adds Shotstack\'s whole guide, which teaches by example but is large',
		options: [
			{
				name: 'Compact',
				value: 'compact',
				description: 'About 6,700 characters. Every asset type, every allowed value, and the house rules.',
			},
			{
				name: 'Full',
				value: 'full',
				description:
					"Adds Shotstack's guide for language models, about 271,000 characters with 213 worked examples. Use with a model that has a large context window.",
			},
		],
	},
	{
		displayName: 'Include Templates',
		name: 'includeTemplates',
		type: 'boolean',
		default: true,
		displayOptions: { show: { ...showOnly, operation: ['get'] } },
		description:
			'Whether to list the templates saved in this account alongside the reference, so an AI can choose one instead of writing a recipe from nothing',
	},
];
