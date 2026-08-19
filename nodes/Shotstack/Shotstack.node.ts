import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { renderDescription } from './resources/render';
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
				// Names this node in Shotstack's render log. A plain HTTP Request node
				// reports a bare "n8n", so keep this string different from that.
				'User-Agent': 'shotstack-n8n-node/0.1.0',
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
