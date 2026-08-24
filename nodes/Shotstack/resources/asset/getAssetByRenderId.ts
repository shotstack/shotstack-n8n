import { NodeOperationError, sleep } from 'n8n-workflow';
import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecuteSingleFunctions,
	IExecutePaginationFunctions,
	INodeExecutionData,
	INodeProperties,
	PostReceiveAction,
} from 'n8n-workflow';
import { isRenderId } from '../renderId';
import { USER_AGENT } from '../../userAgent';
import { apiPathFor, SERVE_BASE_URL } from '../../environment';
import { isRateLimited, pollGapMs, RATE_LIMIT_HELP } from '../../polling';

const showOnly = {
	resource: ['asset'],
	operation: ['getAssetByRenderId'],
};

const POLL_GAP_MS = 3000;
const MAX_GAP_MS = 12000;
const MAX_WAIT_MS = 120000;
// After this many empty answers, ask the Edit API whether waiting can ever
// work. A missing or failed render never becomes a hosted file.
const CHECK_RENDER_AFTER = 3;

// Shotstack names the extras "<id>-poster.jpg" and "<id>-thumbnail.jpg". Match
// the suffix, not the extension: gif, jpg, png and bmp are all output formats
// too, so an extension test drops the rendered file itself.
const EXTRA_FILES = /-(poster|thumb|thumbnail)\.[a-z0-9]+$/i;

/**
 * Drops the poster and thumbnail, so the next step gets the rendered file.
 *
 * One render hosts several files. Without this the workflow runs once per
 * file, and a later step can pick up the poster instead of the video.
 */
const keepMainFile: PostReceiveAction = async function (
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
) {
	if (!this.getNodeParameter('mainFileOnly', true)) return items;

	const nameOf = (item: INodeExecutionData) => {
		const json = item.json as IDataObject;
		const attributes = (json.attributes ?? json) as IDataObject;
		// || not ??. Both fields are optional, and an empty name matches no
		// suffix, so ?? would keep a nameless asset as the rendered file.
		return String(attributes.filename || attributes.url || '').split('?')[0];
	};

	const main = items.filter((item) => nameOf(item) !== '' && !EXTRA_FILES.test(nameOf(item)));
	// Keep everything rather than nothing if the naming ever changes.
	return main.length > 0 ? main : items;
};

/** Reads the environment the credential holds, never the URL it produced. */
async function apiPath(this: IExecutePaginationFunctions): Promise<string> {
	const credentials = await this.getCredentials('shotstackApi');
	return apiPathFor(credentials?.environment);
}

/** Asks the Edit API why there is no hosted file, so the node can name a cause. */
async function readRenderStatus(
	this: IExecutePaginationFunctions,
	environment: string,
	renderId: string,
): Promise<{ known: boolean; status?: string; error?: string }> {
	try {
		const render = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'shotstackApi',
			{
				method: 'GET',
				url: `https://api.shotstack.io/edit/${environment}/render/${renderId}`,
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: 30000,
				headers: { 'User-Agent': USER_AGENT },
			},
		)) as { statusCode: number; body: IDataObject };

		if (render.statusCode === 200) {
			const body = (render.body?.response ?? {}) as IDataObject;
			return {
				known: true,
				status: typeof body.status === 'string' ? body.status : undefined,
				error: typeof body.error === 'string' ? body.error : undefined,
			};
		}

		// Shotstack answers 400 for an ID it does not hold, not 404.
		if (render.statusCode === 400 || render.statusCode === 404) {
			return { known: true };
		}
	} catch {
		// Fall through. A failed check is not proof of anything.
	}

	// A rate limit, a timeout or an outage all land here. known: false keeps the
	// caller waiting, so a hiccup never reads as a missing render.
	return { known: false };
}

