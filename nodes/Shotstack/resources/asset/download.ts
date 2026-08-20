import { NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
	PostReceiveAction,
	PreSendAction,
} from 'n8n-workflow';

const showOnly = {
	resource: ['asset'],
	operation: ['download'],
};

/**
 * Stops the request when there is no URL to fetch.
 *
 * An empty value reaches the HTTP client as "Invalid URL". That blames this
 * step for an earlier failure. The incoming item holds the real reason.
 */
const explainMissingUrl: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	// The node defaults are for api.shotstack.io, and this request goes wherever
	// the URL points. Delete them here: routing headers are merged with lodash
	// merge, which skips an undefined source value rather than removing the key.
	const headers = requestOptions.headers as IDataObject | undefined;
	if (headers) {
		delete headers['Content-Type'];
		delete headers['User-Agent'];
	}

	const url = requestOptions.url;
	if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
		return requestOptions;
	}

	const item = (this.getInputData()?.json ?? {}) as IDataObject;
	const status = typeof item.status === 'string' ? item.status : undefined;
	const renderError = typeof item.error === 'string' ? item.error : undefined;

	let message: string;
	let description: string;

	if (status === 'failed') {
		message = 'The render failed, so there is no file to download';
		description = renderError
			? `Shotstack reported: ${renderError}`
			: 'The response carries no error detail. Open the render in the Shotstack dashboard.';
	} else if (status !== undefined && status !== 'done') {
		message = `The render is not finished yet. Its status is "${status}"`;
		description =
			'Wait longer, then check the status again. Only download once the status is "done".';
	} else if (item.attributes !== undefined) {
		message = 'The previous step returned the full response, not a plain URL';
		description =
			'Turn Simplify on in Get Asset by Render ID, or set File URL to {{ $json.attributes.url }}.';
	} else {
		message = 'No file URL was supplied';
		description =
			'Put this step after Get Asset by Render ID, or type a URL into the File URL field.';
	}

	throw new NodeOperationError(this.getNode(), message, {
		description,
		itemIndex: this.getItemIndex(),
	});
};

/**
 * Turns the downloaded bytes into an n8n binary file.
 *
 * The built-in binaryData action cannot set a file name or a media type.
 */
const attachDownloadedFile: PostReceiveAction = async function (
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
) {
	const chosenName = String(this.getNodeParameter('fileName', '') ?? '').trim();
	const sourceUrl = String(this.getNodeParameter('fileUrl', '') ?? '');
	const nameInUrl = sourceUrl.split('?')[0].split('/').pop();
	const fileName = chosenName || nameInUrl || 'video.mp4';

	const contentType = String(response.headers?.['content-type'] ?? '').split(';')[0].trim();

	// A URL that answers 200 with an error page saves as a video that will not
	// play, and the workflow reports success. Reject the types that carry a
	// message rather than media: S3 answers application/xml, a proxy answers
	// text/plain, an API answers application/json. Anything else is let through,
	// because the body arrives as a Buffer either way and the check below cannot
	// tell media from prose.
	if (/^(text\/|application\/(json|xml)$)/i.test(contentType)) {
		throw new NodeOperationError(this.getNode(), 'That URL returned a message, not a file', {
			description: `The host answered with ${contentType}. Check the File URL: it should be the url from Get Asset by Render ID, which looks like https://cdn.shotstack.io/...`,
			itemIndex: this.getItemIndex(),
		});
	}

	// Never Buffer.from(string) here. That decodes as utf8 and every byte above
	// 127 becomes U+FFFD, which writes a corrupt file and reports success.
	const body = response.body as unknown;
	let buffer: Buffer;
	if (Buffer.isBuffer(body)) {
		buffer = body;
	} else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
		buffer = Buffer.from(body as ArrayBuffer);
	} else {
		throw new NodeOperationError(this.getNode(), 'The download did not return a file', {
			description: `Expected bytes and got ${typeof body}. The URL may point at a web page rather than a file.`,
			itemIndex: this.getItemIndex(),
		});
	}

	const binary = await this.helpers.prepareBinaryData(
		buffer,
		fileName,
		contentType || undefined,
	);

	// The body is the file, so it makes a poor json payload. Carry the incoming
	// fields through instead, so a later step can read {{ $json.id }}.
	const incoming = (this.getInputData()?.json ?? {}) as IDataObject;
	return items.map(() => ({ json: incoming, binary: { data: binary } }));
};

export const downloadDescription: INodeProperties[] = [
	{
		displayName: 'File URL',
		name: 'fileUrl',
		type: 'string',
		required: true,
		default: '={{ $json.url }}',
		placeholder: 'https://cdn.shotstack.io/...',
		displayOptions: { show: showOnly },
		description:
			'The link to the finished file. The default reads the URL from the previous step, so putting this straight after Get Asset by Render ID needs no setup.',
		routing: {
			send: {
				preSend: [explainMissingUrl],
			},
			request: {
				// The file is hosted elsewhere, so the node baseURL does not apply.
				baseURL: '',
				url: '={{ $value }}',
				method: 'GET',
				// Ask for bytes. Content-Type and User-Agent are deleted in the preSend
				// above, because setting them undefined here would not remove them.
				headers: { Accept: '*/*' },
				// Ask for raw bytes rather than parsed JSON.
				encoding: 'arraybuffer',
				json: false,
				skipSslCertificateValidation: false,
			},
			output: {
				postReceive: [attachDownloadedFile],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		placeholder: 'my-video.mp4',
		displayOptions: { show: showOnly },
		description:
			'Name to give the downloaded file. Leave blank to use the name in the URL.',
	},
];
