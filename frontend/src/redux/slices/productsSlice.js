import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { brandService } from '../../services/brandService';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// 1. Fetch Master Catalog Products (created in Product Section)
export const fetchCatalogProducts = createAsyncThunk(
  'products/fetchCatalog',
  async (_, { rejectWithValue }) => {
    try {
      const res = await productService.getAllProducts();
      return res?.data || [];
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch catalog products');
    }
  },
  {
    condition: (options, { getState }) => {
      if (options?.force) return true;
      const { products } = getState();
      const isFresh = products.lastCatalogFetched && (Date.now() - products.lastCatalogFetched < CACHE_TTL_MS);
      if (products.catalogLoading || (isFresh && products.catalogProducts.length > 0)) {
        return false; // Skip redundant API fetch
      }
      return true;
    },
  }
);

// 2. Fetch Branch Inventory Products
export const fetchBranchProducts = createAsyncThunk(
  'products/fetchBranchProducts',
  async (arg, { rejectWithValue }) => {
    try {
      const branchId = typeof arg === 'object' && arg !== null ? arg.branchId : arg;
      if (!branchId) return { branchId: null, data: [] };
      const res = await productService.getBranchProducts(branchId);
      return { branchId, data: res?.data || [] };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch branch products');
    }
  },
  {
    condition: (arg, { getState }) => {
      const branchId = typeof arg === 'object' && arg !== null ? arg.branchId : arg;
      const force = typeof arg === 'object' && arg !== null ? arg.force : false;
      if (force) return true;
      if (!branchId) return false;
      const { products } = getState();
      const isFresh = products.lastBranchFetched && (Date.now() - products.lastBranchFetched < CACHE_TTL_MS);
      if (products.branchLoading || (isFresh && products.currentBranchId === branchId && products.branchProducts.length > 0)) {
        return false; // Skip redundant API fetch
      }
      return true;
    },
  }
);

// 3. Fetch Low Stock Products
export const fetchLowStockProducts = createAsyncThunk(
  'products/fetchLowStock',
  async (arg, { rejectWithValue }) => {
    try {
      const branchId = typeof arg === 'object' && arg !== null ? arg.branchId : arg;
      const res = await productService.getLowStockProducts(branchId || '');
      return res?.data || [];
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch low stock alerts');
    }
  },
  {
    condition: (arg, { getState }) => {
      const force = typeof arg === 'object' && arg !== null ? arg.force : false;
      if (force) return true;
      const { products } = getState();
      const isFresh = products.lastLowStockFetched && (Date.now() - products.lastLowStockFetched < CACHE_TTL_MS);
      if (products.lowStockLoading || isFresh) {
        return false;
      }
      return true;
    },
  }
);

// 4. Fetch Stock Valuation
export const fetchStockValuation = createAsyncThunk(
  'products/fetchStockValuation',
  async (arg, { rejectWithValue }) => {
    try {
      const branchId = typeof arg === 'object' && arg !== null ? arg.branchId : arg;
      const res = branchId
        ? await productService.getBranchStockValuation(branchId)
        : await productService.getAllStockValuation();
      return res?.data || null;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch stock valuation');
    }
  },
  {
    condition: (arg, { getState }) => {
      const force = typeof arg === 'object' && arg !== null ? arg.force : false;
      if (force) return true;
      const { products } = getState();
      const isFresh = products.lastValuationFetched && (Date.now() - products.lastValuationFetched < CACHE_TTL_MS);
      if (products.valuationLoading || isFresh) {
        return false;
      }
      return true;
    },
  }
);

// 5. Fetch Categories
export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await categoryService.getCategories();
      return res?.data || [];
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch categories');
    }
  },
  {
    condition: (options, { getState }) => {
      if (options?.force) return true;
      const { products } = getState();
      const isFresh = products.lastCategoriesFetched && (Date.now() - products.lastCategoriesFetched < CACHE_TTL_MS * 5);
      if (products.categoriesLoading || (isFresh && products.categories.length > 0)) {
        return false;
      }
      return true;
    },
  }
);

