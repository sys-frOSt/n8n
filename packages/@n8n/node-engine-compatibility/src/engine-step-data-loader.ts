import type { ExecutionStore, StepSlots, StepStore } from '@n8n/engine';

import type { StepData, StepDataLoader } from './types';

/**
 * Creates a step data loader backed by the execution and step stores.
 *
 * The loader retrieves the execution graph and outputs for completed steps with
 * non-null outputs. Unfinished steps are omitted so references to them produce
 * the standard "hasn't been executed" error.
 *
 * @returns A loader that provides the execution graph and step outputs indexed by node ID.
 */
export function createEngineStepDataLoader(
	executionStore: ExecutionStore,
	stepStore: StepStore,
): StepDataLoader {
	return async (context): Promise<StepData> => {
		const execution = await executionStore.loadExecution(context.executionId);

		// TODO(CAT-2875): Expressions inside loop bodies resolve run-indexed.
		// iteration 0 is every row there is until the engine executes loops.
		const keys = execution.graph.nodes.map((node) => ({ nodeId: node.id, iteration: 0 }));
		const stored = await stepStore.loadStepsByKeys(context.executionId, keys);

		const outputsByNodeId: Record<string, StepSlots> = {};
		for (const row of Object.values(stored)) {
			if (row.status === 'completed' && row.outputs !== null)
				outputsByNodeId[row.nodeId] = row.outputs;
		}

		return { graph: execution.graph, outputsByNodeId };
	};
}
