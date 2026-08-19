import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	IDataObject,
} from 'n8n-workflow';

type TemplateSummary = {
	id: string;
	name: string;
	updated?: string;
	created?: string;
};

/**
 * Lists the templates in the user's Shotstack account, so they can pick one by
 * name instead of pasting an ID. Newest first.
 */
export async function getTemplates(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('shotstackApi');
	const environment = (credentials?.environment as string) ?? 'stage';

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'shotstackApi', {
		method: 'GET',
		url: `https://api.shotstack.io/edit/${environment}/templates`,
		json: true,
	})) as IDataObject;

	const payload = (response?.response ?? {}) as IDataObject;
	const templates = (payload.templates ?? []) as TemplateSummary[];

	const sorted = [...templates].sort((a, b) =>
		String(b.updated ?? b.created ?? '').localeCompare(String(a.updated ?? a.created ?? '')),
	);

	const needle = filter?.toLowerCase().trim();
	const matched = needle
		? sorted.filter((t) => (t.name ?? '').toLowerCase().includes(needle))
		: sorted;

	const results: INodeListSearchItems[] = matched.map((t) => ({
		name: t.name || t.id,
		value: t.id,
	}));

	return { results };
}
