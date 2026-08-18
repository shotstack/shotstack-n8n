import type { INodeProperties, PostReceiveAction } from 'n8n-workflow';
import { renderFromExampleDescription } from './renderFromExample';
import { renderFromJsonDescription } from './renderFromJson';
import { renderFromTemplateDescription } from './renderFromTemplate';
import { renderGetDescription } from './get';
import { renderGetAssetsDescription } from './getAssets';
import { renderDownloadDescription } from './download';

const showOnlyForRender = {
	resource: ['render'],
};

// Every Edit API response is wrapped as { success, message, response }.
// Unwrapping it lets workflows read {{$json.id}} rather than {{$json.response.id}}.
const unwrapResponse: PostReceiveAction[] = [
	{
		type: 'rootProperty',
		properties: { property: 'response' },
	},
];

// The Serve API uses a different envelope: { data: [ { type, attributes } ] }.
const unwrapServeData: PostReceiveAction[] = [
	{
		type: 'rootProperty',
		properties: { property: 'data' },
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
				name: 'Render From Example',
				value: 'renderFromExample',
				description: 'Render a ready-made edit. The quickest way to a real video.',
				action: 'Render a video from an example',
				routing: {
					request: {
						method: 'POST',
						url: '/render',
					},
					output: { postReceive: unwrapResponse },
				},
			},
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
				description: 'Check the status of a render. Returns a temporary URL that expires.',
				action: 'Get a render',
				routing: {
					request: {
						method: 'GET',
					},
					output: { postReceive: unwrapResponse },
				},
			},
			{
				name: 'Download Video',
				value: 'download',
				description: 'Fetch the finished video as a file, ready for the next step',
				action: 'Download the video file',
				routing: {
					request: {
						method: 'GET',
					},
				},
			},
			{
				name: 'Get Hosted Asset',
				value: 'getAssets',
				description: 'Get the permanent CDN URL for a finished render',
				action: 'Get the hosted asset for a render',
				routing: {
					request: {
						method: 'GET',
					},
					output: { postReceive: unwrapServeData },
				},
			},
		],
		default: 'renderFromExample',
	},
	...renderFromExampleDescription,
	...renderFromJsonDescription,
	...renderFromTemplateDescription,
	...renderGetDescription,
	...renderGetAssetsDescription,
	...renderDownloadDescription,
];
