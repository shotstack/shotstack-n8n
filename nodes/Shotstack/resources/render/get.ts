import type { INodeProperties } from 'n8n-workflow';
import { requireRenderId } from './renderId';

const showOnly = {
	resource: ['render'],
	operation: ['get'],
};

export const renderGetDescription: INodeProperties[] = [
	{
		displayName: 'Render ID',
		name: 'renderId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '4a37ef85-b4d1-4b4a-90be-6515290c5091',
		displayOptions: { show: showOnly },
		description: 'The ID returned when the render was submitted',
		routing: {
			request: {
				url: '=/render/{{$value}}',
			},
			send: { preSend: [requireRenderId] },
		},
	},
	{
		displayName: 'Include Submitted Edit',
		name: 'includeData',
		type: 'boolean',
		default: false,
		displayOptions: { show: showOnly },
		description: 'Whether to also return the edit that was submitted. Leave off while polling, so the responses stay small.',
		routing: {
			request: {
				qs: {
					// Only when asked. Sending data=false on every poll is noise.
					data: '={{ $value || undefined }}',
				},
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnly },
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		routing: {
			output: {
				postReceive: [
					{
						type: 'setKeyValue',
						enabled: '={{$value}}',
						properties: {
							id: '={{$responseItem.id}}',
							status: '={{$responseItem.status}}',
							url: '={{$responseItem.url}}',
							poster: '={{$responseItem.poster}}',
							thumbnail: '={{$responseItem.thumbnail}}',
							duration: '={{$responseItem.duration}}',
							renderTime: '={{$responseItem.renderTime}}',
							error: '={{$responseItem.error}}',
						},
					},
				],
			},
		},
	},
];
