import type { INodeProperties } from 'n8n-workflow';

const showOnly = {
	resource: ['render'],
	operation: ['renderFromTemplate'],
};

export const renderFromTemplateDescription: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '980b66a0-6eb0-4454-81e2-01adbb0fac1f',
		displayOptions: { show: showOnly },
		description: 'The ID of a template saved in your Shotstack account',
		routing: {
			send: {
				type: 'body',
				property: 'id',
			},
		},
	},
	{
		displayName: 'Merge Fields',
		name: 'merge',
		placeholder: 'Add Merge Field',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		displayOptions: { show: showOnly },
		description: 'Replaces placeholders in the template. A template placeholder written as {{ HEADLINE }} is matched by the find value HEADLINE.',
		options: [
			{
				displayName: 'Merge Field',
				name: 'mergeFields',
				values: [
					{
						displayName: 'Find',
						name: 'find',
						type: 'string',
						default: '',
						description: 'The placeholder name, without the braces',
					},
					{
						displayName: 'Replace',
						name: 'replace',
						type: 'string',
						default: '',
						description: 'The value to put in its place',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'merge',
				value: '={{ $value.mergeFields ?? [] }}',
			},
		},
	},
	{
		displayName: 'Callback URL',
		name: 'callback',
		type: 'string',
		default: '',
		placeholder: 'https://your-n8n/webhook/shotstack-done',
		displayOptions: { show: showOnly },
		description: 'Shotstack posts the finished render here. Point it at an n8n Webhook node so the workflow continues on its own, instead of waiting and polling.',
		routing: {
			send: {
				type: 'body',
				property: 'callback',
			},
		},
	},
];
