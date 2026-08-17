import type { INodeProperties } from 'n8n-workflow';
import { renderFromJsonDescription } from './renderFromJson';
import { renderFromTemplateDescription } from './renderFromTemplate';
import { renderGetDescription } from './get';

const showOnlyForRender = {
	resource: ['render'],
};

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
				},
			},
		],
		default: 'renderFromJson',
	},
	...renderFromJsonDescription,
	...renderFromTemplateDescription,
	...renderGetDescription,
];
