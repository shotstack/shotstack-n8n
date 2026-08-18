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

/**
 * Hands back everything a language model needs to write a working recipe.
 *
 * The API half is generated from Shotstack's OpenAPI file, so it cannot drift.
 * The house rules are ours, and they are the part that decides whether the
 * video looks good rather than merely renders.
 *
 * The call to /templates is not wasted: it proves the key works and it tells
 * the model which templates this account can already render.
 */
const buildReference = async function (
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const includeTemplates = this.getNodeParameter('includeTemplates', true) as boolean;

	const body = (response.body ?? {}) as IDataObject;
	const payload = (body.response ?? {}) as IDataObject;
	const templates = ((payload.templates ?? []) as IDataObject[]).map((t) => ({
		id: t.id,
		name: t.name,
	}));

	const json: IDataObject = { reference: RECIPE_REFERENCE };
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
		displayName: 'Include Templates',
		name: 'includeTemplates',
		type: 'boolean',
		default: true,
		displayOptions: { show: { ...showOnly, operation: ['get'] } },
		description:
			'Whether to list the templates saved in this account alongside the reference, so an AI can choose one instead of writing a recipe from nothing',
	},
];
