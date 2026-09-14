import React, { useState, useEffect } from 'react';
import { X, Plus, Tag, Shield, Trash2, Edit2, CheckCircle, Search, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { categoryService } from '../../services/categoryService';
import { brandService } from '../../services/brandService';

export const CategoryBrandModal = ({ isOpen, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('category'); // 'category' | 'brand'
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [catRes, brandRes] = await Promise.all([
        categoryService.getCategories(),
        brandService.getBrands(),
      ]);

      if (catRes?.success) setCategories(catRes.data || []);
      else if (Array.isArray(catRes)) setCategories(catRes);

      if (brandRes?.success) setBrands(brandRes.data || []);
      else if (Array.isArray(brandRes)) setBrands(brandRes);
    } catch (err) {
      console.error('Failed to load categories/brands:', err);
      setError('Failed to fetch catalog master data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setEditingId(null);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formName.trim()) {
      setError('Name is required');
      return;
    }

    setSaveLoading(true);

    try {
      if (activeTab === 'category') {
        if (editingId) {
          await categoryService.updateCategory(editingId, { name: formName, description: formDesc });
          setSuccessMsg('Category updated successfully');
        } else {
          await categoryService.createCategory({ name: formName, description: formDesc });
          setSuccessMsg('Category created successfully');
        }
      } else {
        if (editingId) {
          await brandService.updateBrand(editingId, { name: formName, description: formDesc });
          setSuccessMsg('Brand updated successfully');
        } else {
          await brandService.createBrand({ name: formName, description: formDesc });
          setSuccessMsg('Brand created successfully');
        }
      }

      resetForm();
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Operation failed');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormName(item.name || '');
    setFormDesc(item.description || '');
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${activeTab}?`)) return;
    setError('');
    try {
      if (activeTab === 'category') {
        await categoryService.deleteCategory(id);
        setSuccessMsg('Category deleted successfully');
      } else {
        await brandService.deleteBrand(id);
        setSuccessMsg('Brand deleted successfully');
      }
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Delete failed');
    }
  };

  if (!isOpen) return null;

  const currentList = activeTab === 'category' ? categories : brands;
  const filteredList = currentList.filter((item) => {
    if (!item) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = String(item.name || '').toLowerCase();
    const desc = String(item.description || '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide">
                Categories & Brands Master
              </h3>
              <p className="text-xs text-slate-400">
                Manage system product classifications and manufacturer brands
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3 shrink-0">
          <div className="flex bg-slate-200/80 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab('category');
                resetForm();
              }}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'category'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" /> Categories ({categories.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('brand');
                resetForm();
              }}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'brand'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Brands ({brands.length})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}s...`}
              className="input-tactile text-xs px-3 py-1.5 bg-white"
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Card */}
          <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                {editingId ? `Edit ${activeTab}` : `Create New ${activeTab}`}
              </h4>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  {activeTab === 'category' ? 'Category Name' : 'Brand Name'} *
                </label>
                <input
                  type="text"
                  placeholder={`e.g. ${activeTab === 'category' ? 'Electronics, Groceries' : 'Samsung, Apple'}`}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-tactile text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Short description or notes"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="input-tactile text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saveLoading}
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                {saveLoading
                  ? 'Saving...'
                  : editingId
                  ? `Update ${activeTab}`
                  : `Save ${activeTab}`}
              </button>
            </div>
          </form>

          {/* Directory Master Table */}
          <div className="tactile-card overflow-hidden border border-slate-200/80">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                Loading {activeTab} master list...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="tactile-table text-xs">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-slate-400 font-medium">
                          No {activeTab}s found. {search ? 'Try a different search query.' : 'Use the form above to create your first entry.'}
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="font-extrabold text-slate-900">{item.name}</td>
                          <td className="text-slate-600">{item.description || '—'}</td>
                          <td>
                            <span className="badge badge-indigo">
                              {item.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                                title="Edit Entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item._id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="btn-secondary py-2 px-5 text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
