import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { paymentService } from '../../services/paymentService';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache

export const fetchDueSales = createAsyncThunk(
  'payments/fetchDueSales',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { search = '', status = '', page = 1, limit = 20 } = params;
      const res = await paymentService.getDueSales({ search, status, page, limit });
      return {
        data: res?.data || [],
        meta: res?.meta || { totalDueAmount: 0, totalCount: 0, totalPages: 1, currentPage: 1 },
        search,
        status,
        page,
      };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch due sales');
    }
  },
  {
    condition: (params = {}, { getState }) => {
      const { force = false, search = '', status = '', page = 1 } = params;
      if (force) return true;
      const { payments } = getState();
      if (!payments) return true;

      const isFresh = payments.lastFetched && (Date.now() - payments.lastFetched < CACHE_TTL_MS);
      if (
        payments.loading ||
        (isFresh &&
          payments.currentSearch === search &&
          payments.currentStatus === status &&
          payments.currentPage === page &&
          payments.dueSales.length > 0)
      ) {
        return false; // Skip redundant network fetch
      }
      return true;
    },
  }
);

const initialState = {
  dueSales: [],
  meta: {
    totalDueAmount: 0,
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
  },
  loading: false,
  error: null,
  lastFetched: null,
  currentSearch: '',
  currentStatus: '',
  currentPage: 1,
};

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    invalidateDueSalesCache: (state) => {
      state.lastFetched = null;
    },
    updateSaleDueRecord: (state, action) => {
      const updated = action.payload;
      if (!updated?._id) return;

      const index = state.dueSales.findIndex((s) => s._id === updated._id);
      if (index !== -1) {
        if (updated.dueAmount <= 0 || updated.paymentStatus === 'PAID') {
          // Fully settled, remove from pending list
          state.dueSales.splice(index, 1);
          state.meta.totalCount = Math.max(0, state.meta.totalCount - 1);
        } else {
          state.dueSales[index] = { ...state.dueSales[index], ...updated };
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDueSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDueSales.fulfilled, (state, action) => {
        state.loading = false;
        state.dueSales = action.payload.data;
        state.meta = action.payload.meta;
        state.lastFetched = Date.now();
        state.currentSearch = action.payload.search;
        state.currentStatus = action.payload.status;
        state.currentPage = action.payload.page;
      })
      .addCase(fetchDueSales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { invalidateDueSalesCache, updateSaleDueRecord } = paymentsSlice.actions;
export default paymentsSlice.reducer;
