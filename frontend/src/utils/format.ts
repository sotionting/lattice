import dayjs from 'dayjs';

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export function formatShortDate(date: string | null | undefined): string {
  if (!date) return '-';
  return dayjs(date).format('MM-DD HH:mm');
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'green',
    inactive: 'default',
    error: 'red',
    pending: 'gold',
    running: 'blue',
    completed: 'green',
    failed: 'red',
  };
  return map[status] || 'default';
}

export function getLogLevelColor(level: string): string {
  const map: Record<string, string> = {
    info: 'blue',
    warning: 'gold',
    error: 'red',
  };
  return map[level] || 'default';
}
