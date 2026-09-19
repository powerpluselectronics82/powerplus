import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useCart } from '../context/CartContext';
import { productService } from '../services/productService';
import { saleService } from '../services/saleService';
import { TaxInvoiceModal } from '../components/pos/TaxInvoiceModal';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle,
  AlertCircle,
  Receipt,
  UserCheck,
  Phone,
  Tag,
} from 'lucide-react';

const getProductPrice = (product) => {
  if (!product) return 0;
  const mrp = Number(product.mrp || 0);
  const discountVal = Number(product.discountValue || 0);
  const discountAmount = product.discountType === 'percentage'
    ? (mrp * discountVal) / 100
    : discountVal;
  if (discountAmount > 0) {
    return Math.max(0, mrp - discountAmount);
  }
  return Number(product.sellingPrice ?? mrp);
};

import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchBranchProducts, invalidateProductCaches } from '../redux/slices/productsSlice';
import { invalidateSalesCache, recordSaleInDailySummary } from '../redux/slices/salesSlice';
import { invalidateAnalyticsCache } from '../redux/slices/analyticsSlice';

export const PosPage = () => {
  const dispatch = useAppDispatch();
  const { user, companyId } = useAuth();
  const { selectedBranchId, currentBranch } = useBranch();
  const {
    items,
    addItemByProduct,
    updateQuantity,
    removeItem,
    clearCart,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerAddress,
    setCustomerAddress,
    paymentMethod,
    setPaymentMethod,
    completedSale,
    setCompletedSale,
    totals,
    isInvoiceOpen,
    setIsInvoiceOpen,
  } = useCart();

  // Redux Cached Branch Products
  const { branchProducts: products, branchLoading: loading } = useAppSelector((state) => state.products);
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  // Serial Number & Price Tier Modal States
  const [pendingSerialProduct, setPendingSerialProduct] = useState(null);
  const [pendingPriceGroup, setPendingPriceGroup] = useState(null);
  const [serialInput, setSerialInput] = useState('');
  const [serialError, setSerialError] = useState('');

  // Due / Partial Payment States
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [isCustomPaid, setIsCustomPaid] = useState(false);

  const activeBranchId = selectedBranchId || currentBranch?._id || user?.branchId;

  // Fetch branch inventory
  const loadProducts = (force = false) => {
    if (!activeBranchId) return;
    dispatch(fetchBranchProducts({ branchId: activeBranchId, force }));
  };

  useEffect(() => {
    loadProducts();
  }, [activeBranchId, dispatch]);

  // Select/Click Product Handler
  const handleSelectProduct = (product) => {
    const availableSerialUnits = Array.isArray(product.inventoryUnits)
      ? product.inventoryUnits.filter(
        (u) => u && (u.status === 'available' || (!u.status && u.status !== 'sold' && u.status !== 'damaged'))
      )
      : [];

    const inCartForThisProduct = items
      .filter((i) => i.product._id === product._id && i.serialNumber)
      .map((i) => i.serialNumber);

    const unselectedSerialUnits = availableSerialUnits.filter(
      (u) => !inCartForThisProduct.includes(u.serialNumber)
    );

    const stock = product.isSerialized
      ? unselectedSerialUnits.length
      : (product.stock ?? product.availableStock ?? product.Stock ?? product.quantity ?? 0);

    if (stock <= 0) return;

    if (product.isSerialized) {
      setPendingSerialProduct(product);
      setSerialInput('');
      setSerialError('');
    } else {
      addItemByProduct(product, 1);
    }
  };

  // Confirm Serial Number Handler
  const handleConfirmSerial = async (e) => {
    e?.preventDefault();
    const cleanSerial = serialInput.trim();
    if (!cleanSerial) {
      setSerialError('Serial number is required for serialized items');
      return;
    }

    let matchedUnit = null;
    if (Array.isArray(pendingSerialProduct?.inventoryUnits)) {
      matchedUnit = pendingSerialProduct.inventoryUnits.find(
        (u) => u && String(u.serialNumber).trim().toLowerCase() === cleanSerial.toLowerCase()
      );
    }

    // If not found in local state, try API lookup for verification
    if (!matchedUnit && activeBranchId) {
      try {
        const apiRes = await productService.getProductBySerialNumber(activeBranchId, cleanSerial);
        if (apiRes?.success && apiRes?.data) {
          const apiProdId = String(apiRes.data._id || apiRes.data.productId?._id || apiRes.data.productId || '');
          if (apiProdId === String(pendingSerialProduct._id)) {
            matchedUnit = apiRes.data;
          }
        }
      } catch (_) { }
    }

    // STRICT CHECK: Block cart addition if serial number is not found in inventory
    if (!matchedUnit) {
      setSerialError(`Serial number "${cleanSerial}" is invalid or not found for ${pendingSerialProduct.name}.`);
      return;
    }

    const unitStatus = matchedUnit.inventoryStatus || matchedUnit.status || 'available';
    if (unitStatus !== 'available') {
      setSerialError(`Serial number "${cleanSerial}" is marked as ${unitStatus} and cannot be sold.`);
      return;
    }

    const inCartSerials = items.map((i) => i.serialNumber).filter(Boolean);
    if (inCartSerials.some((s) => String(s).toLowerCase() === cleanSerial.toLowerCase())) {
      setSerialError(`Serial number "${cleanSerial}" is already in the cart.`);
      return;
    }

    const productWithUnitPrice = {
      ...pendingSerialProduct,
      mrp: matchedUnit.mrp !== undefined && matchedUnit.mrp !== null ? matchedUnit.mrp : pendingSerialProduct.mrp,
      discountType: matchedUnit.discountType || pendingSerialProduct.discountType,
      discountValue: matchedUnit.discountValue !== undefined && matchedUnit.discountValue !== null ? matchedUnit.discountValue : pendingSerialProduct.discountValue,
      sellingPrice: matchedUnit.sellingPrice !== undefined && matchedUnit.sellingPrice !== null ? matchedUnit.sellingPrice : pendingSerialProduct.sellingPrice,
    };

    addItemByProduct(productWithUnitPrice, 1, cleanSerial);
    setPendingSerialProduct(null);
    setSerialInput('');
    setSerialError('');
  };

  // Barcode / Serial Scan handler
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;
    setError('');

    // 1. Check local loaded branch products for Serial Number match first
    for (const p of products) {
      if (Array.isArray(p.inventoryUnits)) {
        const u = p.inventoryUnits.find(
          (unit) => unit && String(unit.serialNumber).trim().toLowerCase() === query.toLowerCase()
        );
        if (u) {
          const productWithUnitPrice = {
            ...p,
            mrp: u.mrp !== undefined && u.mrp !== null ? u.mrp : p.mrp,
            discountType: u.discountType || p.discountType,
            discountValue: u.discountValue !== undefined && u.discountValue !== null ? u.discountValue : p.discountValue,
            sellingPrice: u.sellingPrice !== undefined && u.sellingPrice !== null ? u.sellingPrice : p.sellingPrice,
          };
          addItemByProduct(productWithUnitPrice, 1, u.serialNumber);
          setBarcodeInput('');
          return;
        }
      }
    }

    // 2. Check local loaded branch products for Barcode / Model Number match
    const localBarcodeMatches = products.filter(
      (p) =>
        String(p.barcode || '').trim().toLowerCase() === query.toLowerCase() ||
        String(p.modelNumber || '').trim().toLowerCase() === query.toLowerCase()
    );

    if (localBarcodeMatches.length > 0) {
      const serializedMatch = localBarcodeMatches.find((p) => p.isSerialized);
      if (serializedMatch) {
        setPendingSerialProduct(serializedMatch);
        setSerialInput('');
        setSerialError('');
      } else if (localBarcodeMatches.length === 1) {
        addItemByProduct(localBarcodeMatches[0], 1);
      } else {
        // Multiple price tiers (different MRPs) exist for this non-serialized product barcode
        setPendingPriceGroup(localBarcodeMatches);
      }
      setBarcodeInput('');
      return;
    }

    // 3. Fallback: try serial lookup via API
    if (activeBranchId) {
      try {
        const serialRes = await productService.getProductBySerialNumber(activeBranchId, query);
        if (serialRes?.success && serialRes?.data) {
          addItemByProduct(serialRes.data, 1, query);
          setBarcodeInput('');
          return;
        }
      } catch (_) { }
    }

    // 4. Fallback: try master barcode lookup via API
    try {
      const res = await productService.getProductByBarcode(query);
      if (res?.success && res?.data) {
        const foundMasterProduct = res.data;
        const branchMatch = products.find(
          (p) => p._id === foundMasterProduct._id || p.barcode === foundMasterProduct.barcode
        );
        const productToAdd = branchMatch ? branchMatch : foundMasterProduct;

        if (productToAdd.isSerialized) {
          setPendingSerialProduct(productToAdd);
          setSerialInput('');
          setSerialError('');
        } else {
          addItemByProduct(productToAdd, 1);
        }
        setBarcodeInput('');
        return;
      }
    } catch (_) { }

    setError(`Item not found for code: ${query}`);
  };

  // Checkout sale submission
  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!activeBranchId) {
      setError('Branch not selected');
      return;
    }
    setCheckoutLoading(true);
    setError('');

    const finalPaid = isCustomPaid ? (Number(paidAmountInput) || 0) : totals.grandTotal;
    const sanitizedPaid = Math.max(0, Math.min(finalPaid, totals.grandTotal));
    const calculatedDue = Math.max(0, Number((totals.grandTotal - sanitizedPaid).toFixed(2)));
    const calculatedStatus = calculatedDue <= 0 ? 'PAID' : (sanitizedPaid > 0 ? 'PARTIAL' : 'UNPAID');

    const payload = {
      companyId: companyId || user?.companyId,
      branchId: activeBranchId,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '9999999999',
      customerAddress: customerAddress || '',
      paidAmount: sanitizedPaid,
      dueAmount: calculatedDue,
      paymentStatus: calculatedStatus,
      items: items.map((item) => ({
        productId: item.product._id,
        barcode: item.product.barcode,
        unit: item.unit,
        mrp: item.product.mrp !== undefined && item.product.mrp !== null ? item.product.mrp : (item.product.sellingPrice || 0),
        serialNumber: item.product.isSerialized ? (item.serialNumber || '') : '',
      })),
      paymentMethod,
      cashierId: user?.userId || user?._id,
      cashierName: user?.name || 'Cashier',
    };

    try {
      const res = await saleService.createSale(payload);
      if (res.success && res.data) {
        setCompletedSale(res.data);
        clearCart();
        setIsCustomPaid(false);
        setPaidAmountInput('');
        dispatch(recordSaleInDailySummary(res.data));
        dispatch(invalidateProductCaches());
        dispatch(invalidateAnalyticsCache());
        loadProducts(true); // refresh available stock
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!p) return false;
    const q = (search || '').toLowerCase().trim();
    if (!q) return true;
    const name = String(p.name || '').toLowerCase();
    const barcode = String(p.barcode || '').toLowerCase();
    const category = String(p.category || '').toLowerCase();
    return name.includes(q) || barcode.includes(q) || category.includes(q);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)]">
      {/* Left Column: Product Search & Grid (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col space-y-4 h-full">
        {/* Barcode & Search Header */}
        <div className="tactile-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-indigo-600" />
              Quick Barcode / Serial Scanner
            </span>
            <span className="px-3 py-0.5 rounded-full bg-amber-400 text-black border border-amber-500 font-black text-xs shadow-sm">
              Branch: {currentBranch?.name || 'Active Store'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Barcode Form */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode or Serial Number + Enter"
                className="input-tactile font-mono text-xs pl-3 pr-3 bg-slate-50 border-indigo-200 focus:bg-white"
              />
            </form>

            {/* Keyword Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalog by name..."
                className="input-tactile text-xs pl-3"
              />
            </div>
          </div>

          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Product Cards Grid */}
        <div className="tactile-card p-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-semibold text-sm">
              Loading inventory products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-semibold text-sm">
              No active products found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product, index) => {
                const availableSerialUnits = Array.isArray(product.inventoryUnits)
                  ? product.inventoryUnits.filter(
                    (u) => u && (u.status === 'available' || (!u.status && u.status !== 'sold' && u.status !== 'damaged'))
                  )
                  : [];

                const inCartForThisProduct = items
                  .filter((i) => i.product._id === product._id && i.serialNumber)
                  .map((i) => i.serialNumber);

                const unselectedSerialUnits = availableSerialUnits.filter(
                  (u) => !inCartForThisProduct.includes(u.serialNumber)
                );

                const stock = product.isSerialized
                  ? unselectedSerialUnits.length
                  : (product.stock ?? product.availableStock ?? product.Stock ?? product.quantity ?? 0);

                const price = getProductPrice(product);
                const mrp = Number(product.mrp || 0);
                const isOutOfStock = stock <= 0;

                return (
                  <div
                    key={`${product._id || product.barcode || 'prod'}_${index}`}
                    onClick={() => handleSelectProduct(product)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${isOutOfStock
                        ? 'opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : 'bg-white border-slate-200/80 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5'
                      }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1 gap-1">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded truncate">
                          {product.barcode}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {product.isSerialized && (
                            <span className="text-[9px] font-extrabold bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
                              SN
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock <= (product.minStockLevel || 5)
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                              }`}
                          >
                            {stock} available
                          </span>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="font-extrabold text-indigo-600 text-sm font-mono">
                          ₹{price.toFixed(2)}
                        </div>
                        {mrp > price && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-mono line-through">
                              ₹{mrp}
                            </span>
                            {product.discountValue > 0 && (
                              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1 rounded">
                                -{product.discountType === 'percentage' ? `${product.discountValue}%` : `₹${product.discountValue}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        disabled={isOutOfStock}
                        className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Right Column: POS Cart & Checkout Pane (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col space-y-4 h-full">
        <div className="tactile-card p-4 flex-1 flex flex-col justify-between overflow-hidden">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Active POS Sale ({items.length})
                </h3>
              </div>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Inputs */}
            <div className="space-y-2 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="input-tactile text-xs py-1.5 pl-3"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Customer Phone"
                    className="input-tactile text-xs py-1.5 pl-3"
                  />
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Customer Address (Street, City, State)"
                  className="input-tactile text-xs py-1.5 pl-3"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 mb-4">
              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  Cart is empty. Click items or scan barcode to add.
                </div>
              ) : (
                items.map(({ product, unit, serialNumber }, index) => {
                  const itemKey = serialNumber ? `${product._id}_${serialNumber}` : `${product._id}_${index}`;
                  return (
                    <div
                      key={itemKey}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <h5 className="font-bold text-slate-900 line-clamp-1">
                          {product.name}
                        </h5>
                        {serialNumber && (
                          <span className="inline-block text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5">
                            S/N: {serialNumber}
                          </span>
                        )}
                        <span className="font-mono text-slate-500 block text-[11px]">
                          ₹{getProductPrice(product).toFixed(2)} × {unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!product.isSerialized && (
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg">
                            <button
                              onClick={() => updateQuantity(product._id, unit - 1, product.mrp)}
                              className="p-1 hover:bg-slate-100 text-slate-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 font-mono font-bold text-slate-800">
                              {unit}
                            </span>
                            <button
                              onClick={() => updateQuantity(product._id, unit + 1, product.mrp)}
                              className="p-1 hover:bg-slate-100 text-slate-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => removeItem(product._id, serialNumber, product.mrp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Billing Calculation Pane */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            {/* Payment Method Selector */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Payment Mode
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: 'Cash', icon: Banknote },
                  { id: 'CARD', label: 'Card', icon: CreditCard },
                  { id: 'UPI', label: 'UPI/QR', icon: QrCode },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Paid & Due Controls */}
            <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80 space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Amount Paid</span>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPaid(false);
                      setPaidAmountInput('');
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold border transition-colors ${
                      !isCustomPaid || Number(paidAmountInput) === totals.grandTotal
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Full Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPaid(true);
                      setPaidAmountInput('0');
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold border transition-colors ${
                      isCustomPaid && Number(paidAmountInput) === 0
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Unpaid
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={totals.grandTotal}
                  value={isCustomPaid ? paidAmountInput : totals.grandTotal.toFixed(2)}
                  onChange={(e) => {
                    setIsCustomPaid(true);
                    setPaidAmountInput(e.target.value);
                  }}
                  className="input-tactile pl-7 text-xs font-mono font-bold py-1.5"
                  placeholder="Paid amount"
                />
              </div>

              {/* Dynamic Due Indicator */}
              {isCustomPaid && Number(paidAmountInput) < totals.grandTotal && (
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                  <span>Pending Due Balance:</span>
                  <span>
                    ₹{Math.max(0, totals.grandTotal - (Number(paidAmountInput) || 0)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Items:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST + SGST Tax:</span>
                <span>₹{totals.taxableValue.toFixed(2)}</span>
              </div>
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>MRP Discount:</span>
                  <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-indigo-600">₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Complete Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={items.length === 0 || checkoutLoading}
              className="btn-primary w-full justify-center py-3 text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50"
            >
              {checkoutLoading
                ? 'Processing Sale...'
                : isCustomPaid && Number(paidAmountInput) < totals.grandTotal
                ? `Checkout (Pay ₹${Math.max(0, Number(paidAmountInput) || 0).toFixed(2)}, Due ₹${Math.max(0, totals.grandTotal - (Number(paidAmountInput) || 0)).toFixed(2)})`
                : `Checkout (₹${totals.grandTotal.toFixed(2)})`}
            </button>
          </div>
        </div>
      </div>



      {/* Serial Number Prompt Modal */}
      {pendingSerialProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-xs">
                  SN
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Enter Unit Serial Number
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Serialized Product Tracking Required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingSerialProduct(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-mono text-indigo-600 font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                {pendingSerialProduct.barcode}
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm">
                {pendingSerialProduct.name}
              </h4>
              <p className="text-xs text-slate-600 font-mono flex items-center gap-1.5">
                <span>Price: ₹{getProductPrice(pendingSerialProduct).toFixed(2)}</span>
                {pendingSerialProduct.mrp > getProductPrice(pendingSerialProduct) && (
                  <span className="line-through text-slate-400 text-[11px]">₹{pendingSerialProduct.mrp}</span>
                )}
              </p>
            </div>

            {/* Quick-select available serial numbers grouped by price tier */}
            {(() => {
              const inCartSerials = items.map((i) => i.serialNumber).filter(Boolean);
              const availableUnits = Array.isArray(pendingSerialProduct?.inventoryUnits)
                ? pendingSerialProduct.inventoryUnits.filter(
                  (u) =>
                    u &&
                    (u.status === 'available' || (!u.status && u.status !== 'sold' && u.status !== 'damaged')) &&
                    !inCartSerials.includes(u.serialNumber)
                )
                : [];

              if (availableUnits.length === 0) return null;
              const productPrice = getProductPrice(pendingSerialProduct);

              // Group serial units by price tier
              const priceGroups = {};
              availableUnits.forEach((u) => {
                const priceVal = u.sellingPrice ?? u.mrp ?? productPrice;
                const pKey = Number(priceVal).toFixed(2);
                if (!priceGroups[pKey]) {
                  priceGroups[pKey] = [];
                }
                priceGroups[pKey].push(u);
              });

              const groupEntries = Object.entries(priceGroups);

              return (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Available Serial Numbers ({availableUnits.length} Total Available):
                  </span>
                  {groupEntries.map(([priceVal, unitList]) => (
                    <div
                      key={priceVal}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-600" />
                          Price Section: <span className="font-mono font-extrabold text-indigo-600">₹{priceVal}</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                          {unitList.length} Unit{unitList.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {unitList.map((u, idx) => (
                          <button
                            key={`${u._id || u.serialNumber || 'sn'}_${idx}`}
                            type="button"
                            onClick={() => setSerialInput(u.serialNumber)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${serialInput === u.serialNumber
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'
                              }`}
                          >
                            {u.serialNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <form onSubmit={handleConfirmSerial} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Scan or Type Serial Number:
                </label>
                <input
                  autoFocus
                  type="text"
                  value={serialInput}
                  onChange={(e) => {
                    setSerialInput(e.target.value);
                    setSerialError('');
                  }}
                  placeholder="e.g. S/N SN10002934"
                  className="input-tactile font-mono text-xs py-2"
                />
                {serialError && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1">
                    {serialError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingSerialProduct(null)}
                  className="btn-secondary w-full justify-center py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary w-full justify-center py-2 text-xs font-bold"
                >
                  Add Unit to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Tier Selection Modal for Non-Serialized Products with Multiple MRPs */}
      {pendingPriceGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold text-xs">
                  ₹
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Select Price Tier (MRP)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Multiple price batches found for {pendingPriceGroup[0]?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingPriceGroup(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pendingPriceGroup.map((item, idx) => {
                const price = getProductPrice(item);
                const isOutOfStock = (item.stock ?? 0) <= 0;
                return (
                  <button
                    key={`${item.branchInventoryId || item._id}_${idx}`}
                    disabled={isOutOfStock}
                    onClick={() => {
                      addItemByProduct(item, 1);
                      setPendingPriceGroup(null);
                    }}
                    className="w-full text-left p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-between disabled:opacity-50"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">
                        MRP: <span className="font-mono text-indigo-600">₹{item.mrp || price}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Selling Price: ₹{price.toFixed(2)}
                        {item.discountValue > 0 && (
                          <span className="ml-1 text-emerald-600 font-bold text-[10px]">
                            (-{item.discountType === 'percentage' ? `${item.discountValue}%` : `₹${item.discountValue}`})
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                      {item.stock} Available
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPendingPriceGroup(null)}
              className="btn-secondary w-full justify-center py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Official Tax Invoice Modal on Checkout */}
      <TaxInvoiceModal
        sale={completedSale}
        isOpen={Boolean(completedSale)}
        onClose={() => setCompletedSale(null)}
        branch={currentBranch}
      />
    </div>
  );
};
