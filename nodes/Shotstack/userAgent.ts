/**
 * Names this node in Shotstack's render log.
 *
 * Every request must send it. n8n replaces a missing User-Agent with a bare
 * "n8n", which is what a plain HTTP Request node sends, so the render becomes
 * uncountable. No version: a literal goes stale on the next release.
 */
export const USER_AGENT = 'shotstack-n8n-node';
