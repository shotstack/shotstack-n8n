import type { INodeProperties, PostReceiveAction } from 'n8n-workflow';
import { getAssetByRenderIdDescription } from './getAssetByRenderId';

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

// Name and value come from Shotstack's OpenAPI spec: the display name is the
// operation summary, the value is the operationId.
export const assetDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForAsset },
		options: [
			{
				name: 'Get Asset by Render ID',
				value: 'getAssetByRenderId',
				description: 'Get the permanent CDN URL for a finished render',
				action: 'Get the hosted file for a render',
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
];
