import type {
	IAuthenticate,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
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

	/**
	 * Sends the key to api.shotstack.io and nowhere else.
	 *
	 * Download Video fetches whatever address the previous step produced, so a
	 * blanket header would hand the key to that host. Only the API authenticates
	 * anything: cdn.shotstack.io serves public files and needs no key, and a
	 * narrow allowlist also keeps the key away from any other subdomain,
	 * including one that later points somewhere we do not control.
	 */
	authenticate: IAuthenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		// axios ignores baseURL when url is absolute, so read them in that order.
		// Download Video also sets baseURL to an empty string, which is not
		// nullish, so ?? would keep it.
		const url = String(requestOptions.url ?? '');
		const target = /^https?:\/\//i.test(url) ? url : String(requestOptions.baseURL ?? '');

		if (/^https:\/\/api\.shotstack\.io(\/|$)/i.test(target)) {
			requestOptions.headers = {
				...requestOptions.headers,
				'x-api-key': String(credentials.apiKey ?? ''),
			};
		}
		return requestOptions;
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://api.shotstack.io/edit/{{$credentials?.environment}}',
			url: '/templates',
			method: 'GET',
		},
	};
}