// 6. Fetch Brands
export const fetchBrands = createAsyncThunk(
  'products/fetchBrands',
  async (_, { rejectWithValue }) => {
    try {
      const res = await brandService.getBrands();
      return res?.data || [];
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch brands');
    }
  },
  {
    condition: (options, { getState }) => {
      if (options?.force) return true;
      const { products } = getState();
      const isFresh = products.lastBrandsFetched && (Date.now() - products.lastBrandsFetched < CACHE_TTL_MS * 5);
      if (products.brandsLoading || (isFresh && products.brands.length > 0)) {
        return false;
      }
      return true;
    },
  }
);

const initialState = {
  catalogProducts: [],
  catalogLoading: false,
  lastCatalogFetched: null,

  branchProducts: [],
  branchLoading: false,
  lastBranchFetched: null,
  currentBranchId: null,

  lowStockProducts: [],
  lowStockLoading: false,
  lastLowStockFetched: null,

  stockValuation: null,
  valuationLoading: false,
  lastValuationFetched: null,

  categories: [],
  categoriesLoading: false,
  lastCategoriesFetched: null,

  brands: [],
  brandsLoading: false,
  lastBrandsFetched: null,

  error: null,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    invalidateProductCaches: (state) => {
      state.lastCatalogFetched = null;
      state.lastBranchFetched = null;
      state.lastLowStockFetched = null;
      state.lastValuationFetched = null;
    },
    optimisticAddCatalogProduct: (state, action) => {
      if (action.payload) {
        state.catalogProducts = [action.payload, ...state.catalogProducts];
        state.lastCatalogFetched = Date.now();
      }
    },
    toggleProductStatusInStore: (state, action) => {
      const productId = String(action.payload);
      // Toggle in catalog
      state.catalogProducts = state.catalogProducts.map((p) => {
        const id = String(p._id || p.id || '');
        if (id === productId) {
          const currentStatus = p.status || (p.isActive ? 'ACTIVE' : 'INACTIVE');
          const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          return { ...p, status: nextStatus, isActive: nextStatus === 'ACTIVE' };
        }
        return p;
      });
      // Toggle in branch products
      state.branchProducts = state.branchProducts.map((p) => {
        const id = String(p._id || p.productId?._id || p.productId || '');
        if (id === productId) {
          const currentStatus = p.status || (p.isActive ? 'ACTIVE' : 'INACTIVE');
          const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          return { ...p, status: nextStatus, isActive: nextStatus === 'ACTIVE' };
        }
        return p;
      });
    },
    addCategoryToStore: (state, action) => {
      if (action.payload) {
        state.categories = [action.payload, ...state.categories];
      }
    },
    updateCategoryInStore: (state, action) => {
      if (action.payload) {
        const catId = String(action.payload._id || action.payload.id || '');
        state.categories = state.categories.map((c) =>
          String(c._id || c.id || '') === catId ? { ...c, ...action.payload } : c
        );
      }
    },
    removeCategoryFromStore: (state, action) => {
      const catId = String(action.payload);
      state.categories = state.categories.filter((c) => String(c._id || c.id || '') !== catId);
    },
    addBrandToStore: (state, action) => {
      if (action.payload) {
        state.brands = [action.payload, ...state.brands];
      }
    },
    updateBrandInStore: (state, action) => {
      if (action.payload) {
        const brandId = String(action.payload._id || action.payload.id || '');
        state.brands = state.brands.map((b) =>
          String(b._id || b.id || '') === brandId ? { ...b, ...action.payload } : b
        );
      }
    },
    removeBrandFromStore: (state, action) => {
      const brandId = String(action.payload);
      state.brands = state.brands.filter((b) => String(b._id || b.id || '') !== brandId);
    },
    updateBranchInventoryStock: (state, action) => {
      const { branchId, productId, quantityAdded = 0, isSerialized, serialNumbers = [] } = action.payload || {};
      if (!productId) return;
      const pId = String(productId);
      state.branchProducts = state.branchProducts.map((p) => {
        const id = String(p._id || p.productId?._id || p.productId || '');
        if (id === pId) {
          const currentStock = Number(p.stock ?? p.availableStock ?? p.Stock ?? p.quantity ?? 0);
          const nextStock = currentStock + Number(quantityAdded);
          let units = Array.isArray(p.inventoryUnits) ? [...p.inventoryUnits] : [];
          if (isSerialized && Array.isArray(serialNumbers) && serialNumbers.length > 0) {
            const newUnits = serialNumbers.map((s) => ({
              serialNumber: typeof s === 'object' ? s.serialNumber : s,
              status: 'available',
            }));
            units = [...units, ...newUnits];
          }
          return {
            ...p,
            stock: nextStock,
            availableStock: nextStock,
            quantity: nextStock,
            inventoryUnits: units,
          };
        }
        return p;
      });
      state.lastLowStockFetched = null;
      state.lastValuationFetched = null;
    },
  },
  extraReducers: (builder) => {
    // Catalog
    builder
      .addCase(fetchCatalogProducts.pending, (state) => {
        state.catalogLoading = true;
        state.error = null;
      })
      .addCase(fetchCatalogProducts.fulfilled, (state, action) => {
        state.catalogLoading = false;
        state.catalogProducts = action.payload;
        state.lastCatalogFetched = Date.now();
      })
      .addCase(fetchCatalogProducts.rejected, (state, action) => {
        state.catalogLoading = false;
        state.error = action.payload;
      });

    // Branch Products
    builder
      .addCase(fetchBranchProducts.pending, (state) => {
        state.branchLoading = true;
        state.error = null;
      })
      .addCase(fetchBranchProducts.fulfilled, (state, action) => {
        state.branchLoading = false;
        state.branchProducts = action.payload.data;
        state.currentBranchId = action.payload.branchId;
        state.lastBranchFetched = Date.now();
      })
      .addCase(fetchBranchProducts.rejected, (state, action) => {
        state.branchLoading = false;
        state.error = action.payload;
      });

    // Low Stock
    builder
      .addCase(fetchLowStockProducts.pending, (state) => {
        state.lowStockLoading = true;
      })
      .addCase(fetchLowStockProducts.fulfilled, (state, action) => {
        state.lowStockLoading = false;
        state.lowStockProducts = action.payload;
        state.lastLowStockFetched = Date.now();
      })
      .addCase(fetchLowStockProducts.rejected, (state) => {
        state.lowStockLoading = false;
      });

    // Valuation
    builder
      .addCase(fetchStockValuation.pending, (state) => {
        state.valuationLoading = true;
      })
      .addCase(fetchStockValuation.fulfilled, (state, action) => {
        state.valuationLoading = false;
        state.stockValuation = action.payload;
        state.lastValuationFetched = Date.now();
      })
      .addCase(fetchStockValuation.rejected, (state) => {
        state.valuationLoading = false;
      });

    // Categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesLoading = true;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
        state.lastCategoriesFetched = Date.now();
      })
      .addCase(fetchCategories.rejected, (state) => {
        state.categoriesLoading = false;
      });

    // Brands
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.brandsLoading = true;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.brandsLoading = false;
        state.brands = action.payload;
        state.lastBrandsFetched = Date.now();
      })
      .addCase(fetchBrands.rejected, (state) => {
        state.brandsLoading = false;
      });
  },
});

export const {
  invalidateProductCaches,
  optimisticAddCatalogProduct,
  toggleProductStatusInStore,
  addCategoryToStore,
  updateCategoryInStore,
  removeCategoryFromStore,
  addBrandToStore,
  updateBrandInStore,
  removeBrandFromStore,
  updateBranchInventoryStock,
} = productsSlice.actions;
export const invalidateProductsCache = invalidateProductCaches;
export default productsSlice.reducer;
