import { isRecord } from '@n8n/utils/is-record';

export const JSON_SCHEMA_DRAFT_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

const SUBSCHEMA_KEYWORDS = [
	'additionalProperties',
	'contains',
	'contentSchema',
	'else',
	'if',
	'not',
	'propertyNames',
	'then',
	'unevaluatedItems',
	'unevaluatedProperties',
];

const SUBSCHEMA_LIST_KEYWORDS = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];

const SUBSCHEMA_MAP_KEYWORDS = [
	'$defs',
	'definitions',
	'dependentSchemas',
	'patternProperties',
	'properties',
];

const DEFINITIONS_REF_PREFIX = '#/definitions/';

/**
 * Migrates each schema in a keyed collection while preserving its keys.
 *
 * @param subschemas - A keyed collection of schemas or another value.
 * @returns The migrated collection, or the original value when it is not an object.
 */
function migrateEach(subschemas: unknown): unknown {
	if (!isRecord(subschemas)) return subschemas;
	return Object.fromEntries(
		Object.entries(subschemas).map(([name, subschema]) => [name, migrate(subschema)]),
	);
}

/**
 * Applies a draft-style exclusive bound to a migrated schema.
 *
 * @param result - The schema being migrated.
 * @param inclusiveKeyword - The inclusive bound keyword to replace when needed.
 * @param exclusiveKeyword - The corresponding exclusive bound keyword.
 * @param exclusive - The exclusive bound value or boolean conversion flag.
 */
function applyBound(
	result: Record<string, unknown>,
	inclusiveKeyword: 'minimum' | 'maximum',
	exclusiveKeyword: 'exclusiveMinimum' | 'exclusiveMaximum',
	exclusive: unknown,
) {
	if (exclusive === undefined) return;

	const bound = result[inclusiveKeyword];
	if (typeof exclusive !== 'boolean') {
		result[exclusiveKeyword] = exclusive;
	} else if (exclusive && bound !== undefined) {
		delete result[inclusiveKeyword];
		result[exclusiveKeyword] = bound;
	}
}

/**
 * Migrates a schema value to JSON Schema 2020-12 syntax.
 *
 * @param schema - The schema value to migrate.
 * @returns The migrated schema value.
 */
function migrate(schema: unknown): unknown {
	// `true`/`false` are valid schemas, and a malformed document can put anything
	// here; both pass through untouched.
	if (!isRecord(schema)) return schema;

	const { items, additionalItems, dependencies, exclusiveMinimum, exclusiveMaximum, ...rest } =
		schema;
	const result: Record<string, unknown> = {};

	for (const [keyword, value] of Object.entries(rest)) {
		if (SUBSCHEMA_KEYWORDS.includes(keyword)) {
			result[keyword] = migrate(value);
		} else if (SUBSCHEMA_LIST_KEYWORDS.includes(keyword)) {
			result[keyword] = Array.isArray(value) ? value.map(migrate) : value;
		} else if (SUBSCHEMA_MAP_KEYWORDS.includes(keyword)) {
			result[keyword] = migrateEach(value);
		} else if (keyword === '$ref' && typeof value === 'string') {
			result.$ref = value.startsWith(DEFINITIONS_REF_PREFIX)
				? `#/$defs/${value.slice(DEFINITIONS_REF_PREFIX.length)}`
				: value;
		} else {
			result[keyword] = value;
		}
	}

	if (Array.isArray(items)) {
		// 2020-12 moved draft-07's positional tuple schemas to `prefixItems` and
		// reused `items` for what `additionalItems` constrained.
		result.prefixItems = items.map(migrate);
		if (additionalItems !== undefined) result.items = migrate(additionalItems);
	} else if (items !== undefined) {
		result.items = migrate(items);
	}

	if (isRecord(dependencies)) {
		for (const [property, dependency] of Object.entries(dependencies)) {
			const target = Array.isArray(dependency) ? 'dependentRequired' : 'dependentSchemas';
			const bucket = isRecord(result[target]) ? result[target] : {};
			result[target] = {
				...bucket,
				[property]: Array.isArray(dependency) ? dependency : migrate(dependency),
			};
		}
	}

	applyBound(result, 'minimum', 'exclusiveMinimum', exclusiveMinimum);
	applyBound(result, 'maximum', 'exclusiveMaximum', exclusiveMaximum);

	return result;
}

/**
 * Converts a JSON Schema document to JSON Schema 2020-12.
 *
 * @param schema - The JSON Schema document to migrate
 * @returns The migrated JSON Schema 2020-12 document
 */
export function toDraft202012(schema: unknown): Record<string, unknown> {
	const migrated = migrate(schema);
	if (!isRecord(migrated)) return { $schema: JSON_SCHEMA_DRAFT_2020_12 };

	const { $schema: _draft07Dialect, definitions, ...rest } = migrated;

	return {
		$schema: JSON_SCHEMA_DRAFT_2020_12,
		...rest,
		...(definitions !== undefined ? { $defs: definitions } : {}),
	};
}
