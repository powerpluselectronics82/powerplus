import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './slices/productsSlice';
import branchesReducer from './slices/branchesSlice';
import staffReducer from './slices/staffSlice';
import salesReducer from './slices/salesSlice';
import analyticsReducer from './slices/analyticsSlice';
import purchasesReducer from './slices/purchasesSlice';
import suppliersReducer from './slices/suppliersSlice';
import paymentsReducer from './slices/paymentsSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    branches: branchesReducer,
    staff: staffReducer,
    sales: salesReducer,
    analytics: analyticsReducer,
    purchases: purchasesReducer,
    suppliers: suppliersReducer,
    payments: paymentsReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
