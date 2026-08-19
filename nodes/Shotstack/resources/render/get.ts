import { NodeOperationError, sleep } from 'n8n-workflow';
import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { requireRenderId } from './renderId';
import { USER_AGENT } from '../../userAgent';

const showOnly = {
	resource: ['render'],
	operation: ['get'],
};

const POLL_GAP_MS = 5000;
const REQUEST_TIMEOUT_MS = 30000;
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;

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

	while (Date.now() < deadline) {
		let response: { statusCode: number; body: IDataObject } | undefined;
		try {
			response = (await this.helpers.httpRequestWithAuthentication.call(this, 'shotstackApi', {
				method: 'GET',
				url,
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: REQUEST_TIMEOUT_MS,
				headers: { 'User-Agent': USER_AGENT },
			})) as { statusCode: number; body: IDataObject };
			lastCode = response.statusCode;
		} catch {
			// A dropped connection is not an answer. Keep waiting.
		}

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
		if (response?.statusCode === 400 || response?.statusCode === 404) {
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
							: 'Shotstack gave no reason. Open the render in the Shotstack dashboard.',
					itemIndex: this.getItemIndex(),
				});
			}
			if (last === 'done') {
				// Run the real request so the output goes through Simplify.
				return await this.makeRoutingRequest(requestData);
			}
		}

		if (Date.now() + POLL_GAP_MS >= deadline) break;
		await sleep(POLL_GAP_MS);
	}

	// Name what happened. A bare "still unknown" sends the user to raise a
	// timeout that was never the problem.
	const reached =
		last !== 'unknown' ? `The render is still ${last}` : `Shotstack kept answering ${lastCode || 'nothing'}`;
	throw new NodeOperationError(this.getNode(), `${reached} after ${minutes} minutes`, {
		description:
			'Raise Give Up After for a long render, or turn off Wait For The Render To Finish and use a Callback URL on the render step instead.',
		itemIndex: this.getItemIndex(),
	});
};

export const renderGetDescription: INodeProperties[] = [
	{
		displayName: 'Render ID',
		name: 'renderId',
		type: 'string',
		required: true,
		// Both render operations return the id as "id", so this makes the chain
		// Render -> Get work with no setup, the way Download Video already does.
		default: '={{ $json.id }}',
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
		default: 10,
		typeOptions: { minValue: 1, maxValue: 60 },
		displayOptions: { show: { ...showOnly, waitForCompletion: [true] } },
		description:
			'How long to keep checking. Most renders finish in under a minute. Raise this for long videos or ones using the generative assets',
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
					// Only when asked. Sending data=false on every poll is noise.
					data: '={{ $value || undefined }}',
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
						},
					},
				],
			},
		},
	},
];
