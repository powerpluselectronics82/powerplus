import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saleService } from '../../services/saleService';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// 1. Daily Sales Summary
export const fetchDailySummary = createAsyncThunk(
  'sales/fetchDailySummary',
  async (branchId, { rejectWithValue }) => {
    try {
      const res = await saleService.getDailySummary(branchId || '');
      return { branchId, data: res?.data || null };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch daily sales summary');
    }
  },
  {
    condition: (arg, { getState }) => {
      const branchId = typeof arg === 'object' ? arg.branchId : arg;
      const force = typeof arg === 'object' ? arg.force : false;
      if (force) return true;
      const { sales } = getState();
      const isFresh = sales.lastDailyFetched && (Date.now() - sales.lastDailyFetched < 60 * 1000); // 1 min TTL for daily
      if (sales.dailyLoading || (isFresh && sales.currentDailyBranchId === branchId)) {
        return false;
      }
      return true;
    },
  }
);

// 2. Monthly Sales Ledger
export const fetchMonthlySales = createAsyncThunk(
  'sales/fetchMonthlySales',
  async ({ branchId, month }, { rejectWithValue }) => {
    try {
      const res = await saleService.getBranchMonthlySales(branchId, month);
      return { branchId, month, data: res?.data || null };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch monthly sales ledger');
    }
  },
  {
    condition: ({ branchId, month, force = false }, { getState }) => {
      if (force) return true;
      const { sales } = getState();
      const isFresh = sales.lastMonthlyFetched && (Date.now() - sales.lastMonthlyFetched < CACHE_TTL_MS);
      if (sales.monthlyLoading || (isFresh && sales.currentMonthlyBranchId === branchId && sales.currentMonth === month)) {
        return false;
      }
      return true;
    },
  }
);

// 3. Warranty Status
export const fetchWarrantyData = createAsyncThunk(
  'sales/fetchWarrantyData',
  async ({ branchId, filter, search }, { rejectWithValue }) => {
    try {
      const res = await saleService.getWarrantyStatus(branchId, filter, search);
      return res?.data || { totalExpiringSoon: 0, totalExpired: 0, items: [] };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch warranty data');
    }
  }
);

const initialState = {
  dailySummary: null,
  dailyLoading: false,
  lastDailyFetched: null,
  currentDailyBranchId: null,

  monthlySales: null,
  monthlyLoading: false,
  lastMonthlyFetched: null,
  currentMonthlyBranchId: null,
  currentMonth: null,

  warrantyData: { totalExpiringSoon: 0, totalExpired: 0, items: [] },
  warrantyLoading: false,

  error: null,
};

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    invalidateSalesCache: (state) => {
      state.lastDailyFetched = null;
      state.lastMonthlyFetched = null;
    },
  },
  extraReducers: (builder) => {
    // Daily Summary
    builder
      .addCase(fetchDailySummary.pending, (state) => {
        state.dailyLoading = true;
      })
      .addCase(fetchDailySummary.fulfilled, (state, action) => {
        state.dailyLoading = false;
        state.dailySummary = action.payload.data;
        state.currentDailyBranchId = action.payload.branchId;
        state.lastDailyFetched = Date.now();
      })
      .addCase(fetchDailySummary.rejected, (state, action) => {
        state.dailyLoading = false;
        state.error = action.payload;
      });

    // Monthly Sales
    builder
      .addCase(fetchMonthlySales.pending, (state) => {
        state.monthlyLoading = true;
      })
      .addCase(fetchMonthlySales.fulfilled, (state, action) => {
        state.monthlyLoading = false;
        state.monthlySales = action.payload.data;
        state.currentMonthlyBranchId = action.payload.branchId;
        state.currentMonth = action.payload.month;
        state.lastMonthlyFetched = Date.now();
      })
      .addCase(fetchMonthlySales.rejected, (state, action) => {
        state.monthlyLoading = false;
        state.error = action.payload;
      });

    // Warranty
    builder
      .addCase(fetchWarrantyData.pending, (state) => {
        state.warrantyLoading = true;
      })
      .addCase(fetchWarrantyData.fulfilled, (state, action) => {
        state.warrantyLoading = false;
        state.warrantyData = action.payload;
      })
      .addCase(fetchWarrantyData.rejected, (state) => {
        state.warrantyLoading = false;
      });
  },
});

export const { invalidateSalesCache } = salesSlice.actions;
export default salesSlice.reducer;
