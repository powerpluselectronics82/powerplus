import api from './api';

export const supplierService = {
  addSupplier: async (supplierData) => {
    return await api.post('/addSupplier', supplierData);
  },

  getAllSuppliers: async () => {
    return await api.get('/allSuppliers');
  },
};