/** Turns "no hosted file" into a sentence that names the real cause. */
function describeMissingAsset(
	this: IExecutePaginationFunctions,
	known: boolean,
	status: string | undefined,
	renderError: string | undefined,
	renderId: string,
): never {
	let message: string;
	let description: string;

	if (!known) {
		message = `No hosted file after ${MAX_WAIT_MS / 1000} seconds, and Shotstack did not answer when asked why`;
		description =
			'The render itself may be fine. Check the render in the Shotstack dashboard, then run this step again.';
	} else if (status === 'failed') {
		message = 'The render failed, so there is no file to host';
		description = renderError
			? `Shotstack reported: ${renderError}`
			: 'The response carries no error detail. Open the render in the Shotstack dashboard.';
	} else if (status === undefined) {
		message = `Shotstack has no render with the ID ${renderId}`;
		description =
			'Check the Render ID, and check that the credential uses the same environment that started the render. A sandbox render is invisible to a production key.';
	} else if (status !== 'done') {
		message = `The render is still ${status} after ${MAX_WAIT_MS / 1000} seconds`;
		description = 'Long renders need a longer Wait before this step.';
	} else {
		message = `The render is complete, and Shotstack is still publishing the file after ${MAX_WAIT_MS / 1000} seconds`;
		description =
			'Run this step again in a minute. You can also read the temporary URL from Get Render Status.';
	}

	throw new NodeOperationError(this.getNode(), message, {
		description,
		itemIndex: this.getItemIndex(),
	});
}

/**
 * Waits for the hosted file to appear.
 *
 * A finished render is not yet a published file. Until Shotstack publishes it
 * the Serve API answers 404, and that gap is not a fixed length. So the node
 * waits here rather than ask the user to guess a Wait. See the README.
 */
const waitForHostedAsset = async function (
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const baseURL = String(requestData.options.baseURL ?? '');
	const url = `${baseURL}${String(requestData.options.url ?? '')}`;
	const environment = await apiPath.call(this);
	const renderId = String(this.getNodeParameter('renderId', '') ?? '').trim();

	// The wait loop below builds its own requests, so check the ID here too.
	if (!isRenderId(renderId)) {
		throw new NodeOperationError(this.getNode(), 'That is not a Shotstack render ID', {
			description: `A render ID looks like 4a37ef85-b4d1-4b4a-90be-6515290c5091. Got "${renderId}". A render action returns it as "id".`,
			itemIndex: this.getItemIndex(),
		});
	}

	// Only the files this step will return. With Main File Only on, a ready
	// poster is not an answer: Shotstack often publishes it before the video.
	const mainFileOnly = this.getNodeParameter('mainFileOnly', true) as boolean;

	// A deadline, not an attempt count. Counting attempts ignores how long each
	// request takes, so 40 polls behind a 30-second timeout could hold the
	// execution for twenty minutes and still report two minutes.
	const deadline = Date.now() + MAX_WAIT_MS;
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
				timeout: 30000,
				headers: { 'User-Agent': USER_AGENT },
			})) as { statusCode: number; body: IDataObject; headers: IDataObject };
		} catch {
			// A dropped connection is not an answer. Keep waiting.
		}

		// Without this a 429 reads as "not published yet" and the loop polls
		// again, adding load to the account Shotstack is already throttling.
		if (isRateLimited(response)) throttled = true;

		if (response?.statusCode === 401 || response?.statusCode === 403) {
			throw new NodeOperationError(this.getNode(), 'Shotstack refused the API key', {
				description:
					'Check the key, and check that the credential environment matches the key. A sandbox key cannot read a production render.',
				itemIndex: this.getItemIndex(),
			});
		}

		// Waiting only helps while the render is on its way. Check once, early, so
		// a wrong ID or a failed render reports in ten seconds, not two minutes.
		if (attempt === CHECK_RENDER_AFTER && response?.statusCode !== 200) {
			const check = await readRenderStatus.call(this, environment, renderId);
			// Stop early only on a definite answer.
			if (check.known && (check.status === undefined || check.status === 'failed')) {
				return describeMissingAsset.call(this, true, check.status, check.error, renderId);
			}
		}

		if (response?.statusCode === 200) {
			// A render can host several files: the rendered file, a poster and a
			// thumbnail, each published separately.
			const assets = (response.body?.data ?? []) as IDataObject[];
			const files = assets.map((asset) => {
				const attributes = (asset.attributes ?? {}) as IDataObject;
				// || not ??, for the reason given on keepMainFile above.
				const name = String(attributes.filename || attributes.url || '').split('?')[0];
				return { name, named: name !== '', status: attributes.status };
			});

			// A deleted file never becomes ready, so waiting for it would burn the
			// full two minutes. But an aged-out thumbnail must not fail a render
			// whose video is fine, so only give up when nothing is left.
			const live = files.filter((file) => file.status !== 'deleted');
			if (files.length > 0 && live.length === 0) {
				throw new NodeOperationError(this.getNode(), 'Shotstack has deleted the files for this render', {
					description:
						'The render is complete, and its hosted files are gone. Shotstack removes Sandbox files after a retention period. Render it again.',
					itemIndex: this.getItemIndex(),
				});
			}

			// The rendered file is what this step is for, whatever Main File Only
			// is set to. A poster may fail without failing the step. The rendered
			// file may not. A file with no name yet is not known to be either.
			const main = live.filter((file) => file.named && !EXTRA_FILES.test(file.name));
			if (main.some((file) => file.status === 'failed')) {
				throw new NodeOperationError(this.getNode(), 'Shotstack did not publish the file', {
					description: 'The render is complete. Send this render ID to Shotstack support.',
					itemIndex: this.getItemIndex(),
				});
			}

			const settled = (file: { status: unknown }) =>
				file.status === 'ready' || file.status === 'failed';

			// Shotstack publishes the poster before the rendered file, so a ready
			// poster on its own is not an answer.
			const mainReady = main.length > 0 && main.every((file) => file.status === 'ready');
			// With Main File Only off the extras come back too, so wait for them to
			// stop moving. A failed extra counts as stopped.
			const extrasSettled = mainFileOnly || live.every(settled);

			if (mainReady && extrasSettled) {
				// Run the real request so the output goes through Simplify.
				return await this.makeRoutingRequest(requestData);
			}

			// No rendered file, but everything present has stopped moving. Waiting
			// cannot change that, so return what there is rather than burn the full
			// two minutes and then report the wrong cause. keepMainFile does the
			// same when its filter leaves nothing.
			if (main.length === 0 && live.length > 0 && live.every(settled)) {
				return await this.makeRoutingRequest(requestData);
			}
		}

		const gap = pollGapMs(attempt, POLL_GAP_MS, MAX_GAP_MS, response);
		if (Date.now() + gap >= deadline) break;
		await sleep(gap);
	}

	if (throttled) {
		throw new NodeOperationError(this.getNode(), 'Shotstack did not publish the file in time', {
			description: RATE_LIMIT_HELP,
			itemIndex: this.getItemIndex(),
		});
	}

	const check = await readRenderStatus.call(this, environment, renderId);
	return describeMissingAsset.call(this, check.known, check.status, check.error, renderId);
};

