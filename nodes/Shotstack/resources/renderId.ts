import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteSingleFunctions, IHttpRequestOptions, PreSendAction } from 'n8n-workflow';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isRenderId = (value: string) => UUID.test(value.trim());

/**
 * Rejects anything that is not a job ID before it reaches the URL.
 *
 * The ID is put straight into the path, so an unchecked value can point the
 * request at another endpoint.
 */
const requireId = (param: string, job: string, example: string, source: string): PreSendAction =>
	async function (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions) {
		const value = String(this.getNodeParameter(param, '') ?? '').trim();
		if (!isRenderId(value)) {
			throw new NodeOperationError(this.getNode(), `That is not a Shotstack ${job} ID`, {
				description: `A ${job} ID looks like ${example}. Got "${value}". ${source}`,
				itemIndex: this.getItemIndex(),
			});
		}
		return requestOptions;
	};

export const requireRenderId = requireId(
	'renderId',
	'render',
	'4a37ef85-b4d1-4b4a-90be-6515290c5091',
	'A render action returns it as "id", and Get Asset by Render ID returns it as "renderId".',
);

export const requireGenerationId = requireId(
	'generationId',
	'generation',
	'8a1f2c3d-4e5b-5a6c-9d7e-1f2a3b4c5d6e',
	'Generate Asset returns it as "id".',
);
