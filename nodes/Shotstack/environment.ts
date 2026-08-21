/**
 * Turns the credential's Environment into the path segment the API expects.
 *
 * The credential stores `sandbox` or `production`. The URL needs `stage` or
 * `v1`. Keep the API version out of the credential: a credential is a row the
 * user owns, and no release of this node can change one that already exists.
 */
const API_PATH: Record<string, string> = {
	sandbox: 'stage',
	production: 'v1',
};

/** An unrecognised value falls to sandbox, which cannot spend credits. */
export const apiPathFor = (environment: unknown): string =>
	API_PATH[String(environment ?? '')] ?? 'stage';

// n8n evaluates a routing baseURL itself and cannot call apiPathFor, so the
// same mapping is written again for the expression engine. Keep the two in
// step; test/environment-mapping.mjs fails if they disagree.
const PATH_EXPRESSION = '{{ $credentials?.environment === "production" ? "v1" : "stage" }}';

export const EDIT_BASE_URL = `=https://api.shotstack.io/edit/${PATH_EXPRESSION}`;

export const SERVE_BASE_URL = `=https://api.shotstack.io/serve/${PATH_EXPRESSION}`;
