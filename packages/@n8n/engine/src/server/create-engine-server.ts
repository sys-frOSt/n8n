import express, { type Application } from 'express';

import type { StartExecutionService } from '../execution/start-execution.service';
import { createWorkflowExecutionsRouter } from './routes/workflow-executions';

/**
 * Creates the engine HTTP application with health and workflow execution endpoints.
 *
 * @param startExecution - Service used to start workflow executions
 * @returns The configured Express application
 */
export function createEngineServer(startExecution: StartExecutionService): { app: Application } {
	const app = express();
	app.use(express.json());

	app.get('/healthz', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	app.use('/api/workflow-executions', createWorkflowExecutionsRouter(startExecution));

	return { app };
}
