import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ShotstackApi implements ICredentialType {
	name = 'shotstackApi';

	displayName = 'Shotstack API';

	icon: Icon = {
		light: 'file:../icons/shotstack.svg',
		dark: 'file:../icons/shotstack.dark.svg',
	};

	documentationUrl = 'https://shotstack.io/docs/guide/getting-started/core-concepts/';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Sandbox',
					value: 'stage',
					description: 'Free renders, watermarked output. Use this to try things out',
				},
				{
					name: 'Production',
					value: 'v1',
					description: 'Consumes credits, no watermark',
				},
			],
			default: 'stage',
			description: 'Sandbox and production use separate API keys. Make sure the key below matches',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Find this in the Shotstack dashboard under API Keys',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://api.shotstack.io/edit/{{$credentials?.environment}}',
			url: '/templates',
			method: 'GET',
		},
	};
}
