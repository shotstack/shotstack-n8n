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
	resource: ['render'],
	operation: ['download'],
};

/**
 * Stops the request when there is no URL to fetch.
 *
 * Without this the empty value reaches the HTTP client, which reports
 * "Invalid URL". That blames this step for a problem that happened earlier —
 * usually a render that failed or has not finished. The incoming item already
 * carries the real reason, so report that instead.
 */
const explainMissingUrl: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
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
		message = 'The render failed, so there is no video to download';
		description = renderError
			? `Shotstack reported: ${renderError}`
			: 'Shotstack gave no reason. Open the render in the Shotstack dashboard.';
	} else if (status !== undefined && status !== 'done') {
		message = `The render is not finished yet. Its status is "${status}"`;
		description =
			'Wait longer, then check the status again. Only download once the status is "done".';
	} else if (item.attributes !== undefined) {
		message = 'The previous step returned the full response, not a plain URL';
		description =
			'Turn Simplify on in Get Hosted Asset, or set Video URL to {{ $json.attributes.url }}.';
	} else {
		message = 'No video URL was supplied';
		description =
			'Put this step after Get Hosted Asset, or type a URL into the Video URL field.';
	}

	throw new NodeOperationError(this.getNode(), message, {
		description,
		itemIndex: this.getItemIndex(),
	});
};

/**
 * Turns the downloaded bytes into an n8n binary file.
 *
 * The built-in binaryData action cannot set a file name or a media type, so
 * every download arrived unnamed. This names the file, falling back to the
 * name in the URL, and keeps the media type the server sent.
 */
const attachVideoFile: PostReceiveAction = async function (
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
) {
	const chosenName = String(this.getNodeParameter('fileName', '') ?? '').trim();
	const sourceUrl = String(this.getNodeParameter('videoUrl', '') ?? '');
	const nameInUrl = sourceUrl.split('?')[0].split('/').pop();
	const fileName = chosenName || nameInUrl || 'video.mp4';

	const contentType = String(response.headers?.['content-type'] ?? '').split(';')[0].trim();
	const body = response.body as Buffer | string;
	const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);

	const binary = await this.helpers.prepareBinaryData(
		buffer,
		fileName,
		contentType || undefined,
	);

	// The body is the video itself, so it makes a poor json payload. Carry the
	// incoming fields through instead. A later step can then name the file with
	// {{ $json.id }} rather than reaching back to an earlier node by name.
	const incoming = (this.getInputData()?.json ?? {}) as IDataObject;
	return items.map(() => ({ json: incoming, binary: { data: binary } }));
};

export const renderDownloadDescription: INodeProperties[] = [
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		required: true,
		default: '={{ $json.url }}',
		placeholder: 'https://cdn.shotstack.io/...',
		displayOptions: { show: showOnly },
		description:
			'The link to the finished video. The default reads the URL from the previous step, so putting this straight after Get Hosted Asset needs no setup.',
		routing: {
			send: {
				preSend: [explainMissingUrl],
			},
			request: {
				// The file is fetched from wherever it is hosted, not from the Edit
				// API, so the node's base URL does not apply here.
				baseURL: '',
				url: '={{ $value }}',
				method: 'GET',
				// Ask for raw bytes rather than parsed JSON.
				encoding: 'arraybuffer',
				json: false,
				skipSslCertificateValidation: false,
			},
			output: {
				postReceive: [attachVideoFile],
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
