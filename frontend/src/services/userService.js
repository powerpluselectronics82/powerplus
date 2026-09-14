import api from './api';

export const userService = {
  register: async (userData) => {
    return await api.post('/register', userData);
  },

  getAllUsers: async () => {
    return await api.get('/users');
  },

  getBranchUsers: async (branchId) => {
    return await api.get(`/users/branch/${branchId}`);
  },

  toggleUserStatus: async (userId) => {
    return await api.patch(`/users/toggleStatus/${userId}`);
  },
};
