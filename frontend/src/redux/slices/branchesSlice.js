import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { branchService } from '../../services/branchService';

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export const fetchBranches = createAsyncThunk(
  'branches/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await branchService.getAllBranches();
      if (res?.success && Array.isArray(res.data)) return res.data;
      if (Array.isArray(res)) return res;
      return [];
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch company branches');
    }
  },
  {
    condition: (options, { getState }) => {
      if (options?.force) return true;
      const { branches } = getState();
      const isFresh = branches.lastFetched && (Date.now() - branches.lastFetched < CACHE_TTL_MS);
      if (branches.loading || (isFresh && branches.branches.length > 0)) {
        return false; // Skip redundant API fetch
      }
      return true;
    },
  }
);

const initialState = {
  branches: [],
  loading: false,
  lastFetched: null,
  error: null,
};

const branchesSlice = createSlice({
  name: 'branches',
  initialState,
  reducers: {
    invalidateBranchesCache: (state) => {
      state.lastFetched = null;
    },
    addBranchToStore: (state, action) => {
      if (action.payload) {
        state.branches.push(action.payload);
        state.lastFetched = Date.now();
      }
    },
    updateBranchInStore: (state, action) => {
      const updated = action.payload;
      if (!updated?._id) return;
      const idx = state.branches.findIndex((b) => b._id === updated._id);
      if (idx !== -1) {
        state.branches[idx] = { ...state.branches[idx], ...updated };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.branches = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { invalidateBranchesCache, addBranchToStore, updateBranchInStore } = branchesSlice.actions;
export default branchesSlice.reducer;
