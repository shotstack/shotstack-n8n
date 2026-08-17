import type { INodeProperties } from 'n8n-workflow';

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
		},
	},
	{
		displayName: 'Include Submitted Edit',
		name: 'includeData',
		type: 'boolean',
		default: false,
		displayOptions: { show: showOnly },
		description:
			'Whether to return the edit that was submitted alongside the status. Off keeps polling responses small. Shotstack is changing this default, so the node always sends it explicitly',
		routing: {
			request: {
				qs: {
					data: '={{$value}}',
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
