import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Boxes,
  Barcode,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
  Tag,
  Hash,
  AlertCircle,
  Plus,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { useBranch } from '../../context/BranchContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchCatalogProducts,
  fetchBranchProducts,
  invalidateProductCaches,
  fetchCategories,
  fetchBrands,
} from '../../redux/slices/productsSlice';

export const UnifiedStockIntakeModal = ({ isOpen, onClose, onRefresh }) => {
  const dispatch = useAppDispatch();
  const { catalogProducts, categories: reduxCategories, brands: reduxBrands } = useAppSelector(
    (state) => state.products
  );
  const { selectedBranchId, currentBranch, branches } = useBranch();

  // Active lookup & detection states
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isExistingProduct, setIsExistingProduct] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown reference
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Serial input mode: 'bulk' | 'individual'
  const [serialInputMode, setSerialInputMode] = useState('bulk');
  const [bulkSerialText, setBulkSerialText] = useState('');
  const [showSpecs, setShowSpecs] = useState(false);

  // Unified Form Data (No MRP, No discountType, No discountValue!)
  const [formData, setFormData] = useState({
    // Product details (used if new product)
    barcode: '',
    name: '',
    modelNumber: '',
    hsnCode: '',
    description: '',
    category: '',
    brand: '',
    isSerialized: false,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 0,
    minStockLevel: 2,
    specifications: {
      color: '',
      warranty: '',
      tollFreeNumber: '',
    },

    // Stock Intake details
    branchId: selectedBranchId || currentBranch?._id || '',
    quantity: 1,
    purchasePrice: 0,
    serialNumbers: [''],
  });

  // Load initial catalog, categories, brands on open
  useEffect(() => {
    if (isOpen) {
      if (!catalogProducts || catalogProducts.length === 0) {
        dispatch(fetchCatalogProducts());
      }
      if (!reduxCategories || reduxCategories.length === 0) {
        dispatch(fetchCategories());
      }
      if (!reduxBrands || reduxBrands.length === 0) {
        dispatch(fetchBrands());
      }

      resetState();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, dispatch]);

  // Sync default branch
  useEffect(() => {
    const defaultBranchId = selectedBranchId || currentBranch?._id || (branches?.[0]?._id ?? '');
    setFormData((prev) => ({
      ...prev,
      branchId: prev.branchId || defaultBranchId,
    }));
  }, [selectedBranchId, currentBranch, branches]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetState = () => {
    setQuery('');
    setSelectedProduct(null);
    setIsExistingProduct(false);
    setError('');
    setSuccessMsg('');
    setIsDropdownOpen(false);
    setBulkSerialText('');
    setShowSpecs(false);

    const defaultBranchId = selectedBranchId || currentBranch?._id || (branches?.[0]?._id ?? '');
    setFormData({
      barcode: '',
      name: '',
      modelNumber: '',
      hsnCode: '',
      description: '',
      category: '',
      brand: '',
      isSerialized: false,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 0,
      minStockLevel: 2,
      specifications: {
        color: '',
        warranty: '',
        tollFreeNumber: '',
      },
      branchId: defaultBranchId,
      quantity: 1,
      purchasePrice: 0,
      serialNumbers: [''],
    });
  };

  // Perform search / lookup when typing or scanning
  const handleQueryChange = (val) => {
    setQuery(val);
    setError('');
    setSuccessMsg('');

    const clean = val.trim();
    if (!clean) {
      setSelectedProduct(null);
      setIsExistingProduct(false);
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(true);

    // Exact match check against local catalog
    const exactMatch = catalogProducts.find(
      (p) =>
        String(p.barcode || '').trim().toLowerCase() === clean.toLowerCase() ||
        String(p.modelNumber || '').trim().toLowerCase() === clean.toLowerCase()
    );

    if (exactMatch) {
      applyExistingProduct(exactMatch);
    } else {
      // Prepared as new product candidate with this barcode
      setSelectedProduct(null);
      setIsExistingProduct(false);
      setFormData((prev) => ({
        ...prev,
        barcode: clean,
      }));
    }
  };

  const handleBarcodeKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsDropdownOpen(false);
      const clean = query.trim();
      if (!clean) return;

      setLookupLoading(true);
      setError('');
      try {
        // First check catalogProducts
        const match = catalogProducts.find(
          (p) =>
            String(p.barcode || '').trim().toLowerCase() === clean.toLowerCase() ||
            String(p.modelNumber || '').trim().toLowerCase() === clean.toLowerCase()
        );

        if (match) {
          applyExistingProduct(match);
        } else {
          // Check backend API by barcode
          const res = await productService.getProductByBarcode(clean);
          if (res?.success && res?.data) {
            applyExistingProduct(res.data);
          } else {
            // New product detected
            setSelectedProduct(null);
            setIsExistingProduct(false);
            setFormData((prev) => ({
              ...prev,
              barcode: clean,
            }));
          }
        }
      } catch {
        // Not found on backend -> new product
        setSelectedProduct(null);
        setIsExistingProduct(false);
        setFormData((prev) => ({
          ...prev,
          barcode: clean,
        }));
      } finally {
        setLookupLoading(false);
      }
    }
  };

  const applyExistingProduct = (prod) => {
    setSelectedProduct(prod);
    setIsExistingProduct(true);
    setIsDropdownOpen(false);
    setQuery(`${prod.name} (${prod.barcode})`);

    setFormData((prev) => ({
      ...prev,
      barcode: prod.barcode,
      name: prod.name,
      modelNumber: prod.modelNumber || '',
      hsnCode: prod.hsnCode || '',
      category: prod.category || '',
      brand: prod.brand || '',
      isSerialized: prod.isSerialized || false,
      cgstRate: prod.cgstRate || 9,
      sgstRate: prod.sgstRate || 9,
      igstRate: prod.igstRate || 0,
      purchasePrice: prod.purchasePrice || prev.purchasePrice || 0,
      quantity: 1,
      serialNumbers: prod.isSerialized ? [''] : [],
    }));
  };

  // Filtered dropdown list for autocomplete
  const searchResults = (catalogProducts || []).filter((p) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase().trim();
    return (
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.barcode || '').toLowerCase().includes(q) ||
      String(p.modelNumber || '').toLowerCase().includes(q)
    );
  }).slice(0, 6);

  // Serial number list handlers
  const handleAddSerial = () => {
    setFormData((prev) => ({
      ...prev,
      serialNumbers: [...prev.serialNumbers, ''],
      quantity: prev.serialNumbers.length + 1,
    }));
  };

  const handleRemoveSerial = (idx) => {
    setFormData((prev) => {
      const next = prev.serialNumbers.filter((_, i) => i !== idx);
      return {
        ...prev,
        serialNumbers: next.length > 0 ? next : [''],
        quantity: Math.max(1, next.length),
      };
    });
  };

  const handleSerialChange = (idx, val) => {
    setFormData((prev) => {
      const next = [...prev.serialNumbers];
      next[idx] = val;
      return { ...prev, serialNumbers: next };
    });
  };

  const handleBulkSerialBlur = () => {
    const raw = bulkSerialText
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const uniqueSerials = [...new Set(raw)];
    if (uniqueSerials.length > 0) {
      setFormData((prev) => ({
        ...prev,
        serialNumbers: uniqueSerials,
        quantity: uniqueSerials.length,
      }));
    }
  };

  // Submit Handler: Handles both Existing Product (Update Inventory) & New Product (Create + Intake)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const targetBranchId = formData.branchId || selectedBranchId || currentBranch?._id;
    if (!targetBranchId) {
      setError('Please select a target branch for stock intake');
      return;
    }

    const cleanBarcode = (formData.barcode || query || '').trim();
    if (!cleanBarcode) {
      setError('Barcode is required');
      return;
    }

    const intakeQty = Number(formData.quantity);
    if (!Number.isInteger(intakeQty) || intakeQty <= 0) {
      setError('Intake quantity must be a positive integer');
      return;
    }

    const isSerializedProduct = isExistingProduct
      ? selectedProduct?.isSerialized
      : formData.isSerialized;

    let cleanSerials = [];
    if (isSerializedProduct) {
      if (serialInputMode === 'bulk' && bulkSerialText.trim()) {
        cleanSerials = bulkSerialText
          .split(/[\n,;\t]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        cleanSerials = (formData.serialNumbers || []).map((s) => s.trim()).filter(Boolean);
      }

      if (cleanSerials.length !== intakeQty) {
        setError(
          `Quantity (${intakeQty}) does not match the number of serial numbers entered (${cleanSerials.length})`
        );
        return;
      }

      const duplicateCheck = new Set(cleanSerials);
      if (duplicateCheck.size !== cleanSerials.length) {
        setError('Duplicate serial numbers entered. Each serial number must be unique.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. If it's a NEW product, first create the global catalog product
      if (!isExistingProduct) {
        if (!formData.name.trim()) {
          setError('Product Name is required for new products');
          setSubmitting(false);
          return;
        }

        const productPayload = {
          barcode: cleanBarcode,
          name: formData.name.trim(),
          modelNumber: formData.modelNumber.trim(),
          hsnCode: formData.hsnCode.trim(),
          description: formData.description.trim(),
          category: formData.category || 'General',
          brand: formData.brand || '',
          isSerialized: formData.isSerialized,
          cgstRate: Number(formData.cgstRate || 9),
          sgstRate: Number(formData.sgstRate || 9),
          igstRate: Number(formData.igstRate || 0),
          minStockLevel: Number(formData.minStockLevel || 2),
          specifications: formData.specifications,
        };

        const createProdRes = await productService.addProduct(productPayload);
        if (!createProdRes.success) {
          throw new Error(createProdRes.message || 'Failed to create global product');
        }
      }

      // 2. Receive Stock Intake into Branch (No MRP, No discount!)
      const inventoryPayload = {
        branchId: targetBranchId,
        barcode: cleanBarcode,
        quantity: intakeQty,
        purchasePrice: Number(formData.purchasePrice || 0),
        serialNumbers: isSerializedProduct ? cleanSerials : [],
      };

      const intakeRes = await productService.addBranchInventory(inventoryPayload);
      if (intakeRes.success) {
        setSuccessMsg(
          `Success! Added ${intakeQty} unit(s) of "${
            formData.name || selectedProduct?.name || cleanBarcode
          }" to inventory.`
        );

        // Invalidate and refresh caches
        dispatch(invalidateProductCaches());
        dispatch(fetchCatalogProducts({ force: true }));
        if (targetBranchId) {
          dispatch(fetchBranchProducts({ branchId: targetBranchId, force: true }));
        }
        if (onRefresh) onRefresh();

        // Reset search for rapid scanning
        setTimeout(() => {
          resetState();
          searchInputRef.current?.focus();
        }, 1200);
      } else {
        throw new Error(intakeRes.message || 'Failed to receive stock intake');
      }
    } catch (err) {
      console.error('Unified stock intake error:', err);
      setError(err.message || 'Error occurred while processing product intake');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                Global Product & Stock Intake
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Scan barcode to receive branch inventory or create a new product on one unified page
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Notifications */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Barcode Search / Scanner Input */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-indigo-600" />
              Scan Barcode / Search Product
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan barcode or type name / model + press Enter..."
                className="input-tactile text-sm pl-10 pr-10 py-3 font-mono bg-slate-50 focus:bg-white border-indigo-200 focus:border-indigo-600"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              {lookupLoading && (
                <RefreshCw className="w-4 h-4 text-indigo-600 absolute right-3.5 top-4 animate-spin pointer-events-none" />
              )}
              {query && !lookupLoading && (
                <button
                  type="button"
                  onClick={resetState}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-3.5 rounded"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {searchResults.map((prod) => (
                  <button
                    key={prod._id}
                    type="button"
                    onClick={() => applyExistingProduct(prod)}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/70 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{prod.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">
                        Barcode: {prod.barcode} {prod.modelNumber ? `| Model: ${prod.modelNumber}` : ''}
                      </p>
                    </div>
                    <span className="badge badge-indigo text-[10px] uppercase font-bold">
                      {prod.category || 'General'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* STATE 1: Existing Product Detected */}
          {isExistingProduct && selectedProduct && (
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="badge badge-emerald text-[11px] font-extrabold flex items-center gap-1.5 py-1 px-3">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Product Found in Catalog
                </span>
                <span className="text-[11px] font-bold text-slate-500 font-mono">
                  ID: {selectedProduct._id?.slice(-6)}
                </span>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                  {selectedProduct.name}
                </h4>
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 font-mono font-bold text-slate-700">
                    Barcode: {selectedProduct.barcode}
                  </span>
                  {selectedProduct.category && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 font-bold text-slate-700">
                      Category: {selectedProduct.category}
                    </span>
                  )}
                  {selectedProduct.brand && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 font-bold text-slate-700">
                      Brand: {selectedProduct.brand}
                    </span>
                  )}
                  {selectedProduct.modelNumber && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 font-mono text-slate-700">
                      Model: {selectedProduct.modelNumber}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 font-semibold text-slate-700">
                    GST: {selectedProduct.cgstRate + selectedProduct.sgstRate}% (CGST {selectedProduct.cgstRate}%, SGST {selectedProduct.sgstRate}%)
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg border font-bold text-[11px] ${
                      selectedProduct.isSerialized
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {selectedProduct.isSerialized ? 'Serialized Tracking' : 'Standard Quantity'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: New Global Product Details Required */}
          {!isExistingProduct && query.trim() && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="font-extrabold text-xs text-amber-900 uppercase tracking-wide">
                  New Product Definition
                </span>
                <span className="text-[10px] text-amber-700 font-medium">
                  (Will be created globally in catalog)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Product Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Sony Bravia 55 Inch 4K Smart TV"
                    className="input-tactile text-xs py-2 bg-white"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <input
                    type="text"
                    list="categories-list"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g. Televisions / Electronics"
                    className="input-tactile text-xs py-2 bg-white"
                  />
                  <datalist id="categories-list">
                    {(reduxCategories || []).map((c) => (
                      <option key={c._id || c.name} value={c.name} />
                    ))}
                  </datalist>
                </div>

                {/* Brand */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Brand</label>
                  <input
                    type="text"
                    list="brands-list"
                    value={formData.brand}
                    onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                    placeholder="e.g. Sony / Samsung"
                    className="input-tactile text-xs py-2 bg-white"
                  />
                  <datalist id="brands-list">
                    {(reduxBrands || []).map((b) => (
                      <option key={b._id || b.name} value={b.name} />
                    ))}
                  </datalist>
                </div>

                {/* Model Number */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Model Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.modelNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, modelNumber: e.target.value }))}
                    placeholder="e.g. KD-55X74K"
                    className="input-tactile text-xs py-2 bg-white font-mono"
                  />
                </div>

                {/* HSN Code */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">HSN Code (Optional)</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hsnCode: e.target.value }))}
                    placeholder="e.g. 8528"
                    className="input-tactile text-xs py-2 bg-white font-mono"
                  />
                </div>

                {/* Tax Rates (Defaults to 9% + 9% = 18%) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">CGST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="any"
                    value={formData.cgstRate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cgstRate: e.target.value }))}
                    className="input-tactile text-xs py-2 bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">SGST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="any"
                    value={formData.sgstRate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sgstRate: e.target.value }))}
                    className="input-tactile text-xs py-2 bg-white font-mono"
                  />
                </div>

                {/* Serialized Tracking Toggle */}
                <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Serialized Product Tracking
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Enable if each item has a unique serial number (e.g. Mobile, TV, Laptop)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, isSerialized: !prev.isSerialized }))
                    }
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      formData.isSerialized ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STOCK INTAKE SECTION (Shown whenever barcode/product is present) */}
          {(isExistingProduct || query.trim()) && (
            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-4">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-600" />
                <span className="font-extrabold text-xs text-indigo-950 uppercase tracking-wide">
                  Stock Intake Details
                </span>
                <span className="text-[11px] text-indigo-600 font-medium">
                  (No MRP or discount required)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Target Branch */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Branch</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, branchId: e.target.value }))}
                    className="input-tactile text-xs py-2 bg-white font-bold text-slate-800"
                  >
                    {branches && branches.length > 0 ? (
                      branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name} ({b.code})
                        </option>
                      ))
                    ) : (
                      <option value="">Main Branch</option>
                    )}
                  </select>
                </div>

                {/* Purchase Cost (Optional) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Unit Purchase Cost (₹ Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, purchasePrice: e.target.value }))
                    }
                    placeholder="0.00"
                    className="input-tactile text-xs py-2 bg-white font-mono"
                  />
                </div>

                {/* Intake Quantity */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">
                    Quantity to Add <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))
                    }
                    className="input-tactile text-sm py-2.5 font-bold font-mono bg-white"
                  />
                </div>

                {/* Serial Numbers (Only if Serialized Product) */}
                {(isExistingProduct ? selectedProduct?.isSerialized : formData.isSerialized) && (
                  <div className="sm:col-span-2 space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-indigo-600" />
                        Serial Numbers ({formData.quantity} required)
                      </label>
                      <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSerialInputMode('bulk')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            serialInputMode === 'bulk'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Bulk Paste
                        </button>
                        <button
                          type="button"
                          onClick={() => setSerialInputMode('individual')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            serialInputMode === 'individual'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          One-by-One
                        </button>
                      </div>
                    </div>

                    {serialInputMode === 'bulk' ? (
                      <div className="space-y-1">
                        <textarea
                          rows={3}
                          value={bulkSerialText}
                          onChange={(e) => setBulkSerialText(e.target.value)}
                          onBlur={handleBulkSerialBlur}
                          placeholder="Paste serial numbers separated by lines, commas, or tabs..."
                          className="input-tactile font-mono text-xs p-2.5 bg-white w-full"
                        />
                        <p className="text-[10px] text-slate-500 font-mono">
                          Parsed:{' '}
                          {
                            bulkSerialText
                              .split(/[\n,;\t]+/)
                              .map((s) => s.trim())
                              .filter(Boolean).length
                          }{' '}
                          serial number(s)
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {formData.serialNumbers.map((sn, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400 w-5">
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={sn}
                              onChange={(e) => handleSerialChange(idx, e.target.value)}
                              placeholder={`Serial Number #${idx + 1}`}
                              className="input-tactile text-xs py-1.5 font-mono bg-white flex-1"
                            />
                            {formData.serialNumbers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSerial(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleAddSerial}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Another Serial
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || (!isExistingProduct && !query.trim())}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isExistingProduct
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                </>
              ) : isExistingProduct ? (
                <>
                  <Boxes className="w-4 h-4" /> Update Branch Inventory (+{formData.quantity} Units)
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Save Global Product & Receive Stock
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnifiedStockIntakeModal;
