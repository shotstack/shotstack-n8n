import type {
	IAuthenticate,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { EDIT_BASE_URL } from '../nodes/Shotstack/environment';

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
					value: 'sandbox',
					description: 'Free renders with a watermark. Use this environment while you build',
				},
				{
					name: 'Production',
					value: 'production',
					description: 'Consumes credits, no watermark',
				},
			],
			default: 'sandbox',
			description: 'Sandbox and Production use separate API keys. Enter the key that matches this environment',
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
	 * Only the API needs a key. cdn.shotstack.io serves public files, and a
	 * blanket header would hand the key to any other host a request reached.
	 */
	authenticate: IAuthenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		// axios ignores baseURL when url is absolute, so read url first. A caller
		// that sets baseURL to an empty string would keep it under ??.
		//
		// Match axios's own rule for "absolute", scheme optional. A protocol
		// relative url like //evil.example.com/x is absolute to axios but not to
		// /^https?:\/\//, so that test fell through to baseURL, saw Shotstack and
		// attached the key to a request axios then sent to evil.example.com.
		const url = String(requestOptions.url ?? '');
		const target = /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
			? url
			: String(requestOptions.baseURL ?? '');

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
			baseURL: EDIT_BASE_URL,
			url: '/templates',
			method: 'GET',
		},
	};
}
