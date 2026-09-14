import React, { useState, useEffect } from 'react';
import { branchService } from '../services/branchService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { GitBranch, Plus, UserCheck, Phone, MapPin, X, Building2, AlertTriangle, RefreshCw, Mail, Clock, CreditCard } from 'lucide-react';

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

export const BranchesPage = () => {
  const { role, companyId } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for Add Branch
  const [addForm, setAddForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    openingTime: '09:00',
    closingTime: '21:00',
    openDays: 'Mon, Tue, Wed, Thu, Fri, Sat',
    establishmentDate: '',
  });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // State for Manager Assignment
  const [assignModalBranch, setAssignModalBranch] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const loadBranches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await branchService.getAllBranches();
      if (res?.success && Array.isArray(res.data)) {
        setBranches(res.data);
      } else if (Array.isArray(res)) {
        setBranches(res);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error('Branches load error:', err);
      setError(err.message || 'Unable to load branches. You may need Owner permissions.');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleAddBranchSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      const openDaysArray = typeof addForm.openDays === 'string'
        ? addForm.openDays.split(',').map((d) => d.trim()).filter(Boolean)
        : addForm.openDays;

      const res = await branchService.addBranch({
        companyId,
        name: addForm.name,
        address: addForm.address,
        phone: addForm.phone ? [{ number: addForm.phone, type: 'PRIMARY' }] : [],
        email: addForm.email ? [{ address: addForm.email, type: 'PRIMARY' }] : [],
        gstin: addForm.gstin,
        openingTime: addForm.openingTime,
        closingTime: addForm.closingTime,
        openDays: openDaysArray,
        establishmentDate: addForm.establishmentDate || undefined,
      });
      if (res.success) {
        setIsAddModalOpen(false);
        setAddForm({ name: '', address: '', phone: '', email: '', gstin: '', openingTime: '09:00', closingTime: '21:00', openDays: 'Mon, Tue, Wed, Thu, Fri, Sat', establishmentDate: '' });
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
    try {
      const res = await userService.getAllUsers();
      if (res?.success && Array.isArray(res.data)) {
        setUsersList(res.data);
      } else if (Array.isArray(res)) {
        setUsersList(res);
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

          {role === 'OWNER' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="tactile-btn py-2.5 px-4 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5"
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
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Managers Assigned</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
              {branches.filter((b) => Boolean(b.managerName || b.managerId)).length}
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
        <div className="p-12 text-center text-slate-400 font-semibold text-sm bg-white rounded-2xl border border-slate-200/80">
          No branches found. Click "Create New Branch" to add your first branch location.
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
                    {Boolean(phoneStr) && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-mono text-slate-800 font-bold">{phoneStr}</span>
                      </div>
                    )}
                    {Boolean(emailStr) && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-mono text-slate-700 truncate">{emailStr}</span>
                      </div>
                    )}
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
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative">
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
              Enter location name, contact details, and GSTIN info (Branch Code auto-generated)
            </p>

            {addError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                {renderSafeString(addError)}
              </div>
            )}

            <form onSubmit={handleAddBranchSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Downtown Store"
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
                  placeholder="123 Main Street"
                  className="input-tactile"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="input-tactile"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={addForm.gstin}
                    onChange={(e) => setAddForm({ ...addForm, gstin: e.target.value })}
                    placeholder="22AAAAA0000A1Z5"
                    className="input-tactile font-mono"
                  />
                </div>
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
                  Select User
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="input-tactile"
                >
                  <option value="">-- Choose User --</option>
                  {Array.isArray(usersList) && usersList.map((u) => (
                    <option key={u._id} value={u._id}>
                      {renderSafeString(u.name)} ({renderSafeString(u.role)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5 text-xs font-bold"
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
