import { NodeOperationError, sleep } from 'n8n-workflow';
import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
	PreSendAction,
} from 'n8n-workflow';
import { TELEMETRY_HEADERS } from '../../telemetry';
import { isRateLimited, pollGapMs, RATE_LIMIT_HELP } from '../../polling';
import { jsonObjectParam } from '../jsonObject';

const showOnly = {
	resource: ['generation'],
	operation: ['postGenerate'],
};

// Quote takes the same body as Generate Asset, so one set of fields builds both
// and only the route differs. A quote spends nothing, which is the point of it.
const showForBoth = {
	resource: ['generation'],
	operation: ['postGenerate', 'postGenerateQuote'],
};

const POLL_GAP_MS = 5000;
const MAX_GAP_MS = 20000;
const REQUEST_TIMEOUT_MS = 30000;
// The same ceiling as a render wait. n8n runs items one at a time, so a longer
// one risks the 1 hour EXECUTIONS_TIMEOUT_MAX ending the whole run.
const MAX_MINUTES = 10;

/**
 * Builds the generation body from the separate fields.
 *
 * Kept out of a routing expression for the reason postRender gives: an
 * expression that throws fails the node rather than the item, so Continue On
 * Fail never sees it. Here it also leaves an unset Model and unset Options out
 * of the body, rather than sending empty values the API rejects.
 */
const buildGenerationBody: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const prompt = String(this.getNodeParameter('prompt', '') ?? '').trim();
	if (!prompt) {
		throw new NodeOperationError(this.getNode(), 'The Prompt field is empty', {
			description: 'Describe the asset to generate. For a speech model this is the text spoken.',
			itemIndex: this.getItemIndex(),
		});
	}

	const asset: IDataObject = {
		type: this.getNodeParameter('assetType', 'image'),
		prompt,
	};

	const model = String(this.getNodeParameter('model', '') ?? '').trim();
	if (model) asset.model = model;

	const options = jsonObjectParam.call(
		this,
		'modelOptions',
		'Model Options',
		'It holds the settings for the chosen model, such as {"aspectRatio": "16:9"}. List Generation Models returns the options each model accepts.',
	);
	if (options) asset.options = options;

	const body: IDataObject = { asset };

	// Only a model that generates to a duration reads this; the rest ignore it.
	// Zero means not set, because the API rejects a length that is not positive
	// and every model has its own default.
	const length = Number(this.getNodeParameter('length', 0));
	if (Number.isFinite(length) && length > 0) body.length = length;

	requestOptions.body = body;
	return requestOptions;
};

/**
 * Submits the generation, then polls until the asset exists.
 *
 * The submit answers either 200 with a finished job, when the same asset was
 * generated before, or 202 with a queued one. Without this the workflow gets an
 * ID and no asset, and needs a Wait node and a Switch that loops back.
 */
const waitForGeneration = async function (
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const items = await this.makeRoutingRequest(requestData);
	if (!this.getNodeParameter('waitForAsset', false)) return items;

	const job = (items[0]?.json ?? {}) as IDataObject;
	const id = String(job.id ?? '');
	let last = String(job.status ?? 'unknown');

	const failed = (error: unknown): never => {
		throw new NodeOperationError(this.getNode(), 'The generation failed', {
			description:
				typeof error === 'string' && error
					? `Shotstack reported: ${error}`
					: 'The response carries no error detail.',
			itemIndex: this.getItemIndex(),
		});
	};

	if (last === 'failed') failed(job.error);
	// A cache hit comes back done, with its URL already set.
	if (last === 'done' || !id) return items;

	const url = `${String(requestData.options.baseURL ?? '')}/generate/${id}`;
	const deadline = Date.now() + MAX_MINUTES * 60000;
	let response: { statusCode: number; body: IDataObject; headers: IDataObject } | undefined;
	let throttled = false;

	for (let attempt = 0; ; attempt++) {
		// Wait first. The submit already answered with a status, so polling
		// straight away spends a request to be told the same thing.
		const gap = pollGapMs(attempt, POLL_GAP_MS, MAX_GAP_MS, response);
		if (Date.now() + gap >= deadline) break;
		await sleep(gap);

		try {
			response = (await this.helpers.httpRequestWithAuthentication.call(this, 'shotstackApi', {
				method: 'GET',
				url,
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: REQUEST_TIMEOUT_MS,
				headers: { ...TELEMETRY_HEADERS },
			})) as { statusCode: number; body: IDataObject; headers: IDataObject };
		} catch {
			// A dropped connection is not an answer. Keep waiting.
		}

		if (isRateLimited(response)) throttled = true;

		if (response?.statusCode === 200) {
			// The generation endpoints answer with the job itself, not the
			// { success, message, response } envelope the rest of the Edit API
			// wraps its answers in.
			const body = (response.body ?? {}) as IDataObject;
			last = String(body.status ?? last);
			if (last === 'failed') failed(body.error);
			if (last === 'done') return [{ json: body, pairedItem: { item: this.getItemIndex() } }];
		}
	}

	throw new NodeOperationError(
		this.getNode(),
		`The asset is still ${last} after ${MAX_MINUTES} minutes`,
		{
			description: throttled
				? RATE_LIMIT_HELP
				: 'Generation keeps going after this runs out. Turn off Wait for the Asset, keep the ID it returns, and read the result later with Get Generation Status.',
			itemIndex: this.getItemIndex(),
		},
	);
};

export const postGenerateDescription: INodeProperties[] = [
	{
		displayName: 'Asset Type',
		name: 'assetType',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Audio', value: 'audio' },
			{ name: 'Image', value: 'image' },
			{ name: 'Video', value: 'video' },
		],
		default: 'image',
		displayOptions: { show: showForBoth },
		description: 'The kind of asset to generate. It decides which models are offered.',
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		// Empty on purpose. Generation spends credits, and this node is usable as
		// an AI tool, so a sample here would bill on a call that omits the field.
		default: '',
		placeholder: 'A lighthouse on a rocky coast at sunset, cinematic lighting',
		typeOptions: { rows: 3 },
		displayOptions: { show: showForBoth },
		description: 'What to generate. For a text-to-speech model this is the text that gets spoken.',
		routing: {
			send: { preSend: [buildGenerationBody] },
		},
	},
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getModels',
			loadOptionsDependsOn: ['assetType'],
		},
		default: '',
		displayOptions: { show: showForBoth },
		description:
			'The generation model to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Model Options',
		name: 'modelOptions',
		type: 'json',
		default: '',
		placeholder: '{"aspectRatio": "16:9"}',
		typeOptions: { rows: 3 },
		displayOptions: { show: showForBoth },
		description:
			'Settings for the chosen model, such as an aspect ratio, a voice or a starting image. Run List Generation Models to see what each one accepts. Leave empty to use its defaults.',
	},
	{
		displayName: 'Clip Length (Seconds)',
		name: 'length',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		displayOptions: { show: showForBoth },
		description:
			'The length of the clip this asset has to fill. A model that generates to a duration uses it instead of its own duration option, and the rest ignore it. Leave at 0 for the model default.',
	},
	{
		displayName: 'Wait for the Asset',
		name: 'waitForAsset',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnly },
		description: 'Whether to keep checking until the asset is ready and return its URL, instead of returning a job ID straight away. Turn it off for a long video and read the result later with Get Generation Status.',
		routing: {
			send: { paginate: true },
			operations: { pagination: waitForGeneration },
		},
	},
];
