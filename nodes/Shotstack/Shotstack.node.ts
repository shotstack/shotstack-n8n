import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { renderDescription } from './resources/render';
import { assetDescription } from './resources/asset';
import { USER_AGENT } from './userAgent';
import { referenceDescription } from './resources/reference';
import { getTemplates } from './listSearch/getTemplates';

export class Shotstack implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shotstack',
		name: 'shotstack',
		icon: {
			light: 'file:../../icons/shotstack.svg',
			dark: 'file:../../icons/shotstack.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Render video and images from JSON with the Shotstack API',
		defaults: {
			name: 'Shotstack',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'shotstackApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '=https://api.shotstack.io/edit/{{$credentials.environment}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'User-Agent': USER_AGENT,
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				// Resources follow the products in Shotstack's OpenAPI spec: Render
				// and Get Render Status are the Edit API, Get Asset by Render ID is
				// the Serve API. Reference is the one addition, and it calls nothing.
				options: [
					{
						name: 'Asset',
						value: 'asset',
					},
					{
						name: 'Reference',
						value: 'reference',
					},
					{
						name: 'Render',
						value: 'render',
					},
				],
				default: 'render',
			},
			...renderDescription,
			...assetDescription,
			...referenceDescription,
		],
	};

	methods = {
		listSearch: {
			getTemplates,
		},
	};
}
