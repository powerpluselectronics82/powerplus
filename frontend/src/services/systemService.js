import api from './api';

export const systemService = {
  getHealth: async () => {
    return await api.get('/health/db');
  },

  getAuditLogs: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.action) searchParams.append('action', params.action);
    if (params.resource) searchParams.append('resource', params.resource);
    return await api.get(`/audit-logs?${searchParams.toString()}`);
  },

  exportAuditLogs: async () => {
    return await api.get('/audit-logs/export');
  },

  clearAuditLogs: async () => {
    return await api.delete('/audit-logs/clear');
  },
};
