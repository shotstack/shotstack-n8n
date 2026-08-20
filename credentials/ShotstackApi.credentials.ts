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
	 * Download File fetches whatever address the previous step produced. A
	 * blanket header would hand the key to that host. Only the API needs a key;
	 * cdn.shotstack.io serves public files.
	 */
	authenticate: IAuthenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		// axios ignores baseURL when url is absolute, so read url first. Download
		// Video sets baseURL to an empty string, which ?? would keep.
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
