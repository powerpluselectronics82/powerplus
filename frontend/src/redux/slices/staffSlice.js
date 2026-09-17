import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../../services/userService';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const fetchStaff = createAsyncThunk(
  'staff/fetchStaff',
  async ({ branchId, viewMode = 'ALL' } = {}, { rejectWithValue }) => {
    try {
      let res;
      if (viewMode === 'BRANCH' && branchId) {
        res = await userService.getBranchUsers(branchId);
      } else {
        res = await userService.getAllUsers();
      }
      return {
        scope: viewMode === 'BRANCH' && branchId ? branchId : 'ALL',
        data: res?.data || [],
      };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch staff members');
    }
  },
  {
    condition: (arg, { getState }) => {
      const force = arg?.force || false;
      if (force) return true;
      const targetScope = arg?.viewMode === 'BRANCH' && arg?.branchId ? arg.branchId : 'ALL';
      const { staff } = getState();
      const isFresh = staff.lastFetched && (Date.now() - staff.lastFetched < CACHE_TTL_MS);
      if (staff.loading || (isFresh && staff.currentScope === targetScope && staff.staffList.length > 0)) {
        return false; // Skip redundant API fetch
      }
      return true;
    },
  }
);

const initialState = {
  staffList: [],
  loading: false,
  lastFetched: null,
  currentScope: 'ALL',
  error: null,
};

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    invalidateStaffCache: (state) => {
      state.lastFetched = null;
    },
    addStaffToStore: (state, action) => {
      if (action.payload) {
        const newUser = action.payload;
        state.staffList = [newUser, ...state.staffList.filter((u) => u._id !== newUser._id)];
        state.lastFetched = Date.now();
      }
    },
    updateStaffStatusInStore: (state, action) => {
      const { userId, status } = action.payload;
      const idx = state.staffList.findIndex((u) => u._id === userId);
      if (idx !== -1) {
        state.staffList[idx].status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.staffList = action.payload.data;
        state.currentScope = action.payload.scope;
        state.lastFetched = Date.now();
      })
      .addCase(fetchStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { invalidateStaffCache, addStaffToStore, updateStaffStatusInStore } = staffSlice.actions;
export default staffSlice.reducer;
