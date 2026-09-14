import React, { useState, useEffect } from 'react';
import { X, Plus, Boxes, Barcode, Calendar, Percent, Hash, AlertCircle, FileText } from 'lucide-react';
import { productService } from '../../services/productService';
import { useBranch } from '../../context/BranchContext';

export const AddStockModal = ({ isOpen, onClose, onRefresh }) => {
  const { selectedBranchId, currentBranch, branches } = useBranch();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mode for serial numbers: 'bulk' | 'individual'
  const [serialInputMode, setSerialInputMode] = useState('bulk');
  const [bulkSerialText, setBulkSerialText] = useState('');

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
      fetchCatalogProducts();
    }
  }, [isOpen]);

  const fetchCatalogProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await productService.getAllProducts();
      if (res?.success && Array.isArray(res.data)) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to load global catalog:', err);
      setError('Failed to load global catalog products');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleProductSelect = (barcode) => {
    const found = products.find((p) => p.barcode === barcode);
    setSelectedProduct(found || null);

    setFormData((prev) => ({
      ...prev,
      barcode,
      mrp: found?.mrp || prev.mrp || 0,
      purchasePrice: found?.purchasePrice || prev.purchasePrice || 0,
      cgstRate: found?.cgstRate || 9,
      sgstRate: found?.sgstRate || 9,
    }));
  };

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

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Catalog Product *
              </label>
              <select
                value={formData.barcode}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="input-tactile font-semibold"
                required
              >
                <option value="">-- Choose Product --</option>
                {products.map((p) => (
                  <option key={p._id} value={p.barcode}>
                    {p.name} ({p.barcode})
                  </option>
                ))}
              </select>
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
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      serialInputMode === 'bulk'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-amber-800 hover:text-amber-950'
                    }`}
                  >
                    Bulk Paste / Scanner
                  </button>
                  <button
                    type="button"
                    onClick={() => setSerialInputMode('individual')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      serialInputMode === 'individual'
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
