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
