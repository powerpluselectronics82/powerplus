import React, { useState, useEffect } from 'react';
import { X, Plus, Package, Tag, Percent, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { productService } from '../../services/productService';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  optimisticAddCatalogProduct,
  fetchCategories,
  fetchBrands,
} from '../../redux/slices/productsSlice';

export const AddProductModal = ({ isOpen, onClose, onRefresh }) => {
  const dispatch = useAppDispatch();
  const { categories: reduxCategories, brands: reduxBrands } = useAppSelector((state) => state.products);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSpecs, setShowSpecs] = useState(false);

  const [formData, setFormData] = useState({
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
      features: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (reduxCategories && reduxCategories.length > 0) {
        setCategories(reduxCategories);
      } else {
        dispatch(fetchCategories());
      }

      if (reduxBrands && reduxBrands.length > 0) {
        setBrands(reduxBrands);
      } else {
        dispatch(fetchBrands());
      }
    }
  }, [isOpen, reduxCategories, reduxBrands, dispatch]);

  if (!isOpen) return null;

  const handleSpecChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const specs = { ...formData.specifications };
    if (specs.features && typeof specs.features === 'string') {
      specs.features = specs.features.split(',').map((f) => f.trim()).filter(Boolean);
    }

    const payload = {
      barcode: formData.barcode,
      modelNumber: formData.modelNumber,
      hsnCode: formData.hsnCode,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      brand: formData.brand,
      isSerialized: formData.isSerialized,
      cgstRate: Number(formData.cgstRate),
      sgstRate: Number(formData.sgstRate),
      igstRate: Number(formData.igstRate),
      minStockLevel: Number(formData.minStockLevel),
      specifications: specs,
    };

    try {
      const res = await productService.addProduct(payload);
      if (res?.success) {
        if (res.data) {
          dispatch(optimisticAddCatalogProduct(res.data));
        }
        onRefresh && onRefresh();
        onClose();
      } else {
        setError(res?.message || 'Failed to add global product');
      }
    } catch (err) {
      setError(err.message || 'Error adding product catalog entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        {/* Fixed Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Create Global Product Catalog Item
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Define master barcodes, GST rates, HSN codes, description, and technical specifications
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
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable Modal Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto pr-1.5 flex-1">
          {/* Row 1: Barcode & Product Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Barcode / SKU Tag *
              </label>
              <input
                type="text"
                required
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="e.g. 890123456789"
                className="input-tactile font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Galaxy Smartphone S24"
                className="input-tactile"
              />
            </div>
          </div>

          {/* Row 2: Model Number & HSN Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Model Number
              </label>
              <input
                type="text"
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                placeholder="e.g. SM-S921B"
                className="input-tactile font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                HSN Code
              </label>
              <input
                type="text"
                value={formData.hsnCode}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                placeholder="e.g. 85171200"
                className="input-tactile font-mono"
              />
            </div>
          </div>

          {/* Row 3: Product Description */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Product Description
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter detailed product description, key features, or catalog notes..."
              className="input-tactile py-2 resize-none"
            />
          </div>

          {/* Row 4: Category & Brand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Category
              </label>
              {categories.length > 0 ? (
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-tactile"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Electronics"
                  className="input-tactile"
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Brand
              </label>
              {brands.length > 0 ? (
                <select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="input-tactile"
                >
                  <option value="">-- Select Brand --</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Samsung"
                  className="input-tactile"
                />
              )}
            </div>
          </div>

          {/* Row 5: GST Tax Rates & Min Stock */}
          <div className="grid grid-cols-4 gap-2 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
            <div>
              <label className="block font-bold text-indigo-900 uppercase mb-1">
                CGST % *
              </label>
              <input
                type="number"
                required
                value={formData.cgstRate}
                onChange={(e) => setFormData({ ...formData, cgstRate: e.target.value })}
                className="input-tactile font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-indigo-900 uppercase mb-1">
                SGST % *
              </label>
              <input
                type="number"
                required
                value={formData.sgstRate}
                onChange={(e) => setFormData({ ...formData, sgstRate: e.target.value })}
                className="input-tactile font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-indigo-900 uppercase mb-1">
                IGST %
              </label>
              <input
                type="number"
                value={formData.igstRate}
                onChange={(e) => setFormData({ ...formData, igstRate: e.target.value })}
                className="input-tactile font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-indigo-900 uppercase mb-1">
                Min Stock
              </label>
              <input
                type="number"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                className="input-tactile font-mono"
              />
            </div>
          </div>

          {/* Serialized Checkbox */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              type="checkbox"
              id="isSerialized"
              checked={formData.isSerialized}
              onChange={(e) => setFormData({ ...formData, isSerialized: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="isSerialized" className="font-bold text-slate-800 cursor-pointer">
              Is Serialized Product (Each unit has a unique serial number)
            </label>
          </div>

          {/* Technical Specifications Accordion Header */}
          <div className="border-t border-slate-200 pt-2">
            <button
              type="button"
              onClick={() => setShowSpecs(!showSpecs)}
              className="flex items-center justify-between w-full py-2 text-xs font-extrabold text-indigo-600 hover:text-indigo-800"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Technical Specifications (RAM, Storage, Processor, Color, etc.)
              </span>
              {showSpecs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSpecs && (
              <div className="space-y-3 pt-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 mt-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">RAM</label>
                    <input
                      type="text"
                      placeholder="e.g. 8GB"
                      value={formData.specifications.ram}
                      onChange={(e) => handleSpecChange('ram', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Storage</label>
                    <input
                      type="text"
                      placeholder="e.g. 256GB"
                      value={formData.specifications.storage}
                      onChange={(e) => handleSpecChange('storage', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Color</label>
                    <input
                      type="text"
                      placeholder="e.g. Phantom Black"
                      value={formData.specifications.color}
                      onChange={(e) => handleSpecChange('color', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Processor</label>
                    <input
                      type="text"
                      placeholder="e.g. Snapdragon Gen 3"
                      value={formData.specifications.processor}
                      onChange={(e) => handleSpecChange('processor', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Operating System</label>
                    <input
                      type="text"
                      placeholder="e.g. Android 14"
                      value={formData.specifications.operatingSystem}
                      onChange={(e) => handleSpecChange('operatingSystem', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Warranty</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Year Manufacturer"
                      value={formData.specifications.warranty}
                      onChange={(e) => handleSpecChange('warranty', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Toll-Free / Support No.</label>
                    <input
                      type="text"
                      placeholder="e.g. 1800-123-4567"
                      value={formData.specifications.tollFreeNumber}
                      onChange={(e) => handleSpecChange('tollFreeNumber', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Display Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 6.7 inch OLED"
                      value={formData.specifications.displaySize}
                      onChange={(e) => handleSpecChange('displaySize', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Battery Capacity</label>
                    <input
                      type="text"
                      placeholder="e.g. 5000 mAh"
                      value={formData.specifications.batteryCapacity}
                      onChange={(e) => handleSpecChange('batteryCapacity', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Camera</label>
                    <input
                      type="text"
                      placeholder="e.g. 50MP + 12MP"
                      value={formData.specifications.camera}
                      onChange={(e) => handleSpecChange('camera', e.target.value)}
                      className="input-tactile py-1 px-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">Features (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="5G, NFC, Wireless Charging, IP68"
                    value={formData.specifications.features}
                    onChange={(e) => handleSpecChange('features', e.target.value)}
                    className="input-tactile py-1 px-2"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm font-bold shadow-md shadow-indigo-500/20"
          >
            {loading ? 'Saving Catalog Item...' : 'Save Global Product Entry'}
          </button>
        </form>
      </div>
    </div>
  );
};
