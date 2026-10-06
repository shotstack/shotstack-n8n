import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteSingleFunctions, IHttpRequestOptions, PreSendAction } from 'n8n-workflow';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isRenderId = (value: string) => UUID.test(value.trim());

/**
 * Rejects anything that is not a render ID before it reaches the URL.
 *
 * The ID is put straight into the path, so an unchecked value can point the
 * request at another endpoint.
 */
export const requireRenderId: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const value = String(this.getNodeParameter('renderId', '') ?? '').trim();
	if (!isRenderId(value)) {
		throw new NodeOperationError(this.getNode(), 'That is not a Shotstack render ID', {
			description: `A render ID looks like 4a37ef85-b4d1-4b4a-90be-6515290c5091. Got "${value}". A render action returns it as "id", and Get Asset by Render ID returns it as "renderId".`,
			itemIndex: this.getItemIndex(),
		});
	}
	return requestOptions;
};

/** The same guard for a generation job ID, which also goes straight into a path. */
export const requireGenerationId: PreSendAction = async function (
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
) {
	const value = String(this.getNodeParameter('generationId', '') ?? '').trim();
	if (!isRenderId(value)) {
		throw new NodeOperationError(this.getNode(), 'That is not a Shotstack generation ID', {
			description: `A generation ID looks like 8a1f2c3d-4e5b-5a6c-9d7e-1f2a3b4c5d6e. Got "${value}". Generate Asset returns it as "id".`,
			itemIndex: this.getItemIndex(),
		});
	}
	return requestOptions;
};
