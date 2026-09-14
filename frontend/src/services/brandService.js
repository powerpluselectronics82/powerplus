import api from './api';

export const brandService = {
  getBrands: async () => {
    return await api.get('/brand');
  },

  createBrand: async (data) => {
    return await api.post('/addBrand', data);
  },

  updateBrand: async (id, data) => {
    return await api.put(`/brand/${id}`, data);
  },

  deleteBrand: async (id) => {
    return await api.delete(`/brand/${id}`);
  },
};

