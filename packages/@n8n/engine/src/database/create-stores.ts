import type { DataSource } from '@n8n/typeorm';

import { WorkflowExecution, WorkflowStepExecution } from './entities';
import { TypeOrmExecutionStore } from './typeorm-execution-store';
import { TypeOrmStepStore } from './typeorm-step-store';
import type { ExecutionStore } from '../execution/execution-store';
import type { StepStore } from '../execution/step-store';

/** The engine's own persistence, for hosts that must read the data it writes. */
export interface EngineStores {
	executionStore: ExecutionStore;
	stepStore: StepStore;
}

/**
 * Creates execution and step stores backed by the specified data source.
 *
 * @param dataSource - The data source providing repositories for workflow executions and steps
 * @returns The execution and step stores
 */
export function createStores(dataSource: DataSource): EngineStores {
	return {
		executionStore: new TypeOrmExecutionStore(dataSource.getRepository(WorkflowExecution)),
		stepStore: new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution)),
	};
}
