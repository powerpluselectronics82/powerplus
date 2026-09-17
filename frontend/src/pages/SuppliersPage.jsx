import React, { useState, useEffect } from 'react';
import { supplierService } from '../services/supplierService';
import { useAuth } from '../context/AuthContext';
import { Truck, Plus, Phone, Mail, FileText, X, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchSuppliers, addSupplierToStore } from '../redux/slices/suppliersSlice';

export const SuppliersPage = () => {
  const dispatch = useAppDispatch();
  const { companyId } = useAuth();
  const { suppliers, loading } = useAppSelector((state) => state.suppliers);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    gstin: '',
    phoneNumbers: [''],
    email: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const loadSuppliers = (force = false) => {
    dispatch(fetchSuppliers({ force }));
  };

  useEffect(() => {
    loadSuppliers();
  }, [dispatch]);

  const handlePhoneChange = (index, value) => {
    const updated = [...form.phoneNumbers];
    updated[index] = value;
    setForm({ ...form, phoneNumbers: updated });
  };

  const addPhoneField = () => {
    setForm({ ...form, phoneNumbers: [...form.phoneNumbers, ''] });
  };

  const removePhoneField = (index) => {
    if (form.phoneNumbers.length === 1) return;
    setForm({
      ...form,
      phoneNumbers: form.phoneNumbers.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    const cleanPhones = form.phoneNumbers.map((p) => p.trim()).filter(Boolean);
    if (cleanPhones.length === 0) {
      setError('Please provide at least one contact phone number.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await supplierService.addSupplier({
        name: form.name,
        brand: form.brand,
        gstin: form.gstin,
        phoneNumbers: cleanPhones,
        email: form.email,
        address: form.address,
        companyId,
      });
      if (res.success) {
        setIsAddModalOpen(false);
        setForm({ name: '', brand: '', gstin: '', phoneNumbers: [''], email: '', address: '' });
        if (res.data) {
          dispatch(addSupplierToStore(res.data));
        }
        loadSuppliers(true);
      } else {
        setError(res.message || 'Failed to add supplier');
      }
    } catch (err) {
      setError(err.message || 'Error adding supplier');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="tactile-card p-6 bg-white border border-slate-200 text-black flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">
              Supplier Directory
            </h2>
            <p className="text-xs text-slate-700 font-bold pt-0.5">
              Registered vendors, brand distributors, contact phone numbers, and GSTIN numbers
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="tactile-btn py-2.5 px-4 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Vendor / Supplier
        </button>
      </div>

      {/* Supplier Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-semibold text-sm">
          Loading vendor suppliers...
        </div>
      ) : suppliers.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-semibold text-sm">
          No suppliers registered yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((s) => {
            const displayPhones = (s.phoneNumbers || []).filter(Boolean);

            return (
              <div key={s._id} className="tactile-card p-5 bg-white border border-slate-200/80 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-slate-900 text-base">{s.name}</h3>
                  {s.brand && <span className="badge badge-indigo">{s.brand}</span>}
                </div>

                <div className="space-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {s.gstin && (
                    <div className="flex items-center gap-2 font-mono">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>GSTIN: {s.gstin}</span>
                    </div>
                  )}

                  {displayPhones.length > 0 && (
                    <div className="space-y-1.5">
                      {displayPhones.map((ph, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-mono text-slate-700 font-medium">{ph}</span>
                          {pIdx === 0 && displayPhones.length > 1 && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded border border-indigo-100">
                              Primary
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.email}</span>
                    </div>
                  )}

                  {s.address && (
                    <div className="text-[11px] text-slate-400 italic pt-1">
                      {s.address}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              Add New Supplier
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter distributor brand, GSTIN, and contact details
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Acme Electronics Ltd"
                  className="input-tactile"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Brand / Category Tag
                </label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="Sony / Samsung"
                  className="input-tactile"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  GSTIN Number
                </label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                  placeholder="22AAAAA0000A1Z5"
                  className="input-tactile font-mono"
                />
              </div>

              {/* Dynamic Multiple Phone Numbers */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="flex justify-between items-center">
                  <label className="block font-bold text-slate-700 uppercase">
                    Phone Numbers *
                  </label>
                  <button
                    type="button"
                    onClick={addPhoneField}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100"
                  >
                    <Plus className="w-3 h-3" /> Add Phone Number
                  </button>
                </div>

                {form.phoneNumbers.map((ph, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required={idx === 0}
                      value={ph}
                      onChange={(e) => handlePhoneChange(idx, e.target.value)}
                      placeholder={idx === 0 ? "Primary Contact No. *" : `Secondary Contact #${idx + 1}`}
                      className="input-tactile font-mono flex-1 text-xs"
                    />
                    {form.phoneNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhoneField(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Remove phone number"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@acme.com"
                  className="input-tactile"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Address
                </label>
                <textarea
                  rows="2"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Vendor warehouse/office address"
                  className="input-tactile"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="btn-primary w-full justify-center py-2.5 text-xs font-bold mt-2"
              >
                {formLoading ? 'Saving...' : 'Save Supplier'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
