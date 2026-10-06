import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, IExecuteSingleFunctions } from 'n8n-workflow';

/**
 * Reads a JSON field as an object, or undefined when it is left empty.
 *
 * The field holds text in fixed mode and a parsed value in expression mode, so
 * both become text and go through one parse.
 */
export function jsonObjectParam(
	this: IExecuteSingleFunctions,
	name: string,
	label: string,
	help: string,
): IDataObject | undefined {
	const raw = this.getNodeParameter(name, '');
	const text = typeof raw === 'string' ? raw.trim() : JSON.stringify(raw ?? {});
	if (!text || text === '{}') return undefined;

	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `${label} is not valid JSON`, {
			description: (error as Error).message,
			itemIndex: this.getItemIndex(),
		});
	}

	// A bare string, number or array parses cleanly and then spreads into numbered
	// keys, which Shotstack rejects with nothing the user can act on.
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		const got = Array.isArray(value) ? 'an array' : value === null ? 'null' : typeof value;
		throw new NodeOperationError(this.getNode(), `${label} is not a JSON object`, {
			description: `${help} Got ${got}.`,
			itemIndex: this.getItemIndex(),
		});
	}
	return value as IDataObject;
}
