import { USER_AGENT } from './userAgent';

/**
 * Names this node in Shotstack's render log.
 *
 * origin is a fixed vocabulary Shotstack already keeps: api, cli, mcp, studio,
 * playground, dashboard. This node adds n8n. The API reads the header and
 * records it. A request that omits it is recorded as plain api traffic.
 *
 * Only this node can send it. A community node, or n8n's own HTTP Request
 * node, cannot. So origin n8n counts this node, and n8n traffic that is not
 * this node stays under api, where the User-Agent still names n8n.
 *
 * Send it on every request. A render that misses it is counted as something
 * else, and nothing joins it back later.
 */
export const TELEMETRY_HEADERS = {
	'User-Agent': USER_AGENT,
	'x-shotstack-origin': 'n8n',
};
