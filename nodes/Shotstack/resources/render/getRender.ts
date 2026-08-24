import { NodeOperationError, sleep } from 'n8n-workflow';
import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { requireRenderId } from '../renderId';
import { USER_AGENT } from '../../userAgent';
import { isRateLimited, pollGapMs, RATE_LIMIT_HELP } from '../../polling';

const showOnly = {
	resource: ['render'],
	operation: ['getRender'],
};

const POLL_GAP_MS = 5000;
const MAX_GAP_MS = 20000;
const REQUEST_TIMEOUT_MS = 30000;
const MIN_MINUTES = 1;
// Measured over 113,759 n8n renders: 99.62% finish inside 10 minutes, and 15
// minutes adds 0.07%. n8n runs items one at a time, so six items stuck at this
// ceiling reach the 1 hour EXECUTIONS_TIMEOUT_MAX and end the whole run.
// Raising this later is safe. Lowering it silently overrides what users saved.
const MAX_MINUTES = 10;

/**
 * Polls until the render finishes.
 *
 * A render takes seconds to minutes, so the API answers with a status, not a
 * video. Without this every workflow needs a Wait node and a Switch that loops
 * back, and a Switch that only routes "done" spins forever on a failed render.
 */
const waitForRender = async function (
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	if (!this.getNodeParameter('waitForCompletion', false)) {
		return await this.makeRoutingRequest(requestData);
	}

	const url = `${String(requestData.options.baseURL ?? '')}${String(requestData.options.url ?? '')}`;

	// typeOptions bounds the UI spinner only, and an expression can resolve to
	// anything. Clamp it: a negative would skip the loop and still report a wait.
	const asked = Number(this.getNodeParameter('giveUpAfter', 10));
	const minutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Number.isFinite(asked) ? asked : 10));

	// A deadline, not an attempt count. Counting attempts ignores how long each
	// request takes, so a slow API turns "10 minutes" into hours.
	const deadline = Date.now() + minutes * 60000;
	let last = 'unknown';
	let lastCode = 0;
	let throttled = false;

	for (let attempt = 0; Date.now() < deadline; attempt++) {
		let response: { statusCode: number; body: IDataObject; headers: IDataObject } | undefined;
		try {
			response = (await this.helpers.httpRequestWithAuthentication.call(this, 'shotstackApi', {
				method: 'GET',
				url,
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: REQUEST_TIMEOUT_MS,
				headers: { 'User-Agent': USER_AGENT },
			})) as { statusCode: number; body: IDataObject; headers: IDataObject };
			lastCode = response.statusCode;
		} catch {
			// A dropped connection is not an answer. Keep waiting.
		}

		// Without this a 429 reads as "not finished yet" and the loop polls
		// again, adding load to the account Shotstack is already throttling.
		if (isRateLimited(response)) throttled = true;

		if (response?.statusCode === 401 || response?.statusCode === 403) {
			throw new NodeOperationError(this.getNode(), 'Shotstack refused the API key', {
				description:
					'Check the key, and check that the credential environment matches the key. A sandbox key cannot read a production render.',
				itemIndex: this.getItemIndex(),
			});
		}

		// Shotstack answers 400 for an ID it does not hold, not 404. Waiting can
		// never turn that into a render, and the usual cause is a sandbox ID read
		// with a production key.
		//
		// Not on the first poll though. Render ID defaults to the id from the
		// previous step, so this often runs a second after the render was
		// created, and a gateway or a read-after-write lag can answer 400 once.
		if (attempt > 0 && (response?.statusCode === 400 || response?.statusCode === 404)) {
			throw new NodeOperationError(this.getNode(), 'Shotstack has no render with that ID', {
				description:
					'Check the Render ID, and check that the credential uses the same environment that started the render.',
				itemIndex: this.getItemIndex(),
			});
		}

		if (response?.statusCode === 200) {
			const body = (response.body?.response ?? {}) as IDataObject;
			last = typeof body.status === 'string' ? body.status : last;

			if (last === 'failed') {
				throw new NodeOperationError(this.getNode(), 'The render failed', {
					description:
						typeof body.error === 'string' && body.error
							? `Shotstack reported: ${body.error}`
							: 'The response carries no error detail. Open the render in the Shotstack dashboard.',
					itemIndex: this.getItemIndex(),
				});
			}
			if (last === 'done') {
				// Run the real request so the output goes through Simplify.
				return await this.makeRoutingRequest(requestData);
			}
		}

		const gap = pollGapMs(attempt, POLL_GAP_MS, MAX_GAP_MS, response);
		if (Date.now() + gap >= deadline) break;
		await sleep(gap);
	}

	// Name what happened. A bare "still unknown" sends the user to raise a
	// timeout that was never the problem.
	const reached =
		last !== 'unknown'
			? `The render is still ${last}`
			: lastCode
				? `Shotstack returned status ${lastCode}`
				: 'The status check did not complete';
	const escape =
		'Turn off Wait for the Render To Finish and use a Callback URL on Render Asset instead.';
	throw new NodeOperationError(this.getNode(), `${reached} after ${minutes} minutes`, {
		// Offer a higher value only when one exists. At the ceiling that advice
		// sends the user to a field that will not accept it.
		description: throttled
			? RATE_LIMIT_HELP
			: minutes < MAX_MINUTES
				? `Raise Give Up After, up to ${MAX_MINUTES} minutes. ${escape}`
				: escape,
		itemIndex: this.getItemIndex(),
	});
};

