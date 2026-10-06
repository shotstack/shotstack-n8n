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
import { isRenderId } from '../renderId';

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
const MIN_MINUTES = 1;
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
	// Not String(): an expression or an agent can hand over an object, and
	// String({}) is "[object Object]", which is not empty and bills a credit.
	const typed = this.getNodeParameter('prompt', '');
	if (typed !== undefined && typed !== null && typeof typed !== 'string') {
		throw new NodeOperationError(this.getNode(), 'The Prompt field is not text', {
			description: `A prompt is a sentence describing the asset. Got ${Array.isArray(typed) ? 'an array' : typeof typed}.`,
			itemIndex: this.getItemIndex(),
		});
	}
	const prompt = String(typed ?? '').trim();
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
	const asked = this.getNodeParameter('length', 0);
	const length = Number(asked);
	if (!Number.isFinite(length)) {
		throw new NodeOperationError(this.getNode(), 'Clip Length is not a number', {
			description: `It is a count of seconds, so "5" not "5 seconds". Got "${String(asked)}".`,
			itemIndex: this.getItemIndex(),
		});
	}
	if (length > 0) body.length = length;

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

	const failed: (error: unknown) => never = (error) => {
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

	// The ID goes straight into a path, and this one comes from a response body
	// rather than from the field requireGenerationId already guards. A value
	// carrying a slash would point every poll at a different endpoint.
	if (!isRenderId(id)) {
		throw new NodeOperationError(this.getNode(), 'Shotstack returned a generation ID we cannot use', {
			description: `Expected an ID like 8a1f2c3d-4e5b-5a6c-9d7e-1f2a3b4c5d6e, got "${id}".`,
			itemIndex: this.getItemIndex(),
		});
	}

	// typeOptions bounds the UI spinner only, and an expression can resolve to
	// anything. Clamp it: a negative would skip the loop and still report a wait.
	const asked = Number(this.getNodeParameter('giveUpAfter', 5));
	const minutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Number.isFinite(asked) ? asked : 5));

	const url = `${String(requestData.options.baseURL ?? '')}/generate/${id}`;
	const deadline = Date.now() + minutes * 60000;
	let response: { statusCode: number; body: IDataObject; headers: IDataObject } | undefined;
	let throttled = false;
	let lastCode = 0;

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
			lastCode = response.statusCode;
		} catch {
			// A dropped connection is not an answer. Keep waiting, and clear the
			// last answer so the checks below do not read it twice.
			response = undefined;
		}

		if (isRateLimited(response)) throttled = true;

		// Neither answer turns into an asset by waiting, so stop on it rather than
		// run out the clock and blame the wait.
		if (response?.statusCode === 401 || response?.statusCode === 403) {
			throw new NodeOperationError(this.getNode(), 'Shotstack refused the API key', {
				description:
					'It accepted the key for the submit, then refused it while waiting. Check that the key is still active.',
				itemIndex: this.getItemIndex(),
			});
		}
		// Not on the first poll. The job is seconds old, and a gateway or a
		// read-after-write lag can answer 404 once.
		if (attempt > 0 && response?.statusCode === 404) {
			throw new NodeOperationError(this.getNode(), 'Shotstack has no generation with that ID', {
				description: `It accepted the generation as ${id}, then reported no such job. Run the step again, and send this ID to Shotstack support if it repeats.`,
				itemIndex: this.getItemIndex(),
			});
		}

		// 202 is the job still processing and 200 is it finished, and both carry
		// the job. Reading only one of them leaves the status at whatever the
		// submit said, so a job that spent nine minutes processing still reports
		// the word it was queued under.
		if (response?.statusCode === 200 || response?.statusCode === 202) {
			// The generation endpoints answer with the job itself, not the
			// { success, message, response } envelope the rest of the Edit API
			// wraps its answers in.
			const body = (response.body ?? {}) as IDataObject;
			last = String(body.status ?? last);
			if (last === 'failed') failed(body.error);
			// Only a 200 is final. A 202 saying done is the job still being
			// written, and its url may not be there yet.
			if (response.statusCode === 200 && last === 'done') {
				return [{ json: body, pairedItem: { item: this.getItemIndex() } }];
			}
		}
	}

	// Name what happened. "Still queued" on a run where every poll was a 500
	// sends the user to raise a timeout that was never the problem.
	const reached = lastCode
		? `The asset is still ${last} after ${minutes} minutes`
		: `The status check never completed, ${minutes} minutes after the asset was submitted`;
	throw new NodeOperationError(this.getNode(), reached, {
		description: throttled
			? RATE_LIMIT_HELP
			: `Shotstack last answered ${lastCode || 'nothing'}. Generation keeps going after this runs out, so turn off Wait for the Asset, keep the ID it returns, and read the result later with Get Generation Status.`,
		itemIndex: this.getItemIndex(),
	});
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
	{
		displayName: 'Give Up After (Minutes)',
		name: 'giveUpAfter',
		type: 'number',
		default: 5,
		typeOptions: { minValue: MIN_MINUTES, maxValue: MAX_MINUTES },
		displayOptions: { show: { ...showOnly, waitForAsset: [true] } },
		description:
			'How long to keep checking. n8n runs items one at a time, so six waiting items at the maximum reach its one hour execution limit and the whole run is lost. The generation keeps going after this runs out, and Shotstack still bills it',
	},
];
