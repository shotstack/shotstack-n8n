import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { TELEMETRY_HEADERS } from '../telemetry';
import { apiPathFor } from '../environment';

type GenerationModel = {
	model?: unknown;
	type?: unknown;
	name?: unknown;
	available?: unknown;
};

/**
 * What the dropdown shows for a model.
 *
 * `||` not `??`: a model sent with an empty name has no name. `??` keeps the
 * empty string, which sorts above everything and then renders as the model ID,
 * so the list is visibly out of order.
 */
const label = (m: GenerationModel) => String(m.name || m.model || '');

/**
 * Lists the generation models the account can use, for the Model dropdown.
 *
 * Fetched rather than hard coded: a model launched after this release shows up
 * without one. Filtered by the chosen asset type, because a video model in an
 * image picker only produces a 400.
 */
export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('shotstackApi');
	const assetType = String(this.getCurrentNodeParameter('assetType') ?? '');

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'shotstackApi', {
		method: 'GET',
		url: `https://api.shotstack.io/edit/${apiPathFor(credentials?.environment)}/models`,
		json: true,
		timeout: 30000,
		headers: { ...TELEMETRY_HEADERS },
	})) as IDataObject;

	const listed = Array.isArray(response?.models) ? (response.models as GenerationModel[]) : [];
	const models = listed
		// `model` is what gets sent, so a row without one cannot be chosen. One
		// malformed row must not take the whole picker down with it either: this
		// is a live API response, not something the types can promise.
		.filter((m) => m && typeof m === 'object' && String(m.model ?? ''))
		// `available` is omitted when the account's access cannot be read. Only a
		// stated false means the plan does not include the model.
		.filter((m) => m.available !== false)
		.filter((m) => !assetType || m.type === assetType)
		.sort((a, b) => label(a).localeCompare(label(b)));

	// Empty leaves `model` out of the request, so the API picks its own default
	// for the asset type. Listed first so it is the obvious choice.
	return [
		{ name: 'Default for This Asset Type', value: '' },
		...models.map((m) => ({ name: label(m), value: String(m.model ?? '') })),
	];
}
