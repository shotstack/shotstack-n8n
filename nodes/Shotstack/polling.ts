import type { IDataObject } from 'n8n-workflow';

/** Never wait longer than this between polls, whatever Retry-After asks for. */
const CEILING_MS = 60000;

export type PollResponse = { statusCode?: number; headers?: IDataObject };

export const isRateLimited = (response?: PollResponse): boolean => response?.statusCode === 429;

/**
 * How long to wait before polling again.
 *
 * The gap doubles every third attempt. A long wait then spends far fewer
 * requests on a render that is still going.
 *
 * A 429 means Shotstack is throttling this account. Polling again on the
 * normal gap adds load to the account already being throttled, so back off
 * further and use Retry-After when Shotstack sends one.
 */
export function pollGapMs(
	attempt: number,
	baseMs: number,
	maxMs: number,
	response?: PollResponse,
): number {
	const grown = Math.min(maxMs, baseMs * 2 ** Math.floor(attempt / 3));
	if (!isRateLimited(response)) return grown;

	const header = response?.headers?.['retry-after'];
	const seconds = Number(Array.isArray(header) ? header[0] : header);
	// Retry-After may hold a date instead of seconds. A date parses to NaN, and
	// the doubled gap covers that case.
	const asked = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
	return Math.min(CEILING_MS, Math.max(grown * 2, asked));
}

/** Names the cause when a wait ends while Shotstack was throttling us. */
export const RATE_LIMIT_HELP =
	'Shotstack rate limited this account while the node was waiting. Production allows 300 Edit and 600 Serve requests a minute, Sandbox half that. Run fewer items at once, or use a Callback URL on Render Asset instead of waiting.';
