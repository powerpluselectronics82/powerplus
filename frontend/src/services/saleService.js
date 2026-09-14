import api from './api';

export const saleService = {
  createSale: async (saleData) => {
    return await api.post('/create', saleData);
  },

  getAllSales: async () => {
    return await api.get('/allSales');
  },

  getBranchSales: async (branchId) => {
    return await api.get(`/branchSales/${branchId}`);
  },

  getBranchMonthlySales: async (branchId, month = '') => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await api.get(`/branchSales/${branchId}/month${query}`);
  },

  getSaleById: async (saleId) => {
    return await api.get(`/detail/${saleId}`);
  },

  getCashierTodaySales: async (cashierId) => {
    return await api.get(`/cashierToday/${cashierId}`);
  },

  getSummaryDay: async (branchId = '', date = '') => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (date) params.append('date', date);
    return await api.get(`/summary/day?${params.toString()}`);
  },

  getSummaryMonth: async (branchId = '', month = '') => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (month) params.append('month', month);
    return await api.get(`/summary/month?${params.toString()}`);
  },

  getSummaryYear: async (branchId = '', year = '') => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (year) params.append('year', year);
    return await api.get(`/summary/year?${params.toString()}`);
  },

  getWarrantyStatus: async (branchId = '', status = '', search = '') => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await api.get(`/warrantyStatus${query}`);
  },
};
