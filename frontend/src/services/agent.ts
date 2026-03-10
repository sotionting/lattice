import api from './api';

export interface AgentType {
  type: string;
  name: string;
  desc: string;
}

export interface AgentModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  is_default: boolean;
}

export interface AgentRunResult {
  agent_type: string;
  model_name: string;
  result: string;
}

export const agentService = {
  getTypes: () =>
    api.get('/agent/types'),

  getModels: () =>
    api.get('/agent/models'),

  run: (params: { agent_type: string; prompt: string; model_id?: string; csv_path?: string }) =>
    api.post('/agent/run', params),
};
