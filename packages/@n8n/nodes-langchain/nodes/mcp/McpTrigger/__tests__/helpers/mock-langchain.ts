import type { Tool } from '@langchain/core/tools';
import type { Mocked } from 'vitest';
import { z } from 'zod';

/**
 * Creates a configurable mock tool for testing.
 *
 * @param toolName - The name assigned to the mock tool
 * @param opts - Optional tool description, invocation result or error, metadata, and input schema
 * @returns A mocked tool with the configured properties and invocation behavior
 */
export function createMockTool(
	toolName: string,
	opts: {
		description?: string;
		invokeReturn?: unknown;
		invokeError?: Error;
		metadata?: Record<string, unknown>;
		schema?: z.ZodTypeAny;
	} = {},
): Mocked<Tool> {
	const {
		description = `Mock tool: ${toolName}`,
		invokeReturn = { result: 'success' },
		invokeError,
		metadata,
		schema = z.object({}),
	} = opts;

	const invoke = vi.fn().mockImplementation(async () => {
		await Promise.resolve();
		if (invokeError) {
			throw invokeError;
		}
		return invokeReturn;
	});

	return {
		name: toolName,
		description,
		schema,
		invoke,
		metadata,
	} as unknown as Mocked<Tool>;
}

/**
 * Creates multiple mock tools
 */
export function createMockTools(toolNames: string[]): Array<Mocked<Tool>> {
	return toolNames.map((n) => createMockTool(n));
}
