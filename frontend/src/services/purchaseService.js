import api from './api';

export const purchaseService = {
  getAllPurchases: async () => {
    return await api.get('/purchasesAll');
  },

  getBranchPurchases: async (branchId) => {
    return await api.get(`/purchasesBranch/${branchId}`);
  },

  createPurchase: async (purchaseData) => {
    return await api.post('/purchases/create', purchaseData);
  },
};
