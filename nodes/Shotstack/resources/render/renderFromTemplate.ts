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
						required: true,
						default: '',
						description: 'The placeholder name, without the braces',
					},
					{
						displayName: 'Replace',
						name: 'replace',
						type: 'string',
						required: true,
						default: '',
						description: 'The value to put in its place. Shotstack accepts any JSON type here, so for a number or a boolean use an expression such as {{ 4 }} rather than typing 4 as text — a template placeholder for a clip length or volume needs a real number.',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'merge',
				// Accept both shapes: the fixedCollection's own { mergeFields: [...] },
				// and a bare array supplied by expression from an earlier node or an
				// AI agent. Sending undefined rather than [] keeps the key out of the
				// body when there is nothing to merge.
				value:
					'={{ Array.isArray($value) ? $value : ($value?.mergeFields?.length ? $value.mergeFields : undefined) }}',
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
				// Send undefined rather than '' when the field is blank. n8n has no
				// empty-value guard, and lodash merge skips undefined but not ''.
				value: '={{ $value || undefined }}',
			},
		},
	},
];
