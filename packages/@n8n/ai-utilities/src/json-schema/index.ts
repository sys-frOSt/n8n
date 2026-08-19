import type { ZodSchema } from 'zod';
import { zodToJsonSchema, type Options } from 'zod-to-json-schema';

import { toDraft202012 } from './draft-2020-12';

export { JSON_SCHEMA_DRAFT_2020_12, toDraft202012 } from './draft-2020-12';

/**
 * Converts a Zod schema to a JSON Schema Draft 2020-12 document.
 *
 * @param options - Optional conversion settings applied before the Draft 2020-12 transformation.
 * @returns The converted JSON Schema Draft 2020-12 document.
 */
export function zodToDraft202012(
	schema: ZodSchema,
	options?: Partial<Omit<Options<'jsonSchema7'>, 'target'>>,
): Record<string, unknown> {
	return toDraft202012(zodToJsonSchema(schema, { ...options, target: 'jsonSchema7' }));
}
