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

const showOnly = {
	resource: ['asset'],
	operation: ['getAssetByRenderId'],
};

const POLL_GAP_MS = 3000;
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
 * file, and Download File saves a JPEG named like a video.
 */
const keepMainFile: PostReceiveAction = async function (
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
) {
	if (!this.getNodeParameter('mainFileOnly', true)) return items;

	const nameOf = (item: INodeExecutionData) => {
		const json = item.json as IDataObject;
		const attributes = (json.attributes ?? json) as IDataObject;
		return String(attributes.filename ?? attributes.url ?? '').split('?')[0];
	};

	const main = items.filter((item) => !EXTRA_FILES.test(nameOf(item)));
	// Keep everything rather than nothing if the naming ever changes.
	return main.length > 0 ? main : items;
};

const environmentFrom = (baseURL: string) => (baseURL.includes('/serve/v1') ? 'v1' : 'stage');

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
	const environment = environmentFrom(baseURL);
	const renderId = String(this.getNodeParameter('renderId', '') ?? '').trim();

	// The wait loop below builds its own requests, so check the ID here too.
	if (!isRenderId(renderId)) {
		throw new NodeOperationError(this.getNode(), 'That is not a Shotstack render ID', {
			description: `A render ID looks like 4a37ef85-b4d1-4b4a-90be-6515290c5091. Got "${renderId}". The render actions return it as "id".`,
			itemIndex: this.getItemIndex(),
		});
	}

	const attempts = Math.ceil(MAX_WAIT_MS / POLL_GAP_MS);

	for (let attempt = 0; attempt < attempts; attempt++) {
		let response: { statusCode: number; body: IDataObject } | undefined;
		try {
			response = (await this.helpers.httpRequestWithAuthentication.call(this, 'shotstackApi', {
				method: 'GET',
				url,
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: 30000,
				headers: { 'User-Agent': USER_AGENT },
			})) as { statusCode: number; body: IDataObject };
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
			// A render can host more than one file: the video, and a poster or
			// thumbnail. Wait for all of them, or the next step can be handed a
			// poster image while the video is still uploading.
			const assets = (response.body?.data ?? []) as IDataObject[];
			const states = assets.map((a) => (a.attributes as IDataObject)?.status);

			if (states.some((s) => s === 'failed')) {
				throw new NodeOperationError(this.getNode(), 'Shotstack did not publish the file', {
					description: 'The render is complete. Send this render ID to Shotstack support.',
					itemIndex: this.getItemIndex(),
				});
			}
			// A deleted file never becomes ready, so waiting for it would burn the
			// full two minutes. But an aged-out thumbnail must not fail a render
			// whose video is fine, so only give up when nothing is left.
			const live = states.filter((s) => s !== 'deleted');
			if (states.length > 0 && live.length === 0) {
				throw new NodeOperationError(this.getNode(), 'Shotstack has deleted the files for this render', {
					description:
						'The render is complete, and its hosted files are gone. Shotstack removes Sandbox files after a retention period. Render it again.',
					itemIndex: this.getItemIndex(),
				});
			}
			if (live.length > 0 && live.every((s) => s === 'ready')) {
				// Run the real request so the output goes through Simplify.
				return await this.makeRoutingRequest(requestData);
			}
		}

		await sleep(POLL_GAP_MS);
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
		// Both render operations return the id as "id", so the chain needs no setup.
		default: '={{ $json.id }}',
		placeholder: '4a37ef85-b4d1-4b4a-90be-6515290c5091',
		displayOptions: { show: showOnly },
		description:
			'The ID returned when the render was submitted. This step waits up to two minutes for Shotstack to publish the file, so no extra Wait is needed after the render finishes.',
		routing: {
			request: {
				// The Serve API, not the Edit API, so override the node baseURL.
				baseURL: '=https://api.shotstack.io/serve/{{$credentials.environment}}',
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
			'Whether to return only the rendered video. A render also hosts a poster and a thumbnail, and those are separate files. Turn this off to get all of them, one item each',
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
							id: '={{$responseItem.attributes?.id}}',
							renderId: '={{$responseItem.attributes?.renderId}}',
							url: '={{$responseItem.attributes?.url}}',
							filename: '={{$responseItem.attributes?.filename}}',
							filesize: '={{$responseItem.attributes?.filesize}}',
							status: '={{$responseItem.attributes?.status}}',
						},
					},
				],
			},
		},
	},
];
