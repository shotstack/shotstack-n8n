import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { renderDescription } from './resources/render';
import { assetDescription } from './resources/asset';
import { USER_AGENT } from './userAgent';
import { EDIT_BASE_URL } from './environment';
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
		// The operation values are OpenAPI operationIds, so the resource tells
		// the reader which of the three a bare id belongs to.
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
			baseURL: EDIT_BASE_URL,
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
				// Resources follow the products in Shotstack's OpenAPI spec. Render
				// and Get Render Status are the Edit API. Get Asset by Render ID is
				// the Serve API. Every operation here has an entry in the spec.
				options: [
					{
						name: 'Asset',
						value: 'asset',
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
		],
	};

	methods = {
		listSearch: {
			getTemplates,
		},
	};
}
