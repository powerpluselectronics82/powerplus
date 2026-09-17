import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { purchaseService } from '../../services/purchaseService';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const fetchPurchases = createAsyncThunk(
  'purchases/fetchAll',
  async (branchId, { rejectWithValue }) => {
    try {
      const res = branchId
        ? await purchaseService.getBranchPurchases(branchId)
        : await purchaseService.getAllPurchases();
      return { branchId, data: res?.data || [] };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch purchase orders');
    }
  },
  {
    condition: (arg, { getState }) => {
      const branchId = typeof arg === 'object' ? arg.branchId : arg;
      const force = typeof arg === 'object' ? arg.force : false;
      if (force) return true;
      const { purchases } = getState();
      const isFresh = purchases.lastFetched && (Date.now() - purchases.lastFetched < CACHE_TTL_MS);
      if (purchases.loading || (isFresh && purchases.currentBranchId === branchId && purchases.purchases.length > 0)) {
        return false;
      }
      return true;
    },
  }
);

const initialState = {
  purchases: [],
  loading: false,
  lastFetched: null,
  currentBranchId: null,
  error: null,
};

const purchasesSlice = createSlice({
  name: 'purchases',
  initialState,
  reducers: {
    invalidatePurchasesCache: (state) => {
      state.lastFetched = null;
    },
    addPurchaseToStore: (state, action) => {
      if (action.payload) {
        state.purchases = [action.payload, ...state.purchases];
        state.lastFetched = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchases.fulfilled, (state, action) => {
        state.loading = false;
        state.purchases = action.payload.data;
        state.currentBranchId = action.payload.branchId;
        state.lastFetched = Date.now();
      })
      .addCase(fetchPurchases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { invalidatePurchasesCache, addPurchaseToStore } = purchasesSlice.actions;
export default purchasesSlice.reducer;
