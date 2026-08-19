import type { DataSource } from '@n8n/typeorm';
import type { Application } from 'express';

import type { AdmittanceService } from '../admittance';
import { createStores } from '../database';
import type { EngineStores } from '../database';
import type { ExternalDependencies } from '../dependencies';
import {
	ExecutionStartHandler,
	OrchestrationWorker,
	StartExecutionService,
	StepReadyHandler,
	StepSettledHandler,
	StepWorker,
} from '../execution';
import { InMemoryWorkQueue } from '../queue';
import type { OrchestrationMessage, StepMessage } from '../queue';
import { createEngineServer } from '../server';

export interface EngineRuntimeOptions {
	/** The data plane database, already initialized and migrated. */
	dataSource: DataSource;
	admittance: AdmittanceService;
	/**
	 * Builds the capabilities the engine does not own. It receives the engine's
	 * stores, because a `v1-node` executor reads step data through them and the
	 * runtime owns them.
	 *
	 * Standalone mode omits it, so `v1-node` steps fail as unimplemented: the v1
	 * executor lives in `@n8n/node-engine-compatibility`, which depends on this
	 * package, so only an integrated host can supply it.
	 */
	externalDependencies?: (stores: EngineStores) => ExternalDependencies;
}

/** A built engine, ready for a host to serve. */
export interface EngineRuntime {
	/** The engine HTTP app. The host decides where, and whether, to listen. */
	app: Application;
	/** Starts consuming the engine's queues. */
	start(): void;
	/** Stops the engine's workers. The host still owns its listener and its `DataSource`. */
	stop(): Promise<void>;
}

/**
 * Creates an engine runtime from host-provided data and execution dependencies.
 *
 * The runtime exposes an HTTP application and lifecycle methods for starting and
 * stopping its workers. Stopping waits for in-progress work while queued
 * in-memory work is discarded.
 *
 * @param options - Data source, admittance policy, and optional external dependencies.
 * @returns The configured engine runtime.
 */
export function createEngineRuntime({
	dataSource,
	admittance,
	externalDependencies,
}: EngineRuntimeOptions): EngineRuntime {
	const orchestrationQueue = new InMemoryWorkQueue<OrchestrationMessage>();
	const stepQueue = new InMemoryWorkQueue<StepMessage>();
	const { executionStore, stepStore } = createStores(dataSource);

	const orchestrationWorker = new OrchestrationWorker(
		orchestrationQueue,
		new ExecutionStartHandler(executionStore, stepStore, orchestrationQueue),
		new StepSettledHandler(executionStore, stepStore, stepQueue, orchestrationQueue),
	);
	const stepWorker = new StepWorker(
		stepQueue,
		new StepReadyHandler(
			executionStore,
			stepStore,
			orchestrationQueue,
			externalDependencies?.({ executionStore, stepStore }) ?? {},
		),
	);

	const { app } = createEngineServer(
		new StartExecutionService(admittance, executionStore, orchestrationQueue),
	);

	return {
		app,

		start: () => {
			orchestrationWorker.start();
			stepWorker.start();
		},

		stop: async () => {
			// TODO(CAT-3882): drain in-flight work instead. Stopping a worker waits
			// only for whatever it is mid-handling; anything queued behind it is
			// dropped, since the in-memory queues die with the process.
			await Promise.all([orchestrationWorker.stop(), stepWorker.stop()]);
		},
	};
}
