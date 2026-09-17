import React, { useState, useEffect } from 'react';
import { branchService } from '../services/branchService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { GitBranch, Plus, UserCheck, Phone, MapPin, X, Building2, AlertTriangle, RefreshCw, Mail, Clock, CreditCard, Trash2 } from 'lucide-react';

const renderSafeString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (Array.isArray(val)) {
    if (val.length === 0) return fallback;
    return val
      .map((item) => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'object') {
          return item.number || item.address || item.name || JSON.stringify(item);
        }
        return String(item);
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof val === 'object') {
    const parts = [val.street, val.city, val.state, val.zipCode].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    return val.name || val.title || val.address || JSON.stringify(val);
  }
  return String(val);
};

import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchBranches, addBranchToStore, updateBranchInStore } from '../redux/slices/branchesSlice';

export const BranchesPage = () => {
  const dispatch = useAppDispatch();
  const { role, companyId } = useAuth();
  const { branches, loading } = useAppSelector((state) => state.branches);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for Add Branch
  const [addForm, setAddForm] = useState({
    name: '',
    address: '',
    gstin: '',
    openingTime: '09:00',
    closingTime: '21:00',
    openDays: 'Mon, Tue, Wed, Thu, Fri, Sat',
    establishmentDate: '',
  });

  const [phoneList, setPhoneList] = useState([
    { number: '', type: 'PRIMARY' }
  ]);
  const [emailList, setEmailList] = useState([
    { address: '', type: 'PRIMARY' }
  ]);

  const addPhoneRow = () => {
    setPhoneList((prev) => [...prev, { number: '', type: 'SECONDARY' }]);
  };

  const removePhoneRow = (index) => {
    setPhoneList((prev) => {
      if (prev.length <= 1) return [{ number: '', type: 'PRIMARY' }];
      return prev.filter((_, i) => i !== index);
    });
  };

  const updatePhoneRow = (index, field, value) => {
    setPhoneList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addEmailRow = () => {
    setEmailList((prev) => [...prev, { address: '', type: 'SECONDARY' }]);
  };

  const removeEmailRow = (index) => {
    setEmailList((prev) => {
      if (prev.length <= 1) return [{ address: '', type: 'PRIMARY' }];
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateEmailRow = (index, field, value) => {
    setEmailList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // State for Manager Assignment
  const [assignModalBranch, setAssignModalBranch] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const loadBranches = (force = false) => {
    dispatch(fetchBranches({ force }));
  };

  useEffect(() => {
    loadBranches();
  }, [dispatch]);

  const handleAddBranchSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      const openDaysArray = typeof addForm.openDays === 'string'
        ? addForm.openDays.split(',').map((d) => d.trim()).filter(Boolean)
        : addForm.openDays;

      // Extract and format valid phones
      const formattedPhones = [];
      phoneList.forEach((p) => {
        if (!p.number) return;
        const parts = String(p.number).split(',').map((n) => n.trim()).filter(Boolean);
        parts.forEach((num, idx) => {
          formattedPhones.push({
            number: num,
            type: idx === 0 ? p.type || 'PRIMARY' : 'SECONDARY',
          });
        });
      });

      // Extract and format valid emails
      const formattedEmails = [];
      emailList.forEach((e) => {
        if (!e.address) return;
        const parts = String(e.address).split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
        parts.forEach((addr, idx) => {
          formattedEmails.push({
            address: addr,
            type: idx === 0 ? e.type || 'PRIMARY' : 'SECONDARY',
          });
        });
      });

      const res = await branchService.addBranch({
        companyId,
        name: addForm.name,
        address: addForm.address,
        phone: formattedPhones,
        email: formattedEmails,
        gstin: addForm.gstin,
        openingTime: addForm.openingTime,
        closingTime: addForm.closingTime,
        openDays: openDaysArray,
        establishmentDate: addForm.establishmentDate || undefined,
      });

      if (res.success) {
        setIsAddModalOpen(false);
        setAddForm({
          name: '',
          address: '',
          gstin: '',
          openingTime: '09:00',
          closingTime: '21:00',
          openDays: 'Mon, Tue, Wed, Thu, Fri, Sat',
          establishmentDate: '',
        });
        setPhoneList([{ number: '', type: 'PRIMARY' }]);
        setEmailList([{ address: '', type: 'PRIMARY' }]);
        loadBranches();
      }
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleStatus = async (branchId) => {
    try {
      const res = await branchService.toggleBranchStatus(branchId);
      if (res.success) loadBranches();
    } catch (err) {
      alert(err.message);
    }
  };

  const openAssignModal = async (branch) => {
    setAssignModalBranch(branch);
    setSelectedManagerId(branch.managerId || '');
    try {
      const res = await userService.getAllUsers();
      if (res?.success && Array.isArray(res.data)) {
        // Only show users whose role is BRANCH_MANAGER
        const managersOnly = res.data.filter((u) => u.role === 'BRANCH_MANAGER');
        setUsersList(managersOnly);
      } else if (Array.isArray(res)) {
        const managersOnly = res.filter((u) => u.role === 'BRANCH_MANAGER');
        setUsersList(managersOnly);
      } else {
        setUsersList([]);
      }
    } catch (err) {
      console.error(err);
      setUsersList([]);
    }
  };

  const handleAssignManagerSubmit = async (e) => {
    e.preventDefault();
    if (!selectedManagerId || !assignModalBranch) return;
    const selectedUser = Array.isArray(usersList) ? usersList.find((u) => u._id === selectedManagerId) : null;
    try {
      const res = await branchService.updateBranchManager(assignModalBranch._id, {
        managerId: selectedManagerId,
        managerName: selectedUser ? selectedUser.name : '',
      });
      if (res.success) {
        setAssignModalBranch(null);
        loadBranches();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="tactile-card p-6 bg-white border border-slate-200 text-black flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">
              Company Branch Management
            </h2>
            <p className="text-xs text-slate-700 font-bold pt-0.5">
              Create new branch locations, assign branch managers, and set active operational status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBranches}
            className="btn-secondary py-2 px-3 text-xs"
            title="Refresh Branches"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {(!role || role.toUpperCase() === 'OWNER' || role.toUpperCase() === 'BRANCH_MANAGER' || role.toUpperCase() === 'ADMIN') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="tactile-btn py-2.5 px-4 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create New Branch
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="tactile-card p-4 bg-white border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Branches</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{branches.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="tactile-card p-4 bg-white border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Active Outlets</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
              {branches.filter((b) => b.status === 'ACTIVE').length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <GitBranch className="w-5 h-5" />
          </div>
        </div>

        <div className="tactile-card p-4 bg-white border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Managers</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
              {branches.filter((b) => b.managerId).length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{renderSafeString(error)}</span>
          </div>
          <button onClick={loadBranches} className="underline hover:text-rose-900 font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Branch Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-semibold text-sm">
          Loading company branches...
        </div>
      ) : !Array.isArray(branches) || branches.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-semibold text-sm bg-white rounded-2xl border border-slate-200/80 space-y-3">
          <p>No branches found. Click "Create New Branch" to add your first branch location.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="tactile-btn py-2 px-4 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create New Branch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {branches.map((branch) => {
            const phoneStr = renderSafeString(branch.phone);
            const emailStr = renderSafeString(branch.email);
            const addressStr = renderSafeString(branch.address);
            const openDaysStr = renderSafeString(branch.openDays);

            return (
              <div
                key={branch._id || renderSafeString(branch.code)}
                className="tactile-card p-5 bg-white border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-extrabold">
                      {renderSafeString(branch.code, 'BRANCH')}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                        branch.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {renderSafeString(branch.status, 'ACTIVE')}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-lg mb-3 group-hover:text-indigo-600 transition-colors">
                    {renderSafeString(branch.name, 'Branch Store')}
                  </h3>

                  <div className="space-y-2 text-xs text-slate-600 mb-4 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                    {Boolean(addressStr) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <span className="leading-snug text-slate-800 font-medium">{addressStr}</span>
                      </div>
                    )}
                    {Array.isArray(branch.phone) && branch.phone.length > 0 ? (
                      <div className="flex items-start gap-2">
                        <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-1" />
                        <div className="flex flex-wrap gap-1">
                          {branch.phone.map((p, pIdx) => {
                            const num = typeof p === 'object' ? p.number : p;
                            const type = typeof p === 'object' ? p.type : null;
                            return (
                              <span key={pIdx} className="font-mono text-slate-800 font-bold text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                {num}
                                {type && type !== 'PRIMARY' && (
                                  <span className="text-[9px] text-indigo-600 font-bold uppercase">({type})</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : Boolean(phoneStr) ? (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-mono text-slate-800 font-bold">{phoneStr}</span>
                      </div>
                    ) : null}

                    {Array.isArray(branch.email) && branch.email.length > 0 ? (
                      <div className="flex items-start gap-2">
                        <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-1" />
                        <div className="flex flex-wrap gap-1">
                          {branch.email.map((e, eIdx) => {
                            const addr = typeof e === 'object' ? e.address : e;
                            const type = typeof e === 'object' ? e.type : null;
                            return (
                              <span key={eIdx} className="font-mono text-slate-700 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                {addr}
                                {type && type !== 'PRIMARY' && (
                                  <span className="text-[9px] text-slate-500 font-normal uppercase">({type})</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : Boolean(emailStr) ? (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-mono text-slate-700 truncate">{emailStr}</span>
                      </div>
                    ) : null}
                    {(Boolean(branch.openingTime) || Boolean(branch.closingTime)) && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-600">
                          {branch.openingTime || '09:00'} - {branch.closingTime || '21:00'}
                          {openDaysStr ? ` (${openDaysStr})` : ''}
                        </span>
                      </div>
                    )}
                    {Boolean(branch.gstin) && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-700 font-bold">GSTIN: {branch.gstin}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-extrabold text-slate-900">
                        Manager: {renderSafeString(branch.managerName, 'Unassigned')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                {role === 'OWNER' && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openAssignModal(branch)}
                      className="tactile-btn py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold border border-indigo-200"
                    >
                      Assign Manager
                    </button>
                    <button
                      onClick={() => handleToggleStatus(branch._id)}
                      className={`tactile-btn py-1.5 px-3 text-xs font-extrabold ${
                        branch.status === 'ACTIVE'
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {branch.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Branch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              Create New Branch
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter location name, multiple contacts, operating hours, and GSTIN info (Branch Code auto-generated)
            </p>

            {addError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                {renderSafeString(addError)}
              </div>
            )}

            <form onSubmit={handleAddBranchSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Downtown Store"
                  className="input-tactile"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  placeholder="e.g. 123 Main Street, Sector 15"
                  className="input-tactile"
                />
              </div>

              {/* Multiple Phone Numbers Section */}
              <div className="space-y-2.5 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Branch Phone Numbers
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addPhoneRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Phone
                  </button>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <span className="col-span-7 sm:col-span-8">Contact Number *</span>
                  <span className="col-span-4 sm:col-span-3">Phone Type</span>
                  <span className="col-span-1 text-center">Del</span>
                </div>

                <div className="space-y-2">
                  {phoneList.map((p, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7 sm:col-span-8">
                        <input
                          type="tel"
                          value={p.number}
                          onChange={(e) => updatePhoneRow(idx, 'number', e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full px-3 py-2 text-xs font-mono font-bold bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <select
                          value={p.type}
                          onChange={(e) => updatePhoneRow(idx, 'type', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                        >
                          <option value="PRIMARY">Primary</option>
                          <option value="SECONDARY">Secondary</option>
                          <option value="WHATSAPP">WhatsApp</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {phoneList.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removePhoneRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove this phone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs font-mono">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multiple Email Addresses Section */}
              <div className="space-y-2.5 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Branch Email Addresses
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addEmailRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Email
                  </button>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <span className="col-span-7 sm:col-span-8">Email Address *</span>
                  <span className="col-span-4 sm:col-span-3">Email Type</span>
                  <span className="col-span-1 text-center">Del</span>
                </div>

                <div className="space-y-2">
                  {emailList.map((e, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7 sm:col-span-8">
                        <input
                          type="email"
                          value={e.address}
                          onChange={(ev) => updateEmailRow(idx, 'address', ev.target.value)}
                          placeholder="e.g. branch@powerplus.com"
                          className="w-full px-3 py-2 text-xs font-mono bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <select
                          value={e.type}
                          onChange={(ev) => updateEmailRow(idx, 'type', ev.target.value)}
                          className="w-full px-2.5 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                        >
                          <option value="PRIMARY">Primary</option>
                          <option value="SECONDARY">Secondary</option>
                          <option value="SUPPORT">Support</option>
                          <option value="SALES">Sales</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {emailList.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeEmailRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove this email"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs font-mono">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={addForm.gstin}
                  onChange={(e) => setAddForm({ ...addForm, gstin: e.target.value })}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  className="input-tactile font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={addForm.openingTime}
                    onChange={(e) => setAddForm({ ...addForm, openingTime: e.target.value })}
                    className="input-tactile"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={addForm.closingTime}
                    onChange={(e) => setAddForm({ ...addForm, closingTime: e.target.value })}
                    className="input-tactile"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Open Days (Comma Separated)
                </label>
                <input
                  type="text"
                  value={addForm.openDays}
                  onChange={(e) => setAddForm({ ...addForm, openDays: e.target.value })}
                  placeholder="Mon, Tue, Wed, Thu, Fri, Sat"
                  className="input-tactile"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Establishment Date
                </label>
                <input
                  type="date"
                  value={addForm.establishmentDate}
                  onChange={(e) => setAddForm({ ...addForm, establishmentDate: e.target.value })}
                  className="input-tactile"
                />
              </div>

              <button
                type="submit"
                disabled={addLoading}
                className="btn-primary w-full justify-center py-2.5 text-xs font-bold mt-2"
              >
                {addLoading ? 'Creating...' : 'Save Branch'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manager Assignment Modal */}
      {assignModalBranch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 relative">
            <button
              onClick={() => setAssignModalBranch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              Assign Manager
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select staff member to manage <span className="font-bold text-slate-800">{renderSafeString(assignModalBranch.name)}</span>
            </p>

            <form onSubmit={handleAssignManagerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Select Branch Manager *
                </label>
                {usersList.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs leading-relaxed">
                    No employees with the <strong>BRANCH_MANAGER</strong> role were found. Please register an employee as a <strong>Branch Manager</strong> in the Staff section first.
                  </div>
                ) : (
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="input-tactile font-bold"
                    required
                  >
                    <option value="">-- Choose Branch Manager --</option>
                    {usersList.map((u) => (
                      <option key={u._id} value={u._id}>
                        {renderSafeString(u.name)} {u.phone ? `(${u.phone})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                disabled={usersList.length === 0}
                className="btn-primary w-full justify-center py-2.5 text-xs font-bold disabled:opacity-50"
              >
                Save Manager Assignment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
