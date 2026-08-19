import type { INodeProperties } from 'n8n-workflow';

const showOnly = {
	resource: ['render'],
	operation: ['renderFromTemplate'],
};

export const renderFromTemplateDescription: INodeProperties[] = [
	{
		displayName: 'Template',
		name: 'templateId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: showOnly },
		description:
			'A template saved in your Shotstack account. Pick one from the list, or paste an ID if you know it. Templates are made in Shotstack Studio — a new account has none yet',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a template…',
				typeOptions: {
					searchListMethod: 'getTemplates',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '980b66a0-6eb0-4454-81e2-01adbb0fac1f',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
							errorMessage: 'Not a valid Shotstack template ID',
						},
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'id',
				value: '={{ $value }}',
			},
		},
	},
	{
		displayName: 'Merge Fields Source',
		name: 'mergeSource',
		type: 'options',
		noDataExpression: true,
		default: 'fields',
		displayOptions: { show: showOnly },
		description:
			'Whether to fill the placeholders one at a time, or hand over a ready-made list. Choose JSON when an earlier step or an AI agent builds the list.',
		options: [
			{
				name: 'Fields',
				value: 'fields',
				description: 'Type each placeholder and its value',
			},
			{
				name: 'JSON',
				value: 'json',
				description: 'Supply the whole list as [{"find":"NAME","replace":"value"}]',
			},
		],
	},
	{
		displayName: 'Merge Fields (JSON)',
		name: 'mergeJson',
		type: 'json',
		default: '',
		placeholder: '[{"find": "HEADLINE", "replace": "Hello"}]',
		displayOptions: { show: { ...showOnly, mergeSource: ['json'] } },
		description:
			'A list of find and replace pairs. Send every placeholder the template declares — one you leave out is not filled in from the template, it stays as raw text, and an image or video placeholder then fails the render.',
		routing: {
			send: {
				type: 'body',
				property: 'merge',
				// parseJson, not JSON.parse. The expression engine swallows a
				// SyntaxError and would send an empty body instead of failing.
				value: '={{ typeof $value === "string" ? $value.parseJson() : $value }}',
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
		displayOptions: { show: { ...showOnly, mergeSource: ['fields'] } },
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
				// Two shapes arrive here: the fixedCollection's own
				// { mergeFields: [...] }, and a bare array from an earlier node or an
				// AI agent. undefined, not [], keeps the key out of an empty body.
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
				// Send undefined when blank. lodash merge skips undefined, not ''.
				value: '={{ $value || undefined }}',
			},
		},
	},
];
