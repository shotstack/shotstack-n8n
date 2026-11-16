import { NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	ResourceMapperFields,
} from 'n8n-workflow';
import { apiPathFor } from '../environment';
import { TELEMETRY_HEADERS } from '../telemetry';

export type MergeField = { find: string; replace: unknown };

// n8n starts every item of a run at once, so the items share one lookup instead of
// making one each. Keyed by run, so a template edited in Studio between runs is read fresh.
const lookups = new Map<string, Promise<MergeField[]>>();

/** The template's merge fields as saved in Shotstack, each with the template's own value. */
export async function templateMerge(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
	id: string,
): Promise<MergeField[]> {
	const credentials = await this.getCredentials('shotstackApi');
	const path = apiPathFor(credentials?.environment);
	const run = this.getExecutionId();
	const key = `${run}:${path}:${id}`;
	let lookup = run ? lookups.get(key) : undefined;
	if (!lookup) {
		lookup = (async () => {
			const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'shotstackApi', {
				method: 'GET',
				url: `https://api.shotstack.io/edit/${path}/templates/${encodeURIComponent(id)}`,
				json: true,
				timeout: 30000,
				headers: { ...TELEMETRY_HEADERS },
			})) as IDataObject;
			const template = ((response?.response as IDataObject | undefined)?.template ?? {}) as IDataObject;
			const merge = Array.isArray(template.merge) ? (template.merge as MergeField[]) : [];
			return merge.filter((field) => typeof field?.find === 'string' && field.find !== '');
		})();
		if (run) {
			if (lookups.size >= 100) lookups.clear();
			lookups.set(key, lookup);
			// Retry On Fail runs the step again inside the same run, so a failed lookup is dropped.
			lookup.catch(() => lookups.delete(key));
		}
	}

	try {
		return await lookup;
	} catch (error) {
		// A new error for each caller, since n8n writes the item index onto the error it gets.
		const status = String((error as { httpCode?: unknown }).httpCode ?? '');
		const refused = status === '401' || status === '403';
		throw new NodeOperationError(
			this.getNode(),
			refused ? 'Shotstack refused the API key' : "Couldn't read the template's merge fields",
			{
				description: refused
					? 'Check the key, and check that the credential environment matches it. Sandbox and Production keep separate templates.'
					: `${(error as Error).message}. Check that the template exists in the credential's environment.`,
				...('getItemIndex' in this ? { itemIndex: (this as IExecuteSingleFunctions).getItemIndex() } : {}),
			},
		);
	}
}

/** Lists the chosen template's merge fields, one input each, so nobody types placeholder names. */
export async function getTemplateFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const id = this.getNodeParameter('templateId', '', { extractValue: true }) as string;
	if (!id) return { fields: [] };
	return {
		fields: (await templateMerge.call(this, id)).map(({ find }) => ({
			id: find,
			displayName: find,
			required: false,
			defaultMatch: false,
			canBeUsedToMatch: false,
			display: true,
			// Text inputs throughout. The render step gives each value the type of the
			// template's own value, which n8n's type check would refuse before it could.
			type: 'string',
		})),
	};
}
