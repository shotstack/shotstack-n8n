import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { renderDescription } from './resources/render';
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
				options: [
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
			...referenceDescription,
		],
	};

	methods = {
		listSearch: {
			getTemplates,
		},
	};
}
