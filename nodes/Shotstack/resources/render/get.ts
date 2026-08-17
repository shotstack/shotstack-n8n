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
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnly },
		description:
			'Whether to return only the fields most workflows need: the ID, the status, the finished video URL and any error. Turn this off to get the full response',
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
							error: '={{$responseItem.error}}',
						},
					},
				],
			},
		},
	},
];
