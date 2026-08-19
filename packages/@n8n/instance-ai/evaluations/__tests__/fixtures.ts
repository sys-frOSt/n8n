import type { EvaluationConfigDto, InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';

import type { WorkflowResponse } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import type { WorkflowTestCase } from '../types';

/** Shared fixture builders for artifact-handler and outcome tests — see individual test files for usage. */

export const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

export function agentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'builder',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

/**
 * Creates a completed assistant message containing the supplied agent tree.
 *
 * @param agentTree - The agent tree associated with the message
 * @returns A non-streaming assistant message with empty content and reasoning
 */
export function assistantMessage(agentTree: InstanceAiAgentNode): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		createdAt: new Date().toISOString(),
		content: '',
		reasoning: '',
		isStreaming: false,
		agentTree,
	};
}

/**
 * Creates an inactive workflow fixture with optional property overrides.
 *
 * @param id - The workflow identifier used to populate the workflow and version IDs
 * @param overrides - Workflow properties that replace the default fixture values
 * @returns A workflow response fixture
 */
export function workflow(id: string, overrides: Partial<WorkflowResponse> = {}): WorkflowResponse {
	return {
		id,
		name: `Workflow ${id}`,
		active: false,
		versionId: `version-${id}`,
		nodes: [],
		connections: {},
		...overrides,
	};
}

export function baseTestCase(overrides: Partial<WorkflowTestCase> = {}): WorkflowTestCase {
	return { complexity: 'simple', tags: [], datasets: ['full'], ...overrides };
}

export function dataTableConfig(workflowId: string, dataTableId: string): EvaluationConfigDto {
	return {
		id: 'config-1',
		workflowId,
		name: 'My eval',
		status: 'valid',
		invalidReason: null,
		startNodeName: 'Start',
		endNodeName: 'End',
		metrics: [
			{
				id: 'metric-1',
				name: 'Correctness',
				type: 'llm_judge',
				config: {
					preset: 'correctness',
					provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					credentialId: 'cred-judge',
					model: 'gpt-4.1',
					outputType: 'numeric',
					inputs: { actualAnswer: '={{ $json.actual }}', expectedAnswer: '={{ $json.expected }}' },
				},
			},
		],
		datasetSource: 'data_table',
		datasetRef: { dataTableId },
	};
}
