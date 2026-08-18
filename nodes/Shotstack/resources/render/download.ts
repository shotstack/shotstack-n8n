import type { INodeProperties } from 'n8n-workflow';

const showOnly = {
	resource: ['render'],
	operation: ['download'],
};

export const renderDownloadDescription: INodeProperties[] = [
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		required: true,
		default: '={{ $json.url }}',
		placeholder: 'https://cdn.shotstack.io/...',
		displayOptions: { show: showOnly },
		description: 'The link to the finished video. The default reads the URL from the previous step, so putting this straight after Get Hosted Asset needs no setup.',
		routing: {
			request: {
				// The file is fetched from wherever it is hosted, not from the Edit
				// API, so the node's base URL and API key do not apply here.
				baseURL: '',
				url: '={{ $value }}',
				method: 'GET',
				// Ask for raw bytes rather than parsed JSON.
				encoding: 'arraybuffer',
				json: false,
				skipSslCertificateValidation: false,
			},
			output: {
				postReceive: [
					{
						type: 'binaryData',
						properties: {
							destinationProperty: '=data',
						},
					},
				],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		placeholder: 'my-video.mp4',
		displayOptions: { show: showOnly },
		description: 'Name to give the downloaded file. Leave blank to keep the name Shotstack generated.',
	},
];
