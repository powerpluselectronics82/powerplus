import api from './api';

export const branchService = {
  addBranch: async (branchData) => {
    return await api.post('/addBranch', branchData);
  },

  getAllBranches: async () => {
    return await api.get('/branches');
  },

  getBranchById: async (branchId) => {
    return await api.get(`/branches/${branchId}`);
  },

  updateBranchManager: async (branchId, managerData) => {
    return await api.patch(`/brancheUpdate/${branchId}`, managerData);
  },

  toggleBranchStatus: async (branchId) => {
    return await api.patch(`/brancheStatus/${branchId}`);
  },
};
