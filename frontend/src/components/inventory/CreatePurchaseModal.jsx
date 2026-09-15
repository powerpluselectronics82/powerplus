import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  ShoppingBag,
  Truck,
  Calendar,
  Hash,
  Calculator,
  Barcode,
  Check,
  ChevronDown,
} from 'lucide-react';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import { purchaseService } from '../../services/purchaseService';
import { useBranch } from '../../context/BranchContext';

// Searchable Product Combobox for Purchase Invoice rows
const ProductSearchSelector = ({ item, index, products, onSelect, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(
    item.name ? `${item.name}${item.barcode ? ` (${item.barcode})` : ''}` : ''
  );
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (item.productId && item.name) {
      setSearchTerm(`${item.name}${item.barcode ? ` (${item.barcode})` : ''}`);
    } else if (!item.productId) {
      setSearchTerm('');
    }
  }, [item.productId, item.name, item.barcode]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    if (item.productId && `${p.name} (${p.barcode})`.toLowerCase() === q) return true;
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.barcode && String(p.barcode).toLowerCase().includes(q)) ||
      (p.modelNumber && String(p.modelNumber).toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const handleSelectProduct = (p) => {
    onSelect(index, p._id);
    setSearchTerm(`${p.name}${p.barcode ? ` (${p.barcode})` : ''}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onClear(index);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const exact = products.find(
        (p) => String(p.barcode).trim().toLowerCase() === searchTerm.trim().toLowerCase()
      );
      if (exact) {
        handleSelectProduct(exact);
        return;
      }
      if (filteredProducts.length === 1) {
        handleSelectProduct(filteredProducts[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (!e.target.value && item.productId) {
              handleClear();
            }
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search product by name or barcode..."
          className="tactile-input text-xs w-full pl-3 pr-8 font-semibold bg-white"
          required={!item.productId}
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          {filteredProducts.length === 0 ? (
            <div className="p-3 text-center text-slate-400 font-semibold text-xs">
              No products found matching "{searchTerm}"
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isSelected = item.productId === p._id;
              return (
                <div
                  key={p._id}
                  onClick={() => handleSelectProduct(p)}
                  className={`p-2.5 hover:bg-indigo-50/80 cursor-pointer transition-colors flex items-center justify-between gap-2.5 ${
                    isSelected ? 'bg-indigo-50/90 border-l-4 border-l-indigo-600' : ''
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
  );
};

export const CreatePurchaseModal = ({ isOpen, onClose, onSuccess }) => {
  const { currentBranch, selectedBranchId } = useBranch();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    purchaseInvoiceNumber: `PUR-${Date.now().toString().slice(-6)}`,
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'PAID',
  });

  const [items, setItems] = useState([
    {
      productId: '',
      barcode: '',
      name: '',
      quantity: 1,
      purchasePrice: 0,
      mrp: 0,
      cgstRate: 9,
      sgstRate: 9,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen, selectedBranchId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [supRes, prodRes] = await Promise.all([
        supplierService.getAllSuppliers(),
        selectedBranchId
          ? productService.getBranchProducts(selectedBranchId)
          : productService.getAllProducts(),
      ]);

      if (supRes?.success) {
        setSuppliers(supRes.data || []);
      }
      if (prodRes?.success) {
        const prodList = (prodRes.data || []).map((p) => (p.productId ? p.productId : p));
        setProducts(prodList);
      }
    } catch (err) {
      console.error('Failed to load purchase modal data:', err);
      setError('Failed to load suppliers or product catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = (e) => {
    const selectedId = e.target.value;
    const found = suppliers.find((s) => s._id === selectedId);
    setFormData({
      ...formData,
      supplierId: selectedId,
      supplierName: found ? found.name : '',
    });
  };

  const handleProductSelect = (index, productId) => {
    const found = products.find((p) => p._id === productId);
    const updated = [...items];
    if (found) {
      updated[index] = {
        ...updated[index],
        productId: found._id,
        barcode: found.barcode,
        name: found.name,
        hsnCode: found.hsnCode || '',
        modelNumber: found.modelNumber || '',
        purchasePrice: found.purchasePrice || updated[index].purchasePrice || 0,
        mrp: found.mrp || 0,
        cgstRate: found.cgstRate ?? 9,
        sgstRate: found.sgstRate ?? 9,
      };
    } else {
      updated[index].productId = productId;
    }
    setItems(updated);
  };

  const handleProductClear = (index) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: '',
      barcode: '',
      name: '',
      hsnCode: '',
      modelNumber: '',
    };
    setItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        productId: '',
        barcode: '',
        name: '',
        hsnCode: '',
        modelNumber: '',
        quantity: 1,
        purchasePrice: 0,
        mrp: 0,
        cgstRate: 9,
        sgstRate: 9,
      },
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Real-time Order Summary Calculations
  const calculateSummary = () => {
    let subtotal = 0;
    let taxTotal = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.purchasePrice) || 0;
      const base = qty * cost;
      const taxRate = (Number(item.cgstRate) || 0) + (Number(item.sgstRate) || 0);
      const tax = (base * taxRate) / 100;

      subtotal += base;
      taxTotal += tax;
    });

    return {
      subtotal,
      taxTotal,
      grandTotal: subtotal + taxTotal,
    };
  };

  const summary = calculateSummary();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedBranchId && !currentBranch?._id) {
      setError('Please select a branch before creating a purchase order');
      return;
    }

    if (!formData.supplierId) {
      setError('Please select a supplier');
      return;
    }

    if (!formData.purchaseInvoiceNumber.trim()) {
      setError('Purchase Invoice Number is required');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        setError(`Item #${i + 1}: Please select a product`);
        return;
      }
      if (Number(item.quantity) <= 0) {
        setError(`Item #${i + 1}: Quantity must be at least 1`);
        return;
      }
      if (Number(item.purchasePrice) <= 0) {
        setError(`Item #${i + 1}: Unit Cost must be greater than 0`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        branchId: selectedBranchId || currentBranch._id,
        supplierId: formData.supplierId,
        supplierName: formData.supplierName,
        purchaseInvoiceNumber: formData.purchaseInvoiceNumber,
        purchaseDate: formData.purchaseDate,
        paymentStatus: formData.paymentStatus,
        items: items.map((item) => ({
          productId: item.productId,
          barcode: item.barcode,
          name: item.name,
          hsnCode: item.hsnCode,
          modelNumber: item.modelNumber,
          quantity: Number(item.quantity),
          purchasePrice: Number(item.purchasePrice),
          mrp: Number(item.mrp || 0),
          cgstRate: Number(item.cgstRate || 0),
          sgstRate: Number(item.sgstRate || 0),
        })),
      };

      const res = await purchaseService.createPurchase(payload);
      if (res?.success) {
        onSuccess && onSuccess();
        onClose();
      } else {
        setError(res?.message || 'Failed to create purchase order');
      }
    } catch (err) {
      console.error('Purchase creation error:', err);
      setError(err.message || 'Error processing purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">New Stock Purchase Invoice</h3>
              <p className="text-xs text-slate-400">
                Receive stock into branch:{' '}
                <span className="text-indigo-300 font-semibold">
                  {currentBranch?.name || 'Selected Branch'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-slate-400 font-medium">
              Loading suppliers and catalog...
            </div>
          ) : (
            <form id="purchase-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Top Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-indigo-600" /> Supplier *
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={handleSupplierChange}
                    className="tactile-input text-xs w-full"
                    required
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.brand})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" /> Purchase Invoice # *
                  </label>
                  <input
                    type="text"
                    value={formData.purchaseInvoiceNumber}
                    onChange={(e) => setFormData({ ...formData, purchaseInvoiceNumber: e.target.value })}
                    className="tactile-input text-xs w-full font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="tactile-input text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="tactile-input text-xs w-full"
                  >
                    <option value="PAID">PAID</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                  </select>
                </div>
              </div>

              {/* Purchase Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Line Items ({items.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="tactile-btn text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Item
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3 relative"
                      style={{ zIndex: items.length - idx + 10 }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Product Picker */}
                        <div className="md:col-span-5">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Product #{idx + 1} *
                          </label>
                          <ProductSearchSelector
                            item={item}
                            index={idx}
                            products={products}
                            onSelect={handleProductSelect}
                            onClear={handleProductClear}
                          />
                        </div>

                        {/* Qty */}
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Stock Qty *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="tactile-input text-xs w-full font-mono text-center font-bold"
                            required
                          />
                        </div>

                        {/* Buy Price */}
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Unit Cost (₹) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.purchasePrice}
                            onChange={(e) => handleItemChange(idx, 'purchasePrice', e.target.value)}
                            className="tactile-input text-xs w-full font-mono"
                            required
                          />
                        </div>

                        {/* Remove */}
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length === 1}
                            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Secondary Fields (Taxes & Line Total) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                            CGST %
                          </label>
                          <input
                            type="number"
                            value={item.cgstRate}
                            onChange={(e) => handleItemChange(idx, 'cgstRate', e.target.value)}
                            className="tactile-input text-[11px] py-1 px-2 w-full font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                            SGST %
                          </label>
                          <input
                            type="number"
                            value={item.sgstRate}
                            onChange={(e) => handleItemChange(idx, 'sgstRate', e.target.value)}
                            className="tactile-input text-[11px] py-1 px-2 w-full font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                            Line Total (Inc Tax)
                          </label>
                          <div className="font-mono font-bold text-slate-900 py-1 text-right">
                            ₹
                            {(
                              (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0) *
                              (1 + ((Number(item.cgstRate) || 0) + (Number(item.sgstRate) || 0)) / 100)
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Box */}
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-indigo-900 text-xs font-bold">
                  <Calculator className="w-4 h-4 text-indigo-600" /> Real-time Purchase Summary
                </div>
                <div className="flex items-center gap-6 text-xs font-mono">
                  <div>
                    <span className="text-slate-500">Subtotal:</span>{' '}
                    <span className="font-bold text-slate-800">₹{summary.subtotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tax Total:</span>{' '}
                    <span className="font-bold text-slate-800">₹{summary.taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-base font-extrabold text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-200">
                    Grand Total: ₹{summary.grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="tactile-btn bg-white text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="purchase-form"
            disabled={submitting}
            className="tactile-btn bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Processing Purchase Order...' : 'Submit & Receive Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};
