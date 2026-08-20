import type { INodeProperties, PostReceiveAction } from 'n8n-workflow';
import { getAssetByRenderIdDescription } from './getAssetByRenderId';
import { downloadDescription } from './download';

const showOnlyForAsset = {
	resource: ['asset'],
};

// The Serve API uses a different envelope from the Edit API: { data: [...] }.
const unwrapServeData: PostReceiveAction[] = [
	{
		type: 'rootProperty',
		properties: { property: 'data' },
	},
];

// Get Asset by Render ID takes its name and value from Shotstack's OpenAPI
// spec. Download File has no matching operation: no Shotstack endpoint returns
// the bytes, so it fetches the hosted URL. Its name says file, not video,
// because a render can be an image.
export const assetDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForAsset },
		options: [
			{
				name: 'Download File',
				value: 'download',
				description:
					'Fetch a hosted file as binary data, so the next step can attach or upload it. Not an API operation: it reads the URL a previous step produced.',
				action: 'Download file',
				routing: {
					request: {
						method: 'GET',
					},
				},
			},
			{
				name: 'Get Asset by Render ID',
				value: 'getAssetByRenderId',
				description: 'Get the permanent CDN URL for a finished render',
				action: 'Get asset by render ID',
				routing: {
					request: {
						method: 'GET',
					},
					output: { postReceive: unwrapServeData },
				},
			},
		],
		default: 'getAssetByRenderId',
	},
	...getAssetByRenderIdDescription,
	...downloadDescription,
];
