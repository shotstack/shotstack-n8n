import type {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { RECIPE_REFERENCE } from '../../reference/recipeReference';
import { SKILL_CORE, SKILL_HEADER, SKILL_SOURCE, SKILL_TOPICS } from '../../reference/skill';
import { USER_AGENT } from '../../userAgent';

const showOnly = {
	resource: ['reference'],
};

// Shotstack's whole guide as plain text, written for language models.
const FULL_DOCS_URL = 'https://shotstack.io/docs/guide/llms-full.txt';

/**
 * Builds the answer a language model needs to write a working edit.
 *
 * Two halves, neither of them written here. The allowed values come from the
 * @shotstack/schemas package, and the craft from Shotstack's own agent skill,
 * so an improvement Shotstack makes reaches this node without a rewrite.
 *
 * The request behind it is a real call to /templates. That proves the key
 * works, and it names the templates this account can already render.
 */
const buildReference = async function (
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const includeTemplates = this.getNodeParameter('includeTemplates', true) as boolean;
	const detail = this.getNodeParameter('detail', 'core') as string;

	// A declarative operation must send a request, so this one rides on
	// /templates. The reference itself is in the package, so a refused key must
	// not withhold it: an agent asking how to write an edit would get an auth
	// error instead of the answer that prevents a failed render.
	//
	// Judge the body, not only the status. A proxy or a login redirect answers
	// 200 with HTML, and a status check alone reads that as a real empty list.
	const status = Number(response.statusCode ?? 0);
	const body = (response.body ?? {}) as IDataObject;
	const payload = (body.response ?? {}) as IDataObject;
	const rows = Array.isArray(payload.templates) ? (payload.templates as IDataObject[]) : undefined;
	const listed = status >= 200 && status < 300 && rows !== undefined;

	const templates = (rows ?? []).map((t) => ({ id: t.id, name: t.name }));

	const parts = [RECIPE_REFERENCE, SKILL_HEADER, SKILL_CORE];
	if (detail === 'full' || detail === 'everything') parts.push(SKILL_TOPICS);

	const json: IDataObject = {
		reference: parts.join('\n\n'),
		// So a reader can tell which version of Shotstack's rules they got.
		rulesSource: SKILL_SOURCE,
	};

	if (detail === 'everything') {
		try {
			const docs = (await this.helpers.httpRequest({
				method: 'GET',
				url: FULL_DOCS_URL,
				json: false,
				// Without this a stalled connection blocks the item forever, and
				// the fallback below never runs. The other request paths set it too.
				timeout: 30000,
				headers: { 'User-Agent': USER_AGENT },
			})) as string;
			json.documentation = docs;
			json.documentationChars = String(docs).length;
		} catch {
			// The reference alone is still useful. Report the gap, do not fail.
			json.documentation = '';
			json.documentationError = `The node did not reach ${FULL_DOCS_URL}. The reference above is complete without it.`;
		}
	}

	json.referenceChars = String(json.reference).length;

	if (!listed) {
		json.credentialError =
			status === 401 || status === 403
				? `Shotstack refused the API key (${status}). The reference above is complete and correct, but a render will fail until the credential works. Check the key, and check that its Environment matches the key.`
				: `Shotstack answered ${status} and did not return a template list. The reference above is complete. Nothing is wrong with it.`;
	}

	// Only claim a count when one was really read. An empty array here is
	// indistinguishable from an account with no templates, so an agent would
	// write an edit from nothing over the template the user already built.
	// A missing key says "unknown". A zero says "none exist".
	if (includeTemplates && listed) {
		json.templates = templates;
		json.templateCount = templates.length;
	}
	return [{ json }];
};

export const referenceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnly },
		options: [
			{
				name: 'Get Reference',
				value: 'getReference',
				description:
					"Get everything an AI needs to write an edit: every asset type and allowed value, plus Shotstack's own rules for making a video that works and looks good. Give this to an AI before asking it to write one. The node carries this text, so it calls no Shotstack operation beyond listing your templates.",
				action: 'Get the schema and rules for writing an edit',
				routing: {
					request: {
						method: 'GET',
						// This request is not optional decoration. A declarative
						// operation must send one, and postReceive replaces its answer
						// with the reference. Remove it and the operation returns nothing.
						url: '/templates',
						// A refused key would otherwise throw before postReceive runs and
						// withhold a reference that is already in the package.
						//
						// The listed codes still throw, on purpose. They are transient, and
						// a thrown item is what n8n's Retry On Fail and Continue On Error
						// act on. An item that "succeeded" is never retried.
						ignoreHttpStatusErrors: { ignore: true, except: [408, 429, 500, 502, 503, 504] },
					},
					output: { postReceive: [buildReference] },
				},
			},
		],
		default: 'getReference',
	},
	{
		displayName: 'Detail',
		name: 'detail',
		type: 'options',
		default: 'core',
		displayOptions: { show: { ...showOnly, operation: ['getReference'] } },
		description:
			'How much to hand the model. Core is enough to write a good edit. The larger settings add depth on specific subjects, and need a model with a large context window. This output does not depend on the input item, so put this step once after the trigger rather than inside a loop: it is tens of thousands of characters per item, and n8n keeps every one of them in the execution',
		options: [
			{
				name: 'Core',
				value: 'core',
				description:
					"About 28,000 characters. Every asset type with its nested shape and allowed values, plus Shotstack's core rules for writing an edit.",
			},
			{
				name: 'Full',
				value: 'full',
				description:
					"About 109,000 characters. Adds Shotstack's ten topic guides: timeline, positioning, fonts, motion, captions, HTML, SVG, the asset library and troubleshooting.",
			},
			{
				name: 'Everything',
				value: 'everything',
				description:
					"Adds Shotstack's whole documentation, about 271,000 more characters with 213 worked examples. Fetched when the step runs.",
			},
		],
	},
	{
		displayName: 'Include Templates',
		name: 'includeTemplates',
		type: 'boolean',
		default: true,
		displayOptions: { show: { ...showOnly, operation: ['getReference'] } },
		description:
			'Whether to list the templates saved in this account alongside the reference, so an AI can choose one instead of writing an edit from nothing',
	},
];