export const getAssetByRenderIdDescription: INodeProperties[] = [
	{
		displayName: 'Render ID',
		name: 'renderId',
		type: 'string',
		required: true,
		// A render step returns the render as "id"; this step returns it as
		// "renderId". Read either, so any chain works with no setup.
		default: '={{ $json.renderId || $json.id }}',
		placeholder: '4a37ef85-b4d1-4b4a-90be-6515290c5091',
		displayOptions: { show: showOnly },
		description:
			'The ID returned when the render was submitted. This step waits up to two minutes for Shotstack to publish the file, so no extra Wait is needed after the render finishes.',
		routing: {
			request: {
				// The Serve API, not the Edit API, so override the node baseURL.
				baseURL: SERVE_BASE_URL,
				url: '=/assets/render/{{$value}}',
			},
			send: {
				// Not pagination. This runs waitForHostedAsset above.
				paginate: true,
			},
			operations: {
				pagination: waitForHostedAsset,
			},
		},
	},
	{
		displayName: 'Main File Only',
		name: 'mainFileOnly',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnly },
		description:
			'Whether to return only the rendered file. A render also hosts a poster and a thumbnail, and those are separate files. Turn this off to get all of them, one item each',
		routing: {
			output: { postReceive: [keepMainFile] },
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
							// assetId, not id. The spec names this field id inside an
							// asset object, but Simplify flattens that object away, and
							// id means the render everywhere else in this node. Both
							// Render ID fields read the id on the incoming item.
							assetId: '={{$responseItem.attributes?.id}}',
							renderId: '={{$responseItem.attributes?.renderId}}',
							url: '={{$responseItem.attributes?.url}}',
							filename: '={{$responseItem.attributes?.filename}}',
							status: '={{$responseItem.attributes?.status}}',
						},
					},
				],
			},
		},
	},
];
