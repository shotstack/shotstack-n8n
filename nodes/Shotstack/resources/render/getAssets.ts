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

/** Reads "stage" or "v1" back out of the resolved Serve API address. */
const environmentFrom = (baseURL: string) => (baseURL.includes('/serve/v1') ? 'v1' : 'stage');

/**
 * Asks the Edit API why there is still no hosted file, so the node can report
 * the real cause instead of a bare 404.
 */
async function readRenderStatus(
	this: IExecutePaginationFunctions,
	environment: string,
	renderId: string,
): Promise<{ status?: string; error?: string }> {
	try {
		const render = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'shotstackApi',
			{
				method: 'GET',
				url: `https://api.shotstack.io/edit/${environment}/render/${renderId}`,
				json: true,
				ignoreHttpStatusErrors: true,
			},
		)) as IDataObject;
		const body = (render?.response ?? {}) as IDataObject;
		return {
			status: typeof body.status === 'string' ? body.status : undefined,
			error: typeof body.error === 'string' ? body.error : undefined,
		};
	} catch {
		// This call only improves the message. Never let it replace the real
		// problem with a second one.
		return {};
	}
}

/** Turns "no hosted file" into a sentence that names the real cause. */
function describeMissingAsset(
	this: IExecutePaginationFunctions,
	status: string | undefined,
	renderError: string | undefined,
	renderId: string,
): never {
	let message: string;
	let description: string;

	if (status === 'failed') {
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
 * Shotstack finishes a render and publishes the file as two separate steps. In
 * the gap between them the Serve API answers 404. The gap is not fixed: one
 * measurement was 7 seconds, another was over 23. A Wait node cannot be set to
 * a number that always works, so the node waits here instead. The user
 * configures nothing.
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

		// Waiting only helps while the render is on its way. Check once, early,
		// so a wrong ID or a failed render reports in ten seconds, not two
		// minutes.
		if (attempt === CHECK_RENDER_AFTER && response.statusCode !== 200) {
			const { status, error } = await readRenderStatus.call(this, environment, renderId);
			if (status === undefined || status === 'failed') {
				return describeMissingAsset.call(this, status, error, renderId);
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
	const { status, error } = await readRenderStatus.call(this, environment, renderId);
	return describeMissingAsset.call(this, status, error, renderId);
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
				// The hosted asset lives behind the Serve API, which sits on a
				// different base path from the Edit API, so override baseURL here.
				baseURL: '=https://api.shotstack.io/serve/{{$credentials.environment}}',
				url: '=/assets/render/{{$value}}',
			},
			send: {
				// Turns on the wait loop below.
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
