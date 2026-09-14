import api from './api';

export const companyService = {
  addCompany: async (companyData) => {
    return await api.post('/company', companyData);
  },
};
