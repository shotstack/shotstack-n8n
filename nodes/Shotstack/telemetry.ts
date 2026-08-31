import { USER_AGENT } from './userAgent';

/**
 * Names this node in Shotstack's render log.
 *
 * Send these on every request. The wait loops and the template picker build
 * their own, so they must spread this rather than write a headers block.
 * A render that misses it is counted as plain api traffic instead.
 */
export const TELEMETRY_HEADERS = {
	'User-Agent': USER_AGENT,
	'x-shotstack-origin': 'n8n',
};
