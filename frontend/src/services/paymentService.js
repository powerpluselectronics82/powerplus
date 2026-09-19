import api from './api';

export const paymentService = {
  /**
   * Receive installment or full due payment
   * @param {Object} data { saleId, amountPaid, paymentMethod, transactionRef, notes }
   */
  receivePayment: async (data) => {
    return await api.post('/payments/receive', data);
  },

  /**
   * Get all payment history receipts for an invoice
   * @param {string} saleId
   */
  getPaymentHistory: async (saleId) => {
    return await api.get(`/payments/sale/${saleId}`);
  },

  /**
   * Get all sales with outstanding dues
   * @param {Object} queryParams { branchId, search, status, page, limit }
   */
  getDueSales: async (queryParams = {}) => {
    const params = new URLSearchParams();
    if (queryParams.branchId) params.append('branchId', queryParams.branchId);
    if (queryParams.search) params.append('search', queryParams.search);
    if (queryParams.status) params.append('status', queryParams.status);
    if (queryParams.page) params.append('page', queryParams.page);
    if (queryParams.limit) params.append('limit', queryParams.limit);

    const query = params.toString() ? `?${params.toString()}` : '';
    return await api.get(`/payments/due-sales${query}`);
  },
};
