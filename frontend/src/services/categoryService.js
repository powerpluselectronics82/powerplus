import api from './api';

export const categoryService = {
  getCategories: async () => {
    return await api.get('/category');
  },

  createCategory: async (data) => {
    return await api.post('/addCategory', data);
  },

  updateCategory: async (id, data) => {
    return await api.put(`/category/${id}`, data);
  },

  deleteCategory: async (id) => {
    return await api.delete(`/category/${id}`);
  },
};

