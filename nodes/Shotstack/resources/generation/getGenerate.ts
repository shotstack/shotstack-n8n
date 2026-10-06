import type { INodeProperties } from 'n8n-workflow';
import { requireGenerationId } from '../renderId';

const showOnly = {
	resource: ['generation'],
	operation: ['getGenerate'],
};

export const getGenerateDescription: INodeProperties[] = [
	{
		displayName: 'Generation ID',
		name: 'generationId',
		type: 'string',
		required: true,
		default: '={{ $json.id }}',
		placeholder: '8a1f2c3d-4e5b-5a6c-9d7e-1f2a3b4c5d6e',
		displayOptions: { show: showOnly },
		description:
			'The ID returned when the generation was submitted. The default reads it from the previous step.',
		routing: {
			request: {
				url: '=/generate/{{$value}}',
			},
			send: {
				preSend: [requireGenerationId],
			},
		},
	},
];
