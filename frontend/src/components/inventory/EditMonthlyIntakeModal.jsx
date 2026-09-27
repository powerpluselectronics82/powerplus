import React, { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import { useAppSelector } from '../../redux/hooks';
import {
  X,
  Edit3,
  Layers,
  Package,
  Barcode,
  Tag,
  Hash,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  Boxes,
  Cpu,
  Sliders,
  Maximize2,
  Minimize2,
  FileText,
  ShieldCheck,
  Smartphone,
  HardDrive,
  BatteryCharging,
  Eye,
  Camera,
  Volume2,
  PhoneCall,
  Sparkles,
} from 'lucide-react';

export const EditMonthlyIntakeModal = ({ isOpen, onClose, item, onSuccess }) => {
  const { catalogProducts = [], branchProducts = [] } = useAppSelector((state) => state.products || {});

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: '',
    brand: '',
    modelNumber: '',
    hsnCode: '',
    description: '',
    purchasePrice: 0,
    quantity: 1,
    specifications: {
      ram: '',
      storage: '',
      color: '',
      processor: '',
      operatingSystem: '',
      warranty: '',
      tollFreeNumber: '',
      dimensions: '',
      weight: '',
      powerConsumption: '',
      voltage: '',
      connectivity: '',
      displaySize: '',
      resolution: '',
      batteryCapacity: '',
      camera: '',
      speaker: '',
      features: '',
    },
  });

  const [isSerialized, setIsSerialized] = useState(false);
  const [serials, setSerials] = useState([]);
  const [newSerialInput, setNewSerialInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'BASIC', 'SPECS', 'SERIALS'
  const [isFullscreen, setIsFullscreen] = useState(true);

  useEffect(() => {
    if (!isOpen || !item) return;

    let isMounted = true;
    setError('');
    setSuccessMsg('');
    setNewSerialInput('');

    const serialized = Boolean(item.isSerialized);
    setIsSerialized(serialized);

    const initialSerials = (item.serialNumbers || []).map((s, idx) => {
      const sn = typeof s === 'object' ? s.serialNumber : s;
      const status = typeof s === 'object' ? (s.status || 'available') : 'available';
      return {
        id: s?.unitId || `serial-${idx}-${Date.now()}`,
        serialNumber: String(sn || '').trim(),
        originalSerialNumber: String(sn || '').trim(),
        status: String(status).toLowerCase(),
      };
    });
    setSerials(initialSerials);

    const getVal = (...vals) => {
      for (const v of vals) {
        if (v !== undefined && v !== null && String(v).trim().length > 0) {
          return typeof v === 'string' ? v.trim() : v;
        }
      }
      return '';
    };

    const getListVal = (...lists) => {
      for (const l of lists) {
        if (Array.isArray(l) && l.length > 0) {
          const joined = l.filter((x) => x && String(x).trim().length > 0).join(', ');
          if (joined) return joined;
        }
        if (typeof l === 'string' && l.trim().length > 0) {
          return l.trim();
        }
      }
      return '';
    };

    const applyData = (sourceProduct = {}, baseItem = item) => {
      const srcSpecs = (sourceProduct && typeof sourceProduct.specifications === 'object') ? sourceProduct.specifications : {};
      const itmSpecs = (baseItem && typeof baseItem.specifications === 'object') ? baseItem.specifications : {};

      // Cross-reference Redux catalog and branch products
      const pId = String(baseItem.productId?._id || baseItem.productId || sourceProduct._id || '');
      const barcode = String(baseItem.barcode || sourceProduct.barcode || '').trim();
      const rProd =
        (catalogProducts || []).find((p) => (pId && String(p._id) === pId) || (barcode && String(p.barcode) === barcode)) ||
        (branchProducts || []).find((p) => (pId && String(p.productId?._id || p._id) === pId) || (barcode && String(p.barcode) === barcode)) ||
        {};
      const rSpecs = (rProd && typeof rProd.specifications === 'object') ? rProd.specifications : {};

      const nameVal = getVal(sourceProduct.name, baseItem.name, rProd.name);
      const barcodeVal = getVal(sourceProduct.barcode, baseItem.barcode, rProd.barcode);
      const categoryVal = getVal(sourceProduct.category, baseItem.category, rProd.category);
      const brandVal = getVal(sourceProduct.brand, baseItem.brand, rProd.brand);
      const modelVal = getVal(sourceProduct.modelNumber, baseItem.modelNumber, rProd.modelNumber);
      const hsnVal = getVal(sourceProduct.hsnCode, baseItem.hsnCode, rProd.hsnCode);

      const descVal = getVal(
        sourceProduct.description,
        srcSpecs.description,
        baseItem.description,
        itmSpecs.description,
        rProd.description,
        rSpecs.description,
        sourceProduct.desc,
        baseItem.desc,
        rProd.desc
      );

      const featuresStr = getListVal(
        srcSpecs.features,
        sourceProduct.features,
        itmSpecs.features,
        baseItem.features,
        rSpecs.features,
        rProd.features
      );

      const connectivityStr = getListVal(
        srcSpecs.connectivity,
        sourceProduct.connectivity,
        itmSpecs.connectivity,
        baseItem.connectivity,
        rSpecs.connectivity,
        rProd.connectivity
      );

      setFormData((prev) => ({
        ...prev,
        name: nameVal || prev.name || '',
        barcode: barcodeVal || prev.barcode || '',
        category: categoryVal || prev.category || '',
        brand: brandVal || prev.brand || '',
        modelNumber: modelVal || prev.modelNumber || '',
        hsnCode: hsnVal || prev.hsnCode || '',
        description: descVal || prev.description || '',
        purchasePrice: Number(baseItem.purchasePrice ?? prev.purchasePrice ?? 0),
        quantity: baseItem.stockAdded || baseItem.quantity || prev.quantity || 1,
        specifications: {
          ram: getVal(srcSpecs.ram, itmSpecs.ram, rSpecs.ram, sourceProduct.ram, baseItem.ram, rProd.ram, prev.specifications.ram),
          storage: getVal(srcSpecs.storage, itmSpecs.storage, rSpecs.storage, sourceProduct.storage, baseItem.storage, rProd.storage, prev.specifications.storage),
          color: getVal(srcSpecs.color, itmSpecs.color, rSpecs.color, sourceProduct.color, baseItem.color, rProd.color, prev.specifications.color),
          processor: getVal(srcSpecs.processor, itmSpecs.processor, rSpecs.processor, sourceProduct.processor, baseItem.processor, rProd.processor, prev.specifications.processor),
          operatingSystem: getVal(srcSpecs.operatingSystem, itmSpecs.operatingSystem, rSpecs.operatingSystem, sourceProduct.operatingSystem, baseItem.operatingSystem, rProd.operatingSystem, prev.specifications.operatingSystem),
          warranty: getVal(srcSpecs.warranty, itmSpecs.warranty, rSpecs.warranty, sourceProduct.warranty, baseItem.warranty, rProd.warranty, prev.specifications.warranty),
          tollFreeNumber: getVal(srcSpecs.tollFreeNumber, itmSpecs.tollFreeNumber, rSpecs.tollFreeNumber, sourceProduct.tollFreeNumber, baseItem.tollFreeNumber, rProd.tollFreeNumber, prev.specifications.tollFreeNumber),
          dimensions: getVal(srcSpecs.dimensions, itmSpecs.dimensions, rSpecs.dimensions, sourceProduct.dimensions, baseItem.dimensions, rProd.dimensions, prev.specifications.dimensions),
          weight: getVal(srcSpecs.weight, itmSpecs.weight, rSpecs.weight, sourceProduct.weight, baseItem.weight, rProd.weight, prev.specifications.weight),
          powerConsumption: getVal(srcSpecs.powerConsumption, itmSpecs.powerConsumption, rSpecs.powerConsumption, sourceProduct.powerConsumption, baseItem.powerConsumption, rProd.powerConsumption, prev.specifications.powerConsumption),
          voltage: getVal(srcSpecs.voltage, itmSpecs.voltage, rSpecs.voltage, sourceProduct.voltage, baseItem.voltage, rProd.voltage, prev.specifications.voltage),
          connectivity: connectivityStr || prev.specifications.connectivity || '',
          displaySize: getVal(srcSpecs.displaySize, itmSpecs.displaySize, rSpecs.displaySize, sourceProduct.displaySize, baseItem.displaySize, rProd.displaySize, prev.specifications.displaySize),
          resolution: getVal(srcSpecs.resolution, itmSpecs.resolution, rSpecs.resolution, sourceProduct.resolution, baseItem.resolution, rProd.resolution, prev.specifications.resolution),
          batteryCapacity: getVal(srcSpecs.batteryCapacity, itmSpecs.batteryCapacity, rSpecs.batteryCapacity, sourceProduct.batteryCapacity, baseItem.batteryCapacity, rProd.batteryCapacity, prev.specifications.batteryCapacity),
          camera: getVal(srcSpecs.camera, itmSpecs.camera, rSpecs.camera, sourceProduct.camera, baseItem.camera, rProd.camera, prev.specifications.camera),
          speaker: getVal(srcSpecs.speaker, itmSpecs.speaker, rSpecs.speaker, sourceProduct.speaker, baseItem.speaker, rProd.speaker, prev.specifications.speaker),
          features: featuresStr || prev.specifications.features || '',
        },
      }));
    };

    // 1. Initial populate from item and Redux
    applyData({}, item);

    // 2. Fetch fresh full product document from API to ensure ALL description and specifications are loaded!
    const fetchFullProduct = async () => {
      const pId = item.productId?._id || item.productId;
      const barcode = item.barcode;
      let pData = null;

      // Try 1: By Product ID
      if (pId) {
        try {
          const res = await productService.getProductById(pId);
          if (res?.data) {
            pData = res.data;
          } else if (res?.success && res.data) {
            pData = res.data;
          } else if (res?._id || res?.name) {
            pData = res;
          }
        } catch (e1) {
          console.warn('getProductById failed in EditModal, will try barcode:', e1?.message);
        }
      }

      // Try 2: By Barcode (if ID failed or not available)
      if (!pData && barcode) {
        try {
          const bRes = await productService.getProductByBarcode(barcode);
          if (bRes?.data) {
            pData = bRes.data;
          } else if (bRes?.success && bRes.data) {
            pData = bRes.data;
          } else if (bRes?._id || bRes?.name) {
            pData = bRes;
          }
        } catch (e2) {
          console.warn('getProductByBarcode failed in EditModal:', e2?.message);
        }
      }

      if (isMounted && pData) {
        applyData(pData, item);
      }
    };

    fetchFullProduct();

    return () => {
      isMounted = false;
    };
  }, [isOpen, item?.transactionId, item?.inventoryId, item?.productId, item?.barcode]);

  if (!isOpen || !item) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  const handleSpecChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [field]: value,
      },
    }));
    setError('');
  };

  const handleSerialChange = (id, newSn) => {
    setSerials((prev) =>
      prev.map((s) => (s.id === id ? { ...s, serialNumber: newSn } : s))
    );
    setError('');
  };

  const handleRemoveSerial = (id) => {
    const target = serials.find((s) => s.id === id);
    if (target && target.status === 'sold') {
      setError(`Serial number "${target.serialNumber}" has already been sold and cannot be removed.`);
      return;
    }
    setSerials((prev) => prev.filter((s) => s.id !== id));
    setError('');
  };

  const handleAddSerial = (e) => {
    if (e) e.preventDefault();
    if (!newSerialInput.trim()) return;

    // Support comma, space or newline delimited multi-input
    const rawTokens = newSerialInput
      .split(/[\n,]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (rawTokens.length === 0) return;

    const existingSerialsLower = new Set(serials.map((s) => s.serialNumber.toLowerCase()));
    const newItems = [];
    const duplicates = [];

    for (const token of rawTokens) {
      if (existingSerialsLower.has(token.toLowerCase())) {
        duplicates.push(token);
      } else {
        existingSerialsLower.add(token.toLowerCase());
        newItems.push({
          id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          serialNumber: token,
          originalSerialNumber: '',
          status: 'available',
        });
      }
    }

    if (duplicates.length > 0) {
      setError(`Serial number(s) already in list: ${duplicates.join(', ')}`);
    } else {
      setError('');
    }

    if (newItems.length > 0) {
      setSerials((prev) => [...prev, ...newItems]);
      setNewSerialInput('');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.name.trim()) {
      setError('Product Name is required.');
      return;
    }

    if (!formData.barcode.trim()) {
      setError('Barcode is required.');
      return;
    }

    const buyPrice = Number(formData.purchasePrice);
    if (isNaN(buyPrice) || buyPrice < 0) {
      setError('Please enter a valid non-negative purchase price.');
      return;
    }

    let finalQuantity = parseInt(formData.quantity, 10);

    if (isSerialized) {
      if (serials.length === 0) {
        setError('At least one serial number is required for serialized products.');
        return;
      }

      // Check for empty or duplicates in serial numbers
      const seen = new Set();
      for (const s of serials) {
        const trimmed = s.serialNumber.trim();
        if (!trimmed) {
          setError('Serial numbers cannot be blank.');
          return;
        }
        if (seen.has(trimmed.toLowerCase())) {
          setError(`Duplicate serial number "${trimmed}" detected in the list.`);
          return;
        }
        seen.add(trimmed.toLowerCase());
      }

      finalQuantity = serials.length;
    } else {
      if (isNaN(finalQuantity) || finalQuantity <= 0) {
        setError('Quantity must be at least 1.');
        return;
      }
    }

    // Format specifications
    const formattedSpecs = { ...formData.specifications };
    if (typeof formattedSpecs.features === 'string') {
      formattedSpecs.features = formattedSpecs.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
    }
    if (typeof formattedSpecs.connectivity === 'string') {
      formattedSpecs.connectivity = formattedSpecs.connectivity
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    }

    const payload = {
      name: formData.name.trim(),
      barcode: formData.barcode.trim(),
      category: formData.category.trim(),
      brand: formData.brand.trim(),
      modelNumber: formData.modelNumber.trim(),
      hsnCode: formData.hsnCode.trim(),
      description: formData.description.trim(),
      specifications: formattedSpecs,
      purchasePrice: buyPrice,
      quantity: finalQuantity,
      ...(isSerialized
        ? {
            serialNumbers: serials.map((s) => ({
              serialNumber: s.serialNumber.trim(),
              originalSerialNumber: (s.originalSerialNumber || s.serialNumber).trim(),
              status: s.status,
            })),
          }
        : {}),
    };

    setLoading(true);
    try {
      const intakeId = item.transactionId || item.inventoryId;
      const res = await productService.updateMonthlyIntake(intakeId, payload);

      if (res?.success) {
        setSuccessMsg('Inventory intake & product specifications updated successfully!');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(res?.message || 'Failed to update inventory intake record.');
      }
    } catch (err) {
      console.error('Update intake error:', err);
      setError(
        err.response?.data?.message || err.message || 'An error occurred while updating the intake record.'
      );
    } finally {
      setLoading(false);
    }
  };

  const calculatedTotal = (
    (isSerialized ? serials.length : Number(formData.quantity || 0)) *
    Number(formData.purchasePrice || 0)
  ).toFixed(2);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white shadow-2xl flex flex-col transition-all duration-200 ${
          isFullscreen
            ? 'w-screen h-screen rounded-none'
            : 'w-full max-w-5xl max-h-[92vh] rounded-3xl border border-slate-200 m-4'
        }`}
      >
        {/* Full-Page Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Edit Inventory Intake Record & Specs
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Full Editor
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {item.branchName || 'Branch'} • Added on{' '}
                {new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer hidden sm:flex items-center gap-1 text-xs font-semibold"
              title={isFullscreen ? 'Window Mode' : 'Full Page Mode'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="text-[11px]">Normal</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-[11px]">Full Page</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary py-2 px-4 text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Save Changes</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Close Editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection Filter */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              All Sections
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BASIC')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'BASIC'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              Product & Cost
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SPECS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SPECS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              Technical Specifications
            </button>
            {isSerialized && (
              <button
                type="button"
                onClick={() => setActiveTab('SERIALS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'SERIALS'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                Serials ({serials.length})
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500 hidden md:block">
            Barcode: <span className="font-mono text-slate-800 font-bold">{formData.barcode || '—'}</span>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 font-semibold shadow-xs animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Product Specifications & Catalog Master */}
          {(activeTab === 'ALL' || activeTab === 'BASIC') && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>Product Master Details & Description</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Core Identifiers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g. Samsung Galaxy S24 Ultra 5G"
                    className="input-tactile text-xs py-2 w-full font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Barcode <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => handleInputChange('barcode', e.target.value)}
                      placeholder="Barcode string"
                      className="input-tactile text-xs pl-9 py-2 w-full font-mono font-bold text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      placeholder="e.g. Mobile, Electronics"
                      className="input-tactile text-xs pl-9 py-2 w-full font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="e.g. Samsung, Apple, Sony"
                    className="input-tactile text-xs py-2 w-full font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Model Number
                  </label>
                  <input
                    type="text"
                    value={formData.modelNumber}
                    onChange={(e) => handleInputChange('modelNumber', e.target.value)}
                    placeholder="e.g. SM-S928B"
                    className="input-tactile text-xs py-2 w-full font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    HSN Code
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.hsnCode}
                      onChange={(e) => handleInputChange('hsnCode', e.target.value)}
                      placeholder="e.g. 85171300"
                      className="input-tactile text-xs pl-9 py-2 w-full font-mono"
                    />
                  </div>
                </div>

                {/* Description Textarea */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Product Description & Notes</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Provide a comprehensive product description, highlights, box contents or notes..."
                    className="input-tactile text-xs py-2 w-full font-medium resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Technical Specifications */}
          {(activeTab === 'ALL' || activeTab === 'SPECS') && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Technical Specifications & Hardware Parameters</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Specs Master</span>
              </div>

              {/* Memory & Power Grid */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Memory, Hardware & Display</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      RAM
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12GB LPDDR5X"
                      value={formData.specifications.ram}
                      onChange={(e) => handleSpecChange('ram', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Internal Storage
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 256GB / 512GB"
                      value={formData.specifications.storage}
                      onChange={(e) => handleSpecChange('storage', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Color / Finish
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Titanium Gray"
                      value={formData.specifications.color}
                      onChange={(e) => handleSpecChange('color', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Processor / Chipset
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Snapdragon 8 Gen 3"
                      value={formData.specifications.processor}
                      onChange={(e) => handleSpecChange('processor', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Operating System
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Android 14, One UI 6"
                      value={formData.specifications.operatingSystem}
                      onChange={(e) => handleSpecChange('operatingSystem', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Display Size
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6.8 inch Dynamic AMOLED"
                      value={formData.specifications.displaySize}
                      onChange={(e) => handleSpecChange('displaySize', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Display Resolution
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3120 x 1440 (QHD+)"
                      value={formData.specifications.resolution}
                      onChange={(e) => handleSpecChange('resolution', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Battery Capacity
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5000 mAh 45W"
                      value={formData.specifications.batteryCapacity}
                      onChange={(e) => handleSpecChange('batteryCapacity', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>
                </div>

                {/* Camera, Audio, Dimensions */}
                <div className="pt-2 border-t border-slate-100 text-xs font-bold text-indigo-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Camera, Audio, Warranty & Dimensions</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Camera Specs
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 200MP + 50MP + 12MP"
                      value={formData.specifications.camera}
                      onChange={(e) => handleSpecChange('camera', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Audio / Speaker
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stereo Speakers, Dolby Atmos"
                      value={formData.specifications.speaker}
                      onChange={(e) => handleSpecChange('speaker', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Warranty
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Year Brand Warranty"
                      value={formData.specifications.warranty}
                      onChange={(e) => handleSpecChange('warranty', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Toll-Free / Support No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1800-40-7267864"
                      value={formData.specifications.tollFreeNumber}
                      onChange={(e) => handleSpecChange('tollFreeNumber', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Dimensions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 162.3 x 79.0 x 8.6 mm"
                      value={formData.specifications.dimensions}
                      onChange={(e) => handleSpecChange('dimensions', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Weight
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 232 g"
                      value={formData.specifications.weight}
                      onChange={(e) => handleSpecChange('weight', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Power Consumption / Voltage
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 45W / 220-240V"
                      value={formData.specifications.powerConsumption}
                      onChange={(e) => handleSpecChange('powerConsumption', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Connectivity (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="5G, Wi-Fi 7, Bluetooth 5.3, NFC"
                      value={formData.specifications.connectivity}
                      onChange={(e) => handleSpecChange('connectivity', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-4">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Key Highlights / Features (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. S-Pen Included, IP68 Water Resistant, Armor Aluminum Frame"
                      value={formData.specifications.features}
                      onChange={(e) => handleSpecChange('features', e.target.value)}
                      className="input-tactile text-xs py-2 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Branch Inventory & Transaction Quantities */}
          {(activeTab === 'ALL' || activeTab === 'BASIC') && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900">
                  <Boxes className="w-4 h-4 text-indigo-600" />
                  <span>Branch Inventory & Intake Transaction Stock</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {isSerialized ? 'Serialized Tracking Batch' : 'Standard Stock Batch'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Buy Cost / Unit (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                      className="input-tactile text-xs pl-9 py-2.5 w-full font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Units Added / Quantity <span className="text-rose-500">*</span>
                  </label>
                  {isSerialized ? (
                    <div className="flex items-center gap-2.5 bg-indigo-50/70 border border-indigo-200 px-3.5 py-2.5 rounded-xl">
                      <span className="text-sm font-mono font-black text-indigo-900">
                        {serials.length} Units
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold">
                        (Auto-synced with Serials)
                      </span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', e.target.value)}
                      className="input-tactile text-xs py-2.5 w-full font-mono font-bold"
                      required
                    />
                  )}
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Total Intake Valuation
                  </span>
                  <span className="text-base font-mono font-extrabold text-emerald-950 block mt-0.5">
                    ₹{Number(calculatedTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Serial Numbers Breakdown (If Serialized) */}
          {isSerialized && (activeTab === 'ALL' || activeTab === 'SERIALS') && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Serialized Units Manager ({serials.length} Tracked Units)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Sold serial numbers are locked
                  </span>
                </div>
              </div>

              {/* Add Serial Quick Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSerialInput}
                  onChange={(e) => setNewSerialInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSerial();
                    }
                  }}
                  placeholder="Type or paste serial number(s) (comma or newline separated)..."
                  className="input-tactile text-xs py-2.5 flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddSerial}
                  className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Serial</span>
                </button>
              </div>

              {/* Serials List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {serials.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-xs text-slate-400 font-semibold">
                    No serial numbers added yet. Add at least one serial number.
                  </div>
                ) : (
                  serials.map((s, idx) => {
                    const isSold = s.status === 'sold';

                    return (
                      <div
                        key={s.id}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 text-xs transition-colors ${
                          isSold
                            ? 'bg-rose-50/70 border-rose-200'
                            : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                            #{idx + 1}
                          </span>

                          {isSold ? (
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="font-mono font-bold text-slate-700 line-through truncate">
                                {s.serialNumber}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded shrink-0">
                                <Lock className="w-2.5 h-2.5" />
                                <span>SOLD</span>
                              </span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={s.serialNumber}
                              onChange={(e) => handleSerialChange(s.id, e.target.value)}
                              className="input-tactile py-1 px-2 text-xs font-mono font-semibold flex-1"
                              placeholder="Serial Number"
                              required
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider ${
                              isSold
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isSold ? 'SOLD' : 'AVAILABLE'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveSerial(s.id)}
                            disabled={isSold}
                            className={`p-1 rounded-lg transition-colors ${
                              isSold
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            }`}
                            title={isSold ? 'Sold units cannot be removed' : 'Remove serial unit'}
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
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500">
              Total Units: <span className="font-mono font-black text-slate-900">{isSerialized ? serials.length : formData.quantity}</span> | Valuation: <span className="font-mono font-black text-emerald-700">₹{Number(calculatedTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary py-2 px-5 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary py-2.5 px-6 text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Intake & Product Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
