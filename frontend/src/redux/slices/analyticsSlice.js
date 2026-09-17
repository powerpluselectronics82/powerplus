import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saleService } from '../../services/saleService';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const fetchAnalyticsSummary = createAsyncThunk(
  'analytics/fetchSummary',
  async ({ branchId, period }, { rejectWithValue }) => {
    try {
      let res;
      if (period === 'day') {
        res = await saleService.getSummaryDay(branchId);
      } else if (period === 'month') {
        res = await saleService.getSummaryMonth(branchId);
      } else {
        res = await saleService.getSummaryYear(branchId);
      }
      return { branchId, period, data: res?.data || null };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch analytics summary');
    }
  },
  {
    condition: ({ branchId, period, force = false }, { getState }) => {
      if (force) return true;
      const { analytics } = getState();
      const isFresh = analytics.lastFetched && (Date.now() - analytics.lastFetched < CACHE_TTL_MS);
      if (
        analytics.loading ||
        (isFresh && analytics.currentBranchId === branchId && analytics.currentPeriod === period && analytics.summaryData)
      ) {
        return false; // Skip redundant API fetch
      }
      return true;
    },
  }
);

const initialState = {
  summaryData: null,
  period: 'month',
  loading: false,
  lastFetched: null,
  currentBranchId: null,
  currentPeriod: null,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setAnalyticsPeriod: (state, action) => {
      state.period = action.payload;
    },
    invalidateAnalyticsCache: (state) => {
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyticsSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summaryData = action.payload.data;
        state.currentBranchId = action.payload.branchId;
        state.currentPeriod = action.payload.period;
        state.lastFetched = Date.now();
      })
      .addCase(fetchAnalyticsSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setAnalyticsPeriod, invalidateAnalyticsCache } = analyticsSlice.actions;
export default analyticsSlice.reducer;
