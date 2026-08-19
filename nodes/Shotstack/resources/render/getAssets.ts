import { NodeOperationError, sleep } from 'n8n-workflow';
import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

const showOnly = {
	resource: ['render'],
	operation: ['getAssets'],
};

const POLL_GAP_MS = 3000;
const MAX_WAIT_MS = 120000;
// After this many empty answers, ask the Edit API whether waiting can ever
// work. A missing or failed render never becomes a hosted file.
const CHECK_RENDER_AFTER = 3;

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
			: 'Shotstack gave no reason. Open the render in the Shotstack dashboard.';
	} else if (status === undefined) {
		message = `Shotstack has no render with the ID ${renderId}`;
		description =
			'Check the Render ID, and check that the credential uses the same environment that started the render. A sandbox render is invisible to a production key.';
	} else if (status !== 'done') {
		message = `The render is still ${status} after ${MAX_WAIT_MS / 1000} seconds`;
		description = 'Long renders need a longer Wait before this step.';
	} else {
		message = `The render finished, but Shotstack has not published the file after ${MAX_WAIT_MS / 1000} seconds`;
		description =
			'This is unusual. The render is fine. Run this step again in a minute, or read the temporary URL from the Get action instead.';
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
	const renderId = String(this.getNodeParameter('renderId', '') ?? '');

	const attempts = Math.ceil(MAX_WAIT_MS / POLL_GAP_MS);

	for (let attempt = 0; attempt < attempts; attempt++) {
		const response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'shotstackApi',
			{
				method: 'GET',
				url,
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			},
		)) as { statusCode: number; body: IDataObject };

		// A rejected key never becomes a good key.
		if (response.statusCode === 401 || response.statusCode === 403) {
			break;
		}

		// Waiting only helps while the render is on its way. Check once, early, so
		// a wrong ID or a failed render reports in ten seconds, not two minutes.
		if (attempt === CHECK_RENDER_AFTER && response.statusCode !== 200) {
			const check = await readRenderStatus.call(this, environment, renderId);
			// Stop early only on a definite answer.
			if (check.known && (check.status === undefined || check.status === 'failed')) {
				return describeMissingAsset.call(this, true, check.status, check.error, renderId);
			}
		}

		if (response.statusCode === 200) {
			const first = ((response.body?.data ?? []) as IDataObject[])[0];
			const assetStatus = ((first?.attributes ?? {}) as IDataObject).status;
			if (assetStatus === 'ready') {
				// Run the real request so the output goes through Simplify.
				return await this.makeRoutingRequest(requestData);
			}
			if (assetStatus === 'failed') {
				throw new NodeOperationError(this.getNode(), 'Shotstack failed to publish the file', {
					description: 'The render worked. Hosting did not. Report this render ID to Shotstack.',
					itemIndex: this.getItemIndex(),
				});
			}
		}

		await sleep(POLL_GAP_MS);
	}

	// Out of patience, or the key was refused. Either way, say why.
	const check = await readRenderStatus.call(this, environment, renderId);
	return describeMissingAsset.call(this, check.known, check.status, check.error, renderId);
};

export const renderGetAssetsDescription: INodeProperties[] = [
	{
		displayName: 'Render ID',
		name: 'renderId',
		type: 'string',
		required: true,
		default: '',
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