export const getRenderDescription: INodeProperties[] = [
	{
		displayName: 'Render ID',
		name: 'renderId',
		type: 'string',
		required: true,
		// A render step returns the render as "id"; Get Asset by Render ID
		// returns it as "renderId". Read either, so any chain works with no setup.
		default: '={{ $json.renderId || $json.id }}',
		placeholder: '4a37ef85-b4d1-4b4a-90be-6515290c5091',
		displayOptions: { show: showOnly },
		description: 'The ID returned when the render was submitted. The default reads it from the previous step.',
		routing: {
			request: {
				url: '=/render/{{$value}}',
			},
			send: {
				preSend: [requireRenderId],
				paginate: true,
			},
			operations: {
				pagination: waitForRender,
			},
		},
	},
	{
		displayName: 'Wait for the Render To Finish',
		name: 'waitForCompletion',
		type: 'boolean',
		default: false,
		displayOptions: { show: showOnly },
		description:
			'Whether to keep checking until the render is done, instead of returning its status straight away. This replaces the usual Wait node and Switch loop. A failed render stops the step with the reason Shotstack gave',
	},
	{
		displayName: 'Give Up After (Minutes)',
		name: 'giveUpAfter',
		type: 'number',
		default: 5,
		typeOptions: { minValue: 1, maxValue: MAX_MINUTES },
		displayOptions: { show: { ...showOnly, waitForCompletion: [true] } },
		description:
			'How long to keep checking. Nine in ten renders finish inside a minute. The render keeps going after this runs out, and Shotstack still bills it, so use a Callback URL for anything longer',
	},
	{
		displayName: 'Include Submitted Edit',
		name: 'includeData',
		type: 'boolean',
		default: false,
		displayOptions: { show: showOnly },
		description:
			'Whether to also return the edit that was submitted. Leave off while polling, so the responses stay small.',
		routing: {
			request: {
				qs: {
					// Always send it. The API returns the submitted edit when the
					// parameter is absent, so omitting it while the toggle is off
					// returns the whole timeline on every poll.
					data: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnly },
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		routing: {
			output: {
				postReceive: [
					{
						type: 'setKeyValue',
						enabled: '={{$value}}',
						properties: {
							id: '={{$responseItem.id}}',
							status: '={{$responseItem.status}}',
							url: '={{$responseItem.url}}',
							poster: '={{$responseItem.poster}}',
							thumbnail: '={{$responseItem.thumbnail}}',
							duration: '={{$responseItem.duration}}',
							renderTime: '={{$responseItem.renderTime}}',
							error: '={{$responseItem.error}}',
							// Without this, Include Submitted Edit returns nothing while
							// Simplify is on, and both are shown at their defaults.
							data: '={{$responseItem.data}}',
						},
					},
				],
			},
		},
	},
];
