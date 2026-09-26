import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowLeft,
  Cpu,
  HardDrive,
  Battery,
  Camera,
  Volume2,
  Wifi,
  ShieldCheck,
  PhoneCall,
  Palette,
  Ruler,
  Zap,
  Monitor,
  Info,
  Building2,
  DollarSign,
  FileText,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchCatalogProducts,
  fetchBranchProducts,
  invalidateProductCaches,
  fetchCategories,
  fetchBrands,
} from '../../redux/slices/productsSlice';

const EMPTY_ARRAY = [];

const getInitialFormData = (targetBranchId = '') => ({
  // Core Product Details
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

  // Full Technical Specifications
  specifications: {
    color: '',
    warranty: '',
    tollFreeNumber: '',
    dimensions: '',
    weight: '',
    powerConsumption: '',
    voltage: '',
    displaySize: '',
    resolution: '',
    ram: '',
    storage: '',
    batteryCapacity: '',
    processor: '',
    operatingSystem: '',
    camera: '',
    speaker: '',
    connectivity: '',
    features: '',
  },

  // Stock Intake details
  branchId: targetBranchId,
  quantity: '',
  purchasePrice: '',
  serialNumbers: [''],
});

export const UnifiedStockIntakeModal = ({ isOpen, onClose, onRefresh }) => {
  const dispatch = useAppDispatch();
  const { user, role } = useAuth();
  const { selectedBranchId, currentBranch, branches: contextBranches } = useBranch();
  const reduxBranches = useAppSelector((state) => state.branches?.branches) || EMPTY_ARRAY;

  // Compute effective branches combining Context, Redux, and user.branchId fallback
  const branches = useMemo(() => {
    const map = new Map();
    (contextBranches || []).forEach((b) => b && b._id && map.set(String(b._id), b));
    (reduxBranches || []).forEach(
      (b) => b && b._id && !map.has(String(b._id)) && map.set(String(b._id), b)
    );
    if (currentBranch && currentBranch._id && !map.has(String(currentBranch._id))) {
      map.set(String(currentBranch._id), currentBranch);
    }
    if (user?.branchId && !map.has(String(user.branchId))) {
      map.set(String(user.branchId), {
        _id: user.branchId,
        name: currentBranch?.name || user.branchName || 'Assigned Branch',
        code: currentBranch?.code || 'MAIN',
      });
    }
    return Array.from(map.values());
  }, [contextBranches, reduxBranches, currentBranch, user?.branchId, user?.branchName]);

  const isOwner = !role || role.toUpperCase() === 'OWNER' || role.toUpperCase() === 'ADMIN';

  const catalogProducts = useAppSelector((state) => state.products?.catalogProducts) || EMPTY_ARRAY;
  const reduxCategories = useAppSelector((state) => state.products?.categories) || EMPTY_ARRAY;
  const reduxBrands = useAppSelector((state) => state.products?.brands) || EMPTY_ARRAY;

  const targetBranchId =
    currentBranch?._id ||
    selectedBranchId ||
    user?.branchId ||
    branches?.[0]?._id ||
    '';

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

  // Active Technical Specs Tab
  const [specsActiveTab, setSpecsActiveTab] = useState('general');

  // Unified Form Data (No MRP, No discountType, No discountValue)
  const [formData, setFormData] = useState(() => getInitialFormData(targetBranchId));

  const resetState = () => {
    setQuery('');
    setSelectedProduct(null);
    setIsExistingProduct(false);
    setError('');
    setSuccessMsg('');
    setIsDropdownOpen(false);
    setBulkSerialText('');
    setSpecsActiveTab('general');
    setFormData(getInitialFormData(targetBranchId));
  };

  // Handle ESC key to close full-page workspace
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
    const exactMatch = (catalogProducts || []).find(
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
        const match = (catalogProducts || []).find(
          (p) =>
            String(p.barcode || '').trim().toLowerCase() === clean.toLowerCase() ||
            String(p.modelNumber || '').trim().toLowerCase() === clean.toLowerCase()
        );

        if (match) {
          applyExistingProduct(match);
        } else {
          const res = await productService.getProductByBarcode(clean);
          if (res?.success && res?.data) {
            applyExistingProduct(res.data);
          } else {
            setSelectedProduct(null);
            setIsExistingProduct(false);
            setFormData((prev) => ({
              ...prev,
              barcode: clean,
            }));
          }
        }
      } catch {
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

    const specs = prod.specifications || {};
    setFormData((prev) => ({
      ...prev,
      barcode: prod.barcode,
      name: prod.name,
      modelNumber: prod.modelNumber || '',
      hsnCode: prod.hsnCode || '',
      description: prod.description || '',
      category: prod.category || '',
      brand: prod.brand || '',
      isSerialized: prod.isSerialized || false,
      cgstRate: prod.cgstRate !== undefined ? prod.cgstRate : 9,
      sgstRate: prod.sgstRate !== undefined ? prod.sgstRate : 9,
      igstRate: prod.igstRate !== undefined ? prod.igstRate : 0,
      minStockLevel: prod.minStockLevel || 2,
      specifications: {
        color: specs.color || '',
        warranty: specs.warranty || '',
        tollFreeNumber: specs.tollFreeNumber || '',
        dimensions: specs.dimensions || '',
        weight: specs.weight || '',
        powerConsumption: specs.powerConsumption || '',
        voltage: specs.voltage || '',
        displaySize: specs.displaySize || '',
        resolution: specs.resolution || '',
        ram: specs.ram || '',
        storage: specs.storage || '',
        batteryCapacity: specs.batteryCapacity || '',
        processor: specs.processor || '',
        operatingSystem: specs.operatingSystem || '',
        camera: specs.camera || '',
        speaker: specs.speaker || '',
        connectivity: Array.isArray(specs.connectivity)
          ? specs.connectivity.join(', ')
          : specs.connectivity || '',
        features: Array.isArray(specs.features)
          ? specs.features.join(', ')
          : specs.features || '',
      },
      purchasePrice: prod.purchasePrice || prev.purchasePrice || '',
      quantity: prod.isSerialized ? 1 : '',
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

  // Specifications field update handler
  const handleSpecChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [field]: value,
      },
    }));
  };

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

  // Submit Handler: Handles both Existing Product & New Product with Full Specs
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const targetBranchId =
      currentBranch?._id ||
      selectedBranchId ||
      user?.branchId ||
      formData.branchId ||
      branches[0]?._id;
    if (!targetBranchId) {
      setError('No active branch found. Please ensure a branch is active in the header.');
      return;
    }

    const cleanBarcode = (formData.barcode || query || '').trim();
    if (!cleanBarcode) {
      setError('Barcode is required to register or intake stock');
      return;
    }

    if (formData.quantity === '' || formData.quantity === null || formData.quantity === undefined) {
      setError('Intake stock quantity is required');
      return;
    }

    const intakeQty = Number(formData.quantity);
    if (!Number.isInteger(intakeQty) || intakeQty <= 0) {
      setError('Intake stock quantity must be a positive integer (minimum 1 unit)');
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
          `Quantity (${intakeQty}) does not match the count of serial numbers entered (${cleanSerials.length})`
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
      // 1. If it's a NEW product, create the global catalog product with all technical details
      if (!isExistingProduct) {
        if (!formData.name.trim()) {
          setError('Product Name is required for new products');
          setSubmitting(false);
          return;
        }

        const parseCommaList = (val) => {
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            return val
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
          }
          return [];
        };

        const specs = formData.specifications || {};
        const productPayload = {
          barcode: cleanBarcode,
          name: formData.name.trim(),
          modelNumber: formData.modelNumber.trim(),
          hsnCode: formData.hsnCode.trim(),
          description: formData.description.trim(),
          category: formData.category || 'General',
          brand: formData.brand || '',
          isSerialized: Boolean(formData.isSerialized),
          cgstRate: Number(formData.cgstRate || 9),
          sgstRate: Number(formData.sgstRate || 9),
          igstRate: Number(formData.igstRate || 0),
          minStockLevel: Number(formData.minStockLevel || 2),
          specifications: {
            color: specs.color?.trim() || '',
            warranty: specs.warranty?.trim() || '',
            tollFreeNumber: specs.tollFreeNumber?.trim() || '',
            dimensions: specs.dimensions?.trim() || '',
            weight: specs.weight?.trim() || '',
            powerConsumption: specs.powerConsumption?.trim() || '',
            voltage: specs.voltage?.trim() || '',
            displaySize: specs.displaySize?.trim() || '',
            resolution: specs.resolution?.trim() || '',
            ram: specs.ram?.trim() || '',
            storage: specs.storage?.trim() || '',
            batteryCapacity: specs.batteryCapacity?.trim() || '',
            processor: specs.processor?.trim() || '',
            operatingSystem: specs.operatingSystem?.trim() || '',
            camera: specs.camera?.trim() || '',
            speaker: specs.speaker?.trim() || '',
            connectivity: parseCommaList(specs.connectivity),
            features: parseCommaList(specs.features),
          },
        };

        const createProdRes = await productService.addProduct(productPayload);
        if (!createProdRes.success) {
          throw new Error(createProdRes.message || 'Failed to create global product');
        }
      }

      // 2. Receive Stock Intake into Branch (Matches purchasePrice batch)
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
          }" to branch inventory at ₹${Number(formData.purchasePrice || 0).toLocaleString('en-IN')}.`
        );

        // Invalidate and refresh product caches
        dispatch(invalidateProductCaches());
        dispatch(fetchCatalogProducts({ force: true }));
        if (targetBranchId) {
          dispatch(fetchBranchProducts({ branchId: targetBranchId, force: true }));
        }
        if (onRefresh) onRefresh();

        // Reset search for next scan
        setTimeout(() => {
          resetState();
          searchInputRef.current?.focus();
        }, 1500);
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

  const currentBranchName =
    branches?.find((b) => b._id === (formData.branchId || selectedBranchId))?.name ||
    currentBranch?.name ||
    'Selected Branch';

  const totalIntakeValuation = Number(formData.quantity || 0) * Number(formData.purchasePrice || 0);

  const modalContent = (
    <div
      style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}
      className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] m-0 p-0 flex flex-col bg-slate-100 text-slate-800 overflow-hidden"
    >
      {/* Top Navigation Bar */}
      <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors"
            title="Press Esc to exit"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to Products</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 rounded text-slate-500">
              ESC
            </kbd>
          </button>

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-sm shadow-indigo-500/30">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base leading-tight flex items-center gap-2">
                Product & Stock Intake Workspace
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Full Page View
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Create new global products with technical specs or intake inventory into branch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Branch Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Branch:</span>
            <span className="text-indigo-600 font-extrabold">{currentBranchName}</span>
          </div>

          <button
            type="button"
            onClick={resetState}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            Clear Form
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
        {/* Alerts Container */}
        {(error || successMsg) && (
          <div className="px-6 pt-4 shrink-0">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="p-1 text-rose-500 hover:text-rose-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="flex-1">{successMsg}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMsg('')}
                  className="p-1 text-emerald-500 hover:text-emerald-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2-Column Responsive Workspace */}
        <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 overflow-hidden">
          {/* LEFT COLUMN: Product Definition & Full Technical Details */}
          <div className="xl:col-span-7 2xl:col-span-8 overflow-y-auto pr-2 space-y-6">
            {/* Card 1: Barcode & Product Identification */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    1. Barcode & Product Identification
                  </h3>
                </div>

                {isExistingProduct ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Existing Global Product Found
                  </span>
                ) : query.trim() ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    New Global Product to Register
                  </span>
                ) : null}
              </div>

              {/* Barcode Search / Scan Input */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Scan barcode with scanner or search product name / model number..."
                    className="w-full pl-11 pr-24 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-sm font-semibold text-slate-900 transition-all outline-none font-mono"
                  />
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />

                  {lookupLoading && (
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isDropdownOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-20">
                    <div className="p-2 border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Matching Global Products ({searchResults.length})
                    </div>
                    {searchResults.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => applyExistingProduct(item)}
                        className="w-full p-3 text-left hover:bg-indigo-50/70 border-b border-slate-100 last:border-0 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <span className="font-extrabold text-xs text-slate-900 block">
                            {item.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Barcode: {item.barcode} | Model: {item.modelNumber || 'N/A'}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.category || 'General'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Core Product Information */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    2. Core Product Information
                  </h3>
                </div>
                {isExistingProduct && (
                  <span className="text-xs font-semibold text-slate-500">
                    Loaded from catalog
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Product Name */}
                <div className="md:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={isExistingProduct}
                    placeholder="e.g. Samsung 55 Inch 4K Crystal UHD TV"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-600"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <input
                    type="text"
                    list="categories-list"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    disabled={isExistingProduct}
                    placeholder="e.g. Television / Mobile"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900 disabled:bg-slate-100"
                  />
                  <datalist id="categories-list">
                    {(reduxCategories || []).map((c, idx) => {
                      const name = typeof c === 'string' ? c : c?.name;
                      const key = (typeof c === 'object' && c?._id) ? c._id : (name || `cat-${idx}`);
                      return name ? <option key={key} value={name} /> : null;
                    })}
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
                    disabled={isExistingProduct}
                    placeholder="e.g. Samsung / Sony / Apple"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900 disabled:bg-slate-100"
                  />
                  <datalist id="brands-list">
                    {(reduxBrands || []).map((b, idx) => {
                      const name = typeof b === 'string' ? b : b?.name;
                      const key = (typeof b === 'object' && b?._id) ? b._id : (name || `brand-${idx}`);
                      return name ? <option key={key} value={name} /> : null;
                    })}
                  </datalist>
                </div>

                {/* Model Number */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Model Number</label>
                  <input
                    type="text"
                    value={formData.modelNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, modelNumber: e.target.value }))
                    }
                    disabled={isExistingProduct}
                    placeholder="e.g. UA55AUE60AKLXL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-mono font-semibold text-slate-900 disabled:bg-slate-100"
                  />
                </div>

                {/* HSN Code */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, hsnCode: e.target.value }))
                    }
                    disabled={isExistingProduct}
                    placeholder="e.g. 8528"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-mono font-semibold text-slate-900 disabled:bg-slate-100"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2 lg:col-span-3 space-y-1">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Product Description</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    disabled={isExistingProduct}
                    placeholder="Enter detailed product description, key highlights, or catalog notes..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-600 resize-none transition-all"
                  />
                </div>

                {/* CGST Rate */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">CGST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="any"
                    value={formData.cgstRate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cgstRate: e.target.value }))
                    }
                    disabled={isExistingProduct}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-mono font-semibold text-slate-900 disabled:bg-slate-100"
                  />
                </div>

                {/* SGST Rate */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">SGST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="any"
                    value={formData.sgstRate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sgstRate: e.target.value }))
                    }
                    disabled={isExistingProduct}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-mono font-semibold text-slate-900 disabled:bg-slate-100"
                  />
                </div>

                {/* IGST Rate */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">IGST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="any"
                    value={formData.igstRate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, igstRate: e.target.value }))
                    }
                    disabled={isExistingProduct}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-mono font-semibold text-slate-900 disabled:bg-slate-100"
                  />
                </div>

                {/* Min Stock Level */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Min Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStockLevel}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, minStockLevel: e.target.value }))
                    }
                    disabled={isExistingProduct}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-mono font-semibold text-slate-900 disabled:bg-slate-100"
                  />
                </div>

                {/* Serialized Tracking Toggle */}
                <div className="md:col-span-2 lg:col-span-3 flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 block text-xs">
                        Serialized Product Tracking (Unique Serial / IMEI per unit)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Enable for high-value items (Laptops, TVs, Phones) where each physical unit has a distinct serial number
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isExistingProduct}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, isSerialized: !prev.isSerialized }))
                    }
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      formData.isSerialized
                        ? 'bg-indigo-600 justify-end'
                        : 'bg-slate-300 justify-start'
                    } disabled:opacity-60`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Technical Details & Specifications */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      3. Product Technical Details & Specifications
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Configure comprehensive physical, electrical, and hardware specifications
                    </p>
                  </div>
                </div>

                {/* Spec Category Selector Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSpecsActiveTab('general')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      specsActiveTab === 'general'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    General
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecsActiveTab('display')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      specsActiveTab === 'display'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Display & Power
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecsActiveTab('performance')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      specsActiveTab === 'performance'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Performance & Memory
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecsActiveTab('multimedia')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      specsActiveTab === 'multimedia'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Audio & Features
                  </button>
                </div>
              </div>

              {/* SPEC TAB 1: General & Dimensions */}
              {specsActiveTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-slate-400" /> Color
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.color}
                      onChange={(e) => handleSpecChange('color', e.target.value)}
                      placeholder="e.g. Phantom Black / Silver"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Warranty Details
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.warranty}
                      onChange={(e) => handleSpecChange('warranty', e.target.value)}
                      placeholder="e.g. 1 Year Comprehensive Brand Warranty"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-slate-400" /> Customer Support / Toll Free
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.tollFreeNumber}
                      onChange={(e) => handleSpecChange('tollFreeNumber', e.target.value)}
                      placeholder="e.g. 1800-40-7267864"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-slate-400" /> Dimensions
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.dimensions}
                      onChange={(e) => handleSpecChange('dimensions', e.target.value)}
                      placeholder="e.g. 146.7 x 71.5 x 7.6 mm"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      Weight
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.weight}
                      onChange={(e) => handleSpecChange('weight', e.target.value)}
                      placeholder="e.g. 185 grams / 12.5 kg"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* SPEC TAB 2: Display & Power */}
              {specsActiveTab === 'display' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-slate-400" /> Display Size
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.displaySize}
                      onChange={(e) => handleSpecChange('displaySize', e.target.value)}
                      placeholder="e.g. 55 inch OLED / 6.7 inch AMOLED"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Resolution</label>
                    <input
                      type="text"
                      value={formData.specifications.resolution}
                      onChange={(e) => handleSpecChange('resolution', e.target.value)}
                      placeholder="e.g. 3840 x 2160 (4K UHD) / 1080p"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-slate-400" /> Power Consumption
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.powerConsumption}
                      onChange={(e) => handleSpecChange('powerConsumption', e.target.value)}
                      placeholder="e.g. 145W / 65W Max"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Operating Voltage</label>
                    <input
                      type="text"
                      value={formData.specifications.voltage}
                      onChange={(e) => handleSpecChange('voltage', e.target.value)}
                      placeholder="e.g. 220-240V AC, 50/60 Hz"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* SPEC TAB 3: Performance & Memory */}
              {specsActiveTab === 'performance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" /> Processor / Chipset
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.processor}
                      onChange={(e) => handleSpecChange('processor', e.target.value)}
                      placeholder="e.g. Snapdragon 8 Gen 3 / Apple M3"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      RAM (Memory)
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.ram}
                      onChange={(e) => handleSpecChange('ram', e.target.value)}
                      placeholder="e.g. 8GB LPDDR5X / 16GB Unified"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" /> Internal Storage (ROM)
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.storage}
                      onChange={(e) => handleSpecChange('storage', e.target.value)}
                      placeholder="e.g. 256GB UFS 4.0 / 1TB SSD"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Operating System (OS)</label>
                    <input
                      type="text"
                      value={formData.specifications.operatingSystem}
                      onChange={(e) => handleSpecChange('operatingSystem', e.target.value)}
                      placeholder="e.g. Android 14 / Tizen / Windows 11"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-slate-400" /> Battery Capacity
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.batteryCapacity}
                      onChange={(e) => handleSpecChange('batteryCapacity', e.target.value)}
                      placeholder="e.g. 5000 mAh / 70Wh"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* SPEC TAB 4: Audio, Camera & Features */}
              {specsActiveTab === 'multimedia' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-400" /> Camera Setup
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.camera}
                      onChange={(e) => handleSpecChange('camera', e.target.value)}
                      placeholder="e.g. 50MP Main OIS + 12MP Ultra-Wide + 10MP Telephoto"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-slate-400" /> Speakers / Audio
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.speaker}
                      onChange={(e) => handleSpecChange('speaker', e.target.value)}
                      placeholder="e.g. Stereo Speakers, Dolby Atmos, 20W Output"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-slate-400" /> Connectivity (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.connectivity}
                      onChange={(e) => handleSpecChange('connectivity', e.target.value)}
                      placeholder="e.g. 5G, Wi-Fi 6E, Bluetooth 5.3, NFC, HDMI 2.1, USB-C"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-slate-400" /> Key Features (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.specifications.features}
                      onChange={(e) => handleSpecChange('features', e.target.value)}
                      placeholder="e.g. IP68 Water Resistance, 45W Fast Charging, Wireless DeX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Branch Stock Intake Execution */}
          <div className="xl:col-span-5 2xl:col-span-4 flex flex-col bg-white rounded-3xl p-6 shadow-sm border border-slate-200 overflow-y-auto space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Stock Intake Execution
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Assign stock quantities, purchase cost, and serial units to branch
              </p>
            </div>

            {/* Target Branch: Always Current Active Branch */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Target Branch for Intake <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Current Branch
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-600/20">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block leading-tight">
                      {currentBranch?.name ||
                        branches.find((b) => b._id === (selectedBranchId || user?.branchId))?.name ||
                        branches[0]?.name ||
                        'Current Active Branch'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Code:{' '}
                      {currentBranch?.code ||
                        branches.find((b) => b._id === (selectedBranchId || user?.branchId))?.code ||
                        branches[0]?.code ||
                        'MAIN'}{' '}
                      | Receiving Store
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-white text-indigo-700 border border-indigo-200 shadow-xs">
                  Active Target
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Stock intake is automatically received into the currently active branch.
              </p>
            </div>

            {/* Purchase Price Input */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                  Purchase Cost / Unit Price (₹) <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold">
                  Batches grouped by Cost
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.purchasePrice}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, purchasePrice: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-600 bg-slate-50/50 focus:bg-white outline-none text-sm font-mono font-bold text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Note: MRP and discounts are omitted. Selling price is decided dynamically at sale time.
              </p>
            </div>

            {/* Serial Numbers OR Quantity */}
            {formData.isSerialized ? (
              <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    Serial Numbers / IMEIs
                  </span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSerialInputMode('bulk')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        serialInputMode === 'bulk'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Bulk Paste
                    </button>
                    <button
                      type="button"
                      onClick={() => setSerialInputMode('individual')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        serialInputMode === 'individual'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Individual
                    </button>
                  </div>
                </div>

                {serialInputMode === 'bulk' ? (
                  <div className="space-y-2">
                    <textarea
                      rows={5}
                      value={bulkSerialText}
                      onChange={(e) => setBulkSerialText(e.target.value)}
                      onBlur={handleBulkSerialBlur}
                      placeholder="Paste list of serial numbers separated by lines, commas, or tabs..."
                      className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                    />
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                      <span>
                        Parsed Units:{' '}
                        <strong>
                          {
                            bulkSerialText
                              .split(/[\n,;\t]+/)
                              .map((s) => s.trim())
                              .filter(Boolean).length
                          }
                        </strong>
                      </span>
                      <span className="text-[10px] text-indigo-600">
                        Auto-synchronizes intake quantity
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {formData.serialNumbers.map((sn, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 w-6">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={sn}
                          onChange={(e) => handleSerialChange(idx, e.target.value)}
                          placeholder={`Serial / IMEI #${idx + 1}`}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs outline-none focus:border-indigo-600"
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
            ) : (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs flex items-center justify-between">
                  <span>
                    Intake Stock Quantity <span className="text-rose-500">*</span>
                  </span>
                  {formData.quantity && (
                    <span className="text-[10px] text-indigo-600 font-semibold font-mono">
                      +{formData.quantity} Units
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      quantity: val === '' ? '' : Math.max(1, parseInt(val, 10) || 1),
                    }));
                  }}
                  placeholder="Enter intake quantity (e.g. 10)"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-600 bg-slate-50/50 focus:bg-white outline-none text-sm font-mono font-bold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Total Valuation Preview Widget */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-2 mt-auto">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block">
                Intake Valuation Preview
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-extrabold font-mono text-white">
                    ₹{totalIntakeValuation.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-indigo-200">
                    {formData.quantity || 0} unit(s) @ ₹{Number(formData.purchasePrice || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={submitting || (!isExistingProduct && !query.trim())}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isExistingProduct
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Processing Intake...
                </>
              ) : isExistingProduct ? (
                <>
                  <Boxes className="w-4 h-4" /> Receive Branch Inventory ({formData.quantity ? `+${formData.quantity} Units` : 'Enter Quantity'})
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Save Global Product & Receive Stock
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default UnifiedStockIntakeModal;
