import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { TELEMETRY_HEADERS } from '../telemetry';
import { apiPathFor } from '../environment';

type GenerationModel = {
	model: string;
	type: string;
	name?: string;
	available?: boolean;
};

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

	const models = ((response?.models ?? []) as GenerationModel[])
		// `available` is omitted when the account's access cannot be read. Only a
		// stated false means the plan does not include the model.
		.filter((m) => m.available !== false)
		.filter((m) => !assetType || m.type === assetType)
		.sort((a, b) => (a.name ?? a.model).localeCompare(b.name ?? b.model));

	// Empty leaves `model` out of the request, so the API picks its own default
	// for the asset type. Listed first so it is the obvious choice.
	return [
		{ name: 'Default for This Asset Type', value: '' },
		...models.map((m) => ({ name: m.name || m.model, value: m.model })),
	];
}
