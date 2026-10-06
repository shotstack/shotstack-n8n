import type { INodeProperties } from 'n8n-workflow';
import { postGenerateDescription } from './postGenerate';
import { getGenerateDescription } from './getGenerate';

const showOnlyForGenerate = {
	resource: ['generate'],
};

// Operation names and values come from Shotstack's OpenAPI spec: the display
// name is the operation summary, the value is the operationId.
//
// None of these answers is wrapped in { success, message, response }, so unlike
// the render operations none of them unwraps anything. List Generation Models
// is the one exception: its answer is an object holding the array, and n8n
// should hand back one item per model.
export const generateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForGenerate },
		options: [
			{
				name: 'Generate Asset',
				value: 'postGenerate',
				description:
					'Generate a single image, video or audio file from a text prompt, without rendering a whole edit. Use the URL it returns as an asset in a later render.',
				action: 'Generate an AI asset from a prompt',
				routing: {
					request: {
						method: 'POST',
						url: '/generate',
					},
				},
			},
			{
				name: 'Get Generation Status',
				value: 'getGenerate',
				description: 'Check a generation that was submitted earlier and get its URL',
				action: 'Get the status of a generation',
				routing: {
					request: {
						method: 'GET',
					},
				},
			},
			{
				name: 'List Generation Models',
				value: 'getModels',
				description:
					'List the models this account can generate with, and the options each one accepts. Point an AI agent here before it generates anything.',
				action: 'List the available generation models',
				routing: {
					request: {
						method: 'GET',
						url: '/models',
						// Always ask for the option schemas. A model list without them
						// only answers half the question, and an agent that has to call
						// twice usually calls once and guesses.
						qs: { expand: 'options' },
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: { property: 'models' },
							},
						],
					},
				},
			},
			{
				name: 'Quote Generation',
				value: 'postGenerateQuote',
				description:
					'Estimate the credits a generation would cost. Spends nothing and starts no job.',
				action: 'Quote the credits for a generation',
				routing: {
					request: {
						method: 'POST',
						url: '/generate/quote',
					},
				},
			},
		],
		default: 'postGenerate',
	},
	...postGenerateDescription,
	...getGenerateDescription,
];
