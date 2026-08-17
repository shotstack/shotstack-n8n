import type { INodeProperties, PostReceiveAction } from 'n8n-workflow';
import { renderFromJsonDescription } from './renderFromJson';
import { renderFromTemplateDescription } from './renderFromTemplate';
import { renderGetDescription } from './get';

const showOnlyForRender = {
	resource: ['render'],
};

// Every Shotstack response is wrapped as { success, message, response }.
// Unwrapping it lets workflows read {{$json.id}} rather than {{$json.response.id}}.
const unwrapResponse: PostReceiveAction[] = [
	{
		type: 'rootProperty',
		properties: { property: 'response' },
	},
];

export const renderDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForRender },
		options: [
			{
				name: 'Render From Edit',
				value: 'renderFromJson',
				description: 'Render a video from a full Shotstack edit',
				action: 'Render a video from an edit',
				routing: {
					request: {
						method: 'POST',
						url: '/render',
					},
					output: { postReceive: unwrapResponse },
				},
			},
			{
				name: 'Render From Template',
				value: 'renderFromTemplate',
				description: 'Render a saved template, filling in its placeholders',
				action: 'Render a video from a template',
				routing: {
					request: {
						method: 'POST',
						url: '/templates/render',
					},
					output: { postReceive: unwrapResponse },
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Check the status of a render and get the finished video URL',
				action: 'Get a render',
				routing: {
					request: {
						method: 'GET',
					},
					output: { postReceive: unwrapResponse },
				},
			},
		],
		default: 'renderFromJson',
	},
	...renderFromJsonDescription,
	...renderFromTemplateDescription,
	...renderGetDescription,
];
