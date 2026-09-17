import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Boxes, Barcode, Calendar, Percent, Hash, AlertCircle, FileText, Check, ChevronDown } from 'lucide-react';
import { productService } from '../../services/productService';
import { useBranch } from '../../context/BranchContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchCatalogProducts,
  invalidateProductCaches,
  updateBranchInventoryStock,
} from '../../redux/slices/productsSlice';

export const AddStockModal = ({ isOpen, onClose, onRefresh }) => {
  const dispatch = useAppDispatch();
  const { catalogProducts: reduxCatalog } = useAppSelector((state) => state.products);
  const { selectedBranchId, currentBranch, branches } = useBranch();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mode for serial numbers: 'bulk' | 'individual'
  const [serialInputMode, setSerialInputMode] = useState('bulk');
  const [bulkSerialText, setBulkSerialText] = useState('');

  // Catalog product search state
  const [productSearch, setProductSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    branchId: selectedBranchId || '',
    barcode: '',
    quantity: 1,
    mrp: 0,
    purchasePrice: 0,
    discountType: 'fixed',
    discountValue: 0,
    manufacturingDate: '',
    expiryDate: '',
    serialNumbers: [''],
  });

  useEffect(() => {
    if (isOpen) {
      if (reduxCatalog && reduxCatalog.length > 0) {
        setProducts(reduxCatalog);
      } else {
        fetchCatalogProducts();
      }
      setProductSearch('');
      setSelectedProduct(null);
      setIsDropdownOpen(false);
    }
  }, [isOpen, reduxCatalog]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCatalogProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const actionRes = await dispatch(fetchCatalogProducts()).unwrap();
      if (Array.isArray(actionRes)) {
        setProducts(actionRes);
      }
    } catch (err) {
      console.error('Failed to load global catalog:', err);
      setError('Failed to load global catalog products');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setProductSearch(`${product.name} (${product.barcode})`);
    setIsDropdownOpen(false);

    setFormData((prev) => ({
      ...prev,
      barcode: product.barcode,
      mrp: product.mrp || prev.mrp || 0,
      purchasePrice: product.purchasePrice || prev.purchasePrice || 0,
      cgstRate: product.cgstRate || 9,
      sgstRate: product.sgstRate || 9,
    }));
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setProductSearch('');
    setIsDropdownOpen(false);
    setFormData((prev) => ({
      ...prev,
      barcode: '',
    }));
  };

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase().trim();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.barcode && String(p.barcode).toLowerCase().includes(q)) ||
      (p.modelNumber && String(p.modelNumber).toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Check for exact barcode match first
      const exact = products.find(
        (p) => String(p.barcode).trim().toLowerCase() === productSearch.trim().toLowerCase()
      );
      if (exact) {
        handleSelectProduct(exact);
        return;
      }
      // If 1 filtered match, pick it
      if (filteredProducts.length === 1) {
        handleSelectProduct(filteredProducts[0]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  if (!isOpen) return null;

  const handleQuantityChange = (qty) => {
    const count = Math.max(1, parseInt(qty) || 1);
    setFormData((prev) => {
      let currentSerials = [...prev.serialNumbers];
      if (currentSerials.length < count) {
        while (currentSerials.length < count) currentSerials.push('');
      } else if (currentSerials.length > count) {
        currentSerials = currentSerials.slice(0, count);
      }
      return {
        ...prev,
        quantity: count,
        serialNumbers: currentSerials,
      };
    });
    setBulkSerialText(formData.serialNumbers.filter(Boolean).join('\n'));
  };

  // Helper to parse bulk multiline / delimiter input
  const parseBulkText = (text) => {
    if (!text) return [];
    return text
      .split(/[\n,\t\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleBulkTextChange = (val) => {
    setBulkSerialText(val);
    const parsed = parseBulkText(val);

    if (parsed.length > 0) {
      setFormData((prev) => ({
        ...prev,
        quantity: parsed.length,
        serialNumbers: parsed,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        serialNumbers: [''],
      }));
    }
  };

  const handleSerialChange = (index, value) => {
    const updated = [...formData.serialNumbers];
    updated[index] = value;
    setFormData({ ...formData, serialNumbers: updated });
    setBulkSerialText(updated.filter(Boolean).join('\n'));
  };

  const hasDuplicateSerials = (serialsArr) => {
    const clean = serialsArr.map((s) => String(s).trim()).filter(Boolean);
    return new Set(clean).size !== clean.length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const targetBranch = formData.branchId || selectedBranchId || branches[0]?._id;
    if (!targetBranch) {
      setError('Please select a branch');
      setSubmitting(false);
      return;
    }

    if (!formData.barcode) {
      setError('Please select a product or enter a barcode');
      setSubmitting(false);
      return;
    }

    if (Number(formData.mrp) < 0) {
      setError('MRP cannot be negative');
      setSubmitting(false);
      return;
    }

    const isSerialized = selectedProduct?.isSerialized === true;
    const serials = isSerialized
      ? formData.serialNumbers.map((s) => String(s).trim()).filter(Boolean)
      : [];

    if (isSerialized) {
      if (serials.length !== Number(formData.quantity)) {
        setError(`Please enter all ${formData.quantity} serial numbers (Found ${serials.length} valid entries)`);
        setSubmitting(false);
        return;
      }

      if (hasDuplicateSerials(serials)) {
        setError('Duplicate serial numbers detected in your input list. Each unit must have a unique serial number.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      branchId: targetBranch,
      barcode: formData.barcode,
      quantity: Number(formData.quantity),
      mrp: Number(formData.mrp),
      purchasePrice: Number(formData.purchasePrice),
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      ...(formData.manufacturingDate && { manufacturingDate: formData.manufacturingDate }),
      ...(formData.expiryDate && { expiryDate: formData.expiryDate }),
      serialNumbers: serials,
    };

    try {
      const res = await productService.addBranchInventory(payload);
      if (res?.success) {
        dispatch(
          updateBranchInventoryStock({
            branchId: payload.branchId,
            productId: selectedProduct?._id,
            quantityAdded: payload.quantity,
            isSerialized: selectedProduct?.isSerialized,
            serialNumbers: serials,
          })
        );
        dispatch(invalidateProductCaches());
        onRefresh && onRefresh();
        onClose();
      } else {
        setError(res?.message || 'Failed to add branch inventory');
      }
    } catch (err) {
      console.error('Add stock error:', err);
      setError(err.message || 'Unable to add branch stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        {/* Fixed Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Receive Branch Stock Intake
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Add physical inventory with MRP, discounts, expiry dates, and bulk serial number tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto pr-1.5 flex-1">
          {/* Branch & Catalog Product Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Target Branch *
              </label>
              <select
                value={formData.branchId || selectedBranchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="input-tactile"
                required
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Searchable Catalog Product Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 uppercase text-xs">
                  Catalog Product *
                </label>
                {selectedProduct && (
                  <button
                    type="button"
                    onClick={handleClearProduct}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold cursor-pointer"
                  >
                    Change Product
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsDropdownOpen(true);
                    if (!e.target.value) {
                      setSelectedProduct(null);
                      setFormData((prev) => ({ ...prev, barcode: '' }));
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search product by name or barcode..."
                  className="input-tactile pl-3.5 pr-8 font-semibold text-xs bg-white"
                  required={!selectedProduct}
                />
                {productSearch ? (
                  <button
                    type="button"
                    onClick={handleClearProduct}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                )}
              </div>

              {/* Floating Dropdown List */}
              {isDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  {loading ? (
                    <div className="p-4 text-center text-slate-400 font-semibold text-xs">
                      Loading catalog products...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 font-semibold text-xs">
                      No products found matching "{productSearch}"
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = selectedProduct?.barcode === p.barcode;
                      return (
                        <div
                          key={p._id}
                          onClick={() => handleSelectProduct(p)}
                          className={`p-2.5 hover:bg-indigo-50/80 cursor-pointer transition-colors flex items-center justify-between gap-2.5 ${isSelected ? 'bg-indigo-50/90 border-l-4 border-l-indigo-600' : ''
                            }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 truncate block text-xs">
                                {p.name}
                              </span>
                              {p.isSerialized && (
                                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-100 text-indigo-700 rounded-full shrink-0">
                                  Serialized
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                              <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                <Barcode className="w-3 h-3 text-slate-500" />
                                {p.barcode}
                              </span>
                              {p.category && (
                                <span className="text-slate-500 font-medium">{p.category}</span>
                              )}
                              {p.brand && (
                                <span className="text-slate-400 font-medium">• {p.brand}</span>
                              )}
                              {p.modelNumber && (
                                <span className="font-mono text-slate-500">• {p.modelNumber}</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {Number(p.mrp) > 0 && (
                              <span className="font-mono font-extrabold text-indigo-600 block text-xs">
                                ₹{Number(p.mrp).toLocaleString('en-IN')}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 justify-end">
                                <Check className="w-3 h-3" /> Selected
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedProduct && (
            <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold text-indigo-950 block">{selectedProduct.name}</span>
                <span className="text-[11px] text-slate-500">
                  Category: {selectedProduct.category || 'N/A'} | Brand: {selectedProduct.brand || 'N/A'}
                </span>
              </div>
              <div className="text-right">
                <span className={`badge ${selectedProduct.isSerialized ? 'badge-indigo' : 'badge-emerald'}`}>
                  {selectedProduct.isSerialized ? 'Serialized Product' : 'Standard Product'}
                </span>
              </div>
            </div>
          )}

          {/* Pricing & Stock Quantity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="input-tactile font-mono text-center font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                MRP (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                className="input-tactile font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Purchase Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                className="input-tactile font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Discount Type
              </label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="input-tactile"
              >
                <option value="fixed">Fixed (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
          </div>

          {/* Discount Value & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Discount Value ({formData.discountType === 'percentage' ? '%' : '₹'})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className="input-tactile font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Mfg Date
              </label>
              <input
                type="date"
                value={formData.manufacturingDate}
                onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                className="input-tactile"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="input-tactile"
              />
            </div>
          </div>

          {/* Serialized Item Bulk / Individual Entry */}
          {selectedProduct?.isSerialized && (
            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="font-bold text-amber-900 uppercase text-[11px] flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-amber-600" /> Serial Numbers ({formData.quantity} Units)
                </label>

                {/* Mode Switcher */}
                <div className="flex bg-amber-100/80 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSerialInputMode('bulk')}
                    className={`px-2.5 py-1 rounded-md transition-all ${serialInputMode === 'bulk'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-amber-800 hover:text-amber-950'
                      }`}
                  >
                    Bulk Paste / Scanner
                  </button>
                  <button
                    type="button"
                    onClick={() => setSerialInputMode('individual')}
                    className={`px-2.5 py-1 rounded-md transition-all ${serialInputMode === 'individual'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-amber-800 hover:text-amber-950'
                      }`}
                  >
                    Individual Inputs
                  </button>
                </div>
              </div>

              {serialInputMode === 'bulk' ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-amber-800 font-medium">
                    Paste or scan multiple serial numbers at once (separated by line breaks, commas, or spaces):
                  </p>
                  <textarea
                    rows={4}
                    placeholder={`e.g.\nSN10002934\nSN10002935\nSN10002936`}
                    value={bulkSerialText}
                    onChange={(e) => handleBulkTextChange(e.target.value)}
                    className="input-tactile font-mono text-xs py-2 bg-white resize-y"
                  />

                  {/* Counter and Duplicate Alert */}
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                    <span className="font-bold text-amber-950">
                      Detected Unique Serials: {formData.serialNumbers.filter(Boolean).length} / {formData.quantity}
                    </span>

                    {hasDuplicateSerials(formData.serialNumbers) && (
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        ⚠️ Duplicate serials found
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {formData.serialNumbers.map((s, idx) => (
                    <input
                      key={idx}
                      type="text"
                      required
                      placeholder={`Unit #${idx + 1} Serial Number`}
                      value={s}
                      onChange={(e) => handleSerialChange(idx, e.target.value)}
                      className="input-tactile font-mono text-xs py-1 px-2.5 bg-white"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full justify-center py-3 text-sm font-bold shadow-md shadow-indigo-500/20"
          >
            {submitting ? 'Adding Stock...' : 'Submit Branch Stock Intake'}
          </button>
        </form>
      </div>
    </div>
  );
};
