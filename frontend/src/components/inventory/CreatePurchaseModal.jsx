import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  RotateCcw,
} from 'lucide-react';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import { purchaseService } from '../../services/purchaseService';
import { useBranch } from '../../context/BranchContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchSuppliers } from '../../redux/slices/suppliersSlice';
import { fetchCatalogProducts, invalidateProductCaches } from '../../redux/slices/productsSlice';
import { addPurchaseToStore } from '../../redux/slices/purchasesSlice';

// Searchable Product Combobox with Confirmed Fill Card for Purchase Invoice rows
const ProductSearchSelector = ({ item, index, products, onSelect, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and deduplicate products: if one barcode has multiple entries, show it only one time!
  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(q)) ||
        (p.modelNumber && String(p.modelNumber).toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    });

    const unique = [];
    const seen = new Set();
    for (const p of list) {
      const key = p.barcode ? String(p.barcode).trim().toLowerCase() : String(p._id);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    }
    return unique;
  }, [products, searchTerm]);

  const handleSelectProduct = (p) => {
    onSelect(index, p);
    setSearchTerm('');
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
      const exact = filteredProducts.find(
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

  // Product Fill State: once product is selected, display a rich verified card with a Change button
  if (item.productId && item.name) {
    return (
      <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200/90 flex items-center justify-between gap-3 transition-all hover:bg-indigo-50 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-900 text-xs truncate">
              {item.name}
            </span>
            {item.isSerialized && (
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-100 text-indigo-700 rounded-full shrink-0">
                Serialized
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
              <Barcode className="w-3.5 h-3.5 text-indigo-600" />
              {item.barcode || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 flex-wrap font-medium">
            {item.category && (
              <span>Category: <strong className="text-slate-700">{item.category}</strong></span>
            )}
            {item.brand && (
              <span>• Brand: <strong className="text-slate-700">{item.brand}</strong></span>
            )}
            {item.modelNumber && (
              <span>• Model: <strong className="text-slate-700 font-mono">{item.modelNumber}</strong></span>
            )}
            {item.hsnCode && (
              <span>• HSN: <strong className="text-slate-700 font-mono">{item.hsnCode}</strong></span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-100/70 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
          title="Change this product"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Change
        </button>
      </div>
    );
  }

  // Unselected State: Search Input with real-time dropdown
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
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search product by name or barcode..."
          className="input-tactile text-xs w-full pl-3.5 pr-8 font-semibold bg-white"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="sticky top-0 z-10 px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px] font-extrabold text-slate-600">
            <span>Catalog Products ({filteredProducts.length})</span>
            <span className="text-indigo-600">{searchTerm ? `Filtering "${searchTerm}"` : 'All Created Products'}</span>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-slate-400 font-medium text-xs">
              No products found matching "{searchTerm}"
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isSelected = item.productId === p._id;
              return (
                <div
                  key={p._id || p.barcode}
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
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap font-medium">
                      <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                        <Barcode className="w-3 h-3 text-slate-500" />
                        {p.barcode}
                      </span>
                      {p.category && (
                        <span className="text-slate-500">{p.category}</span>
                      )}
                      {p.brand && (
                        <span className="text-slate-400">• {p.brand}</span>
                      )}
                      {p.modelNumber && (
                        <span className="font-mono text-slate-500">• {p.modelNumber}</span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 justify-end">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    </div>
                  )}
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
  const dispatch = useAppDispatch();
  const { suppliers: reduxSuppliers } = useAppSelector((state) => state.suppliers);
  const { catalogProducts: reduxCatalog } = useAppSelector((state) => state.products);
  const { currentBranch, selectedBranchId } = useBranch();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    purchaseInvoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'PAID',
  });

  const [items, setItems] = useState([
    {
      productId: '',
      barcode: '',
      name: '',
      hsnCode: '',
      modelNumber: '',
      category: '',
      brand: '',
      isSerialized: false,
      quantity: 1,
      purchasePrice: '',
      mrp: 0,
      cgstRate: 9,
      sgstRate: 9,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      setFormData({
        supplierId: '',
        supplierName: '',
        purchaseInvoiceNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'PAID',
      });
      setItems([
        {
          productId: '',
          barcode: '',
          name: '',
          hsnCode: '',
          modelNumber: '',
          category: '',
          brand: '',
          isSerialized: false,
          quantity: 1,
          purchasePrice: '',
          mrp: 0,
          cgstRate: 9,
          sgstRate: 9,
        },
      ]);
    }
  }, [isOpen, selectedBranchId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch suppliers (from Redux cache or API fallback)
      let supList = reduxSuppliers;
      if (!supList || supList.length === 0) {
        const supRes = await supplierService.getAllSuppliers();
        if (supRes?.success) supList = supRes.data || [];
      }
      setSuppliers(supList || []);

      // 2. Fetch master catalog products (from Redux cache or API fallback)
      let catList = reduxCatalog;
      if (!catList || catList.length === 0) {
        const allProdRes = await productService.getAllProducts();
        if (allProdRes?.success) catList = allProdRes.data || [];
      }

      // 3. Optionally fetch branch products to attach any existing branch pricing/MRP
      const branchProdRes = selectedBranchId
        ? await productService.getBranchProducts(selectedBranchId)
        : { success: false, data: [] };

      // Map branch pricing by product ID and barcode if available
      const branchPriceMap = new Map();
      if (branchProdRes?.success && Array.isArray(branchProdRes.data)) {
        for (const bp of branchProdRes.data) {
          const pId = bp.productId?._id
            ? String(bp.productId._id)
            : bp.productId
            ? String(bp.productId)
            : null;
          const bCode = bp.productId?.barcode || bp.barcode;
          const info = {
            mrp: bp.mrp || 0,
            sellingPrice: bp.sellingPrice || 0,
            purchasePrice: bp.purchasePrice || 0,
          };
          if (pId) branchPriceMap.set(pId, info);
          if (bCode) branchPriceMap.set(String(bCode).trim().toLowerCase(), info);
        }
      }

      const uniqueProducts = [];
      const seenBarcodes = new Set();
      const seenIds = new Set();

      // Prioritize ALL products created in the Product Section (Master Catalog)
      if (Array.isArray(catList)) {
        for (const p of catList) {
          if (!p) continue;
          const barcode = p.barcode ? String(p.barcode).trim().toLowerCase() : null;
          const id = p._id ? String(p._id) : null;

          if (barcode) {
            if (seenBarcodes.has(barcode)) continue;
            seenBarcodes.add(barcode);
          } else if (id) {
            if (seenIds.has(id)) continue;
            seenIds.add(id);
          }

          const branchPricing =
            (id && branchPriceMap.get(id)) ||
            (barcode && branchPriceMap.get(barcode)) ||
            {};

          uniqueProducts.push({
            ...p,
            mrp: branchPricing.mrp || p.mrp || 0,
            purchasePrice: branchPricing.purchasePrice || p.purchasePrice || '',
          });
        }
      }

      // Also include any branch inventory items that might not be in the allProdRes list
      if (branchProdRes?.success && Array.isArray(branchProdRes.data)) {
        for (const bp of branchProdRes.data) {
          const itemProd =
            bp.productId && typeof bp.productId === 'object' ? bp.productId : bp;
          if (!itemProd) continue;

          const barcode = itemProd.barcode
            ? String(itemProd.barcode).trim().toLowerCase()
            : null;
          const id = itemProd._id ? String(itemProd._id) : null;

          if (barcode && seenBarcodes.has(barcode)) continue;
          if (id && seenIds.has(id)) continue;

          if (barcode) seenBarcodes.add(barcode);
          if (id) seenIds.add(id);

          uniqueProducts.push({
            ...itemProd,
            mrp: bp.mrp || itemProd.mrp || 0,
            purchasePrice: bp.purchasePrice || itemProd.purchasePrice || '',
          });
        }
      }

      setProducts(uniqueProducts);
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

  const handleProductSelect = (index, product) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: product._id,
      barcode: product.barcode || '',
      name: product.name || '',
      hsnCode: product.hsnCode || '',
      modelNumber: product.modelNumber || '',
      category: product.category || '',
      brand: product.brand || '',
      isSerialized: product.isSerialized || false,
      purchasePrice:
        updated[index].purchasePrice !== ''
          ? updated[index].purchasePrice
          : product.purchasePrice || '',
      mrp: product.mrp || 0,
      cgstRate: product.cgstRate !== undefined ? product.cgstRate : 9,
      sgstRate: product.sgstRate !== undefined ? product.sgstRate : 9,
    };
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
      category: '',
      brand: '',
      isSerialized: false,
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
        category: '',
        brand: '',
        isSerialized: false,
        quantity: 1,
        purchasePrice: '',
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
        purchaseInvoiceNumber: formData.purchaseInvoiceNumber.trim(),
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
        if (res.data) {
          dispatch(addPurchaseToStore(res.data));
        }
        dispatch(invalidateProductCaches());
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
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] animate-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-slate-900 tracking-tight">
                  New Stock Purchase Invoice
                </h3>
                <span className="badge badge-indigo text-[10px]">
                  {currentBranch?.name || 'Selected Branch'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Record supplier purchase bill, intake inventory stock, and set line-item costs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
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
              {/* Top Header Fields: Supplier, Invoice Number, Date, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-indigo-600" /> Supplier *
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={handleSupplierChange}
                    className="input-tactile text-xs font-semibold"
                    required
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} {s.brand ? `(${s.brand})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" /> Purchase Invoice # *
                  </label>
                  <input
                    type="text"
                    value={formData.purchaseInvoiceNumber}
                    onChange={(e) => setFormData({ ...formData, purchaseInvoiceNumber: e.target.value })}
                    placeholder="Enter Invoice / Bill #..."
                    className="input-tactile text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="input-tactile text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="input-tactile text-xs font-bold"
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
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">
                      Line Items
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-100">
                      {items.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="tactile-btn text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Item
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const itemQty = Number(item.quantity) || 0;
                    const itemCost = Number(item.purchasePrice) || 0;
                    const itemBase = itemQty * itemCost;
                    const itemTaxRate = (Number(item.cgstRate) || 0) + (Number(item.sgstRate) || 0);
                    const itemLineTotal = itemBase * (1 + itemTaxRate / 100);

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-sm transition-all space-y-3 relative"
                        style={{ zIndex: items.length - idx + 10 }}
                      >
                        {/* Item Row Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-extrabold text-slate-800">
                              Item #{idx + 1}
                            </span>
                            {item.productId && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Ready
                              </span>
                            )}
                          </div>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          )}
                        </div>

                        {/* Main Grid: Product Picker, Qty, Unit Cost */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          {/* Product Picker & Filled State */}
                          <div className="md:col-span-6">
                            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Catalog Product *
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
                            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Stock Qty *
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="input-tactile text-xs font-mono text-center font-bold"
                              placeholder="1"
                              required
                            />
                          </div>

                          {/* Buy Price */}
                          <div className="md:col-span-3">
                            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Unit Cost (₹) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.purchasePrice}
                              onChange={(e) => handleItemChange(idx, 'purchasePrice', e.target.value)}
                              placeholder="0.00"
                              className="input-tactile text-xs font-mono font-bold px-3"
                              required
                            />
                          </div>
                        </div>

                        {/* Secondary Fields (Taxes & Line Total) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-slate-100 bg-slate-50/60 p-2.5 rounded-xl text-xs">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              CGST (%)
                            </label>
                            <input
                              type="number"
                              value={item.cgstRate}
                              onChange={(e) => handleItemChange(idx, 'cgstRate', e.target.value)}
                              className="input-tactile text-[11px] py-1 px-2.5 font-mono"
                              placeholder="9"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              SGST (%)
                            </label>
                            <input
                              type="number"
                              value={item.sgstRate}
                              onChange={(e) => handleItemChange(idx, 'sgstRate', e.target.value)}
                              className="input-tactile text-[11px] py-1 px-2.5 font-mono"
                              placeholder="9"
                            />
                          </div>

                          <div className="flex flex-col justify-end text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              Line Total (Inc. Tax)
                            </span>
                            <span className="text-sm font-black font-mono text-indigo-700 bg-white py-1 px-3 rounded-lg border border-indigo-100 shadow-2xs inline-block">
                              ₹{itemLineTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-slate-50 to-indigo-50/50 border border-indigo-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-indigo-950 text-xs font-extrabold">
                  <Calculator className="w-4 h-4 text-indigo-600" /> Real-time Purchase Summary
                </div>
                <div className="flex items-center gap-6 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 font-sans font-medium">Subtotal:</span>{' '}
                    <span className="font-bold text-slate-800">₹{summary.subtotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans font-medium">Tax Total:</span>{' '}
                    <span className="font-bold text-slate-800">₹{summary.taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-base font-black text-indigo-600 bg-white px-3.5 py-1.5 rounded-xl border border-indigo-200 shadow-xs">
                    Grand Total: ₹{summary.grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            <strong className="text-slate-800">{items.length}</strong> item{items.length > 1 ? 's' : ''} in this invoice
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="purchase-form"
              disabled={submitting}
              className="btn-primary text-xs px-5 py-2 disabled:opacity-50"
            >
              {submitting ? 'Processing Purchase Order...' : 'Submit & Receive Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
