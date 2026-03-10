export const TOKEN_KEY = 'agent_system_token';
export const USER_KEY = 'agent_system_user';

export const AGENT_TYPES = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Claude', value: 'claude' },
  { label: 'MiMo', value: 'mimo' },
  { label: '自定义', value: 'custom' },
] as const;

export const AGENT_STATUS = [
  { label: '活跃', value: 'active', color: 'green' },
  { label: '未激活', value: 'inactive', color: 'default' },
  { label: '异常', value: 'error', color: 'red' },
] as const;

export const PROJECT_STATUS = [
  { label: '待执行', value: 'pending', color: 'gold' },
  { label: '运行中', value: 'running', color: 'blue' },
  { label: '已完成', value: 'completed', color: 'green' },
  { label: '失败', value: 'failed', color: 'red' },
] as const;

export const TASK_STATUS = PROJECT_STATUS;

export const LOG_LEVELS = [
  { label: '信息', value: 'info', color: 'blue' },
  { label: '警告', value: 'warning', color: 'gold' },
  { label: '错误', value: 'error', color: 'red' },
] as const;

export const PRIORITY_OPTIONS = [
  { label: '最低', value: 1 },
  { label: '低', value: 2 },
  { label: '中', value: 3 },
  { label: '高', value: 4 },
  { label: '最高', value: 5 },
] as const;
