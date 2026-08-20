import type { INodeProperties, PostReceiveAction } from 'n8n-workflow';
import { postRenderDescription } from './postRender';
import { postTemplateRenderDescription } from './postTemplateRender';
import { getRenderDescription } from './getRender';

const showOnlyForRender = {
	resource: ['render'],
};

// Every Edit API response is wrapped as { success, message, response }.
// Unwrapping it lets workflows read {{$json.id}} rather than {{$json.response.id}}.
export const unwrapResponse: PostReceiveAction[] = [
	{
		type: 'rootProperty',
		properties: { property: 'response' },
	},
];

// Operation names and values come from Shotstack's OpenAPI spec: the display
// name is the operation summary, the value is the operationId. A reader of the
// API reference can then guess this dropdown, and the reverse.
export const renderDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForRender },
		options: [
			{
				name: 'Render Asset',
				value: 'postRender',
				description:
					'Render a video or image from a Shotstack edit. This is the general render method. It accepts any number of clips, every asset type and the generative assets. Point an AI agent here.',
				action: 'Render a video or image from an edit',
				routing: {
					request: {
						method: 'POST',
						url: '/render',
					},
					output: { postReceive: unwrapResponse },
				},
			},
			{
				name: 'Render Template',
				value: 'postTemplateRender',
				description: 'Render a saved template, filling in its placeholders',
				action: 'Render a video or image from a saved template',
				routing: {
					request: {
						method: 'POST',
						url: '/templates/render',
					},
					output: { postReceive: unwrapResponse },
				},
			},
			{
				name: 'Get Render Status',
				value: 'getRender',
				description:
					'Check the status of a render and get its temporary URL. Use Asset → Get Asset by Render ID for the permanent URL.',
				action: 'Get the status of a render',
				routing: {
					request: {
						method: 'GET',
					},
					output: { postReceive: unwrapResponse },
				},
			},
		],
		default: 'postRender',
	},
	...postRenderDescription,
	...postTemplateRenderDescription,
	...getRenderDescription,
];
