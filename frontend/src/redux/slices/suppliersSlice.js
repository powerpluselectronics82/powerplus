import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supplierService } from '../../services/supplierService';

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export const fetchSuppliers = createAsyncThunk(
  'suppliers/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await supplierService.getAllSuppliers();
      return res?.data || [];
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch suppliers');
    }
  },
  {
    condition: (options, { getState }) => {
      if (options?.force) return true;
      const { suppliers } = getState();
      const isFresh = suppliers.lastFetched && (Date.now() - suppliers.lastFetched < CACHE_TTL_MS);
      if (suppliers.loading || (isFresh && suppliers.suppliers.length > 0)) {
        return false;
      }
      return true;
    },
  }
);

const initialState = {
  suppliers: [],
  loading: false,
  lastFetched: null,
  error: null,
};

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    invalidateSuppliersCache: (state) => {
      state.lastFetched = null;
    },
    addSupplierToStore: (state, action) => {
      if (action.payload) {
        state.suppliers = [action.payload, ...state.suppliers];
        state.lastFetched = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.suppliers = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { invalidateSuppliersCache, addSupplierToStore } = suppliersSlice.actions;
export default suppliersSlice.reducer;
