import api from './api';

export const productService = {
  // Global catalog products
  addProduct: async (productData) => {
    return await api.post('/addProduct', productData);
  },

  getAllProducts: async () => {
    return await api.get('/allProducts');
  },

  getProductById: async (id) => {
    return await api.get(`/product/${id}`);
  },

  getProductByBarcode: async (barcode) => {
    return await api.get(`/barcode/${barcode}`);
  },

  getProductByModelNumber: async (modelNumber) => {
    return await api.get(`/modelNumber/${modelNumber}`);
  },

  toggleProductStatus: async (id) => {
    return await api.patch(`/productStatus/${id}`);
  },

  // Branch inventory & stock
  addBranchInventory: async (inventoryData) => {
    return await api.post('/addBranchInventory', inventoryData);
  },

  getBranchProducts: async (branchId) => {
    return await api.get(`/branchInventory/${branchId}`);
  },

  getLowStockProducts: async (branchId) => {
    return await api.get(branchId ? `/branchInventory/lowStock/${branchId}` : '/branchInventory/lowStock');
  },

  getAllStockValuation: async () => {
    return await api.get('/branchInventory/valuation');
  },

  getBranchStockValuation: async (branchId) => {
    return await api.get(`/branchInventory/valuation/${branchId}`);
  },

  getProductBySerialNumber: async (branchId, serialNumber) => {
    return await api.get(`/branchInventory/${branchId}/serial/${serialNumber}`);
  },

  getMonthlyInventoryReport: async (branchId = '', month = '') => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (month) params.append('month', month);
    return await api.get(`/branchInventory/report/monthly?${params.toString()}`);
  },
};

