import type { INodeProperties } from 'n8n-workflow';

const showOnly = {
	resource: ['render'],
	operation: ['getAssets'],
};

export const renderGetAssetsDescription: INodeProperties[] = [
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
				// The hosted asset lives behind the Serve API, which sits on a
				// different base path from the Edit API, so override baseURL here.
				baseURL: '=https://api.shotstack.io/serve/{{$credentials.environment}}',
				url: '=/assets/render/{{$value}}',
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
							id: '={{$responseItem.attributes?.id}}',
							renderId: '={{$responseItem.attributes?.renderId}}',
							url: '={{$responseItem.attributes?.url}}',
							filename: '={{$responseItem.attributes?.filename}}',
							filesize: '={{$responseItem.attributes?.filesize}}',
							status: '={{$responseItem.attributes?.status}}',
						},
					},
				],
			},
		},
	},
];
