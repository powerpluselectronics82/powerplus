import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { Users, Plus, Shield, CheckCircle, XCircle, X, Search, GitBranch, Eye, CreditCard, MapPin, Calendar, Mail, Phone, UserCheck } from 'lucide-react';

export const StaffPage = () => {
  const { role, companyId } = useAuth();
  const { selectedBranchId, branches, currentBranch } = useBranch();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('ALL'); // 'ALL' | 'BRANCH'
  const [search, setSearch] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER',
    branchId: selectedBranchId || '',
    adharNumber: '',
    dob: '',
    address: '',
  });
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      let res;
      if (viewMode === 'ALL' || (role === 'OWNER' && !selectedBranchId)) {
        res = await userService.getAllUsers();
      } else if (selectedBranchId) {
        res = await userService.getBranchUsers(selectedBranchId);
      } else {
        res = await userService.getAllUsers();
      }

      if (res?.success && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Users load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [selectedBranchId, role, viewMode]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    const payload = {
      ...regForm,
      companyId,
      branchId: regForm.branchId || selectedBranchId || branches[0]?._id,
    };

    try {
      const res = await userService.register(payload);
      if (res.success) {
        setIsRegisterModalOpen(false);
        setRegForm({ name: '', email: '', phone: '', password: '', role: 'CASHIER', branchId: '', adharNumber: '', dob: '', address: '' });
        loadUsers();
      }
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await userService.toggleUserStatus(userId);
      if (res.success) loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const getBranchName = (bId) => {
    if (!bId) return 'Company-Wide (Owner)';
    const found = branches.find((b) => b._id === bId || b._id?.toString() === bId?.toString());
    return found ? `${found.name} (${found.code})` : 'Branch Staff';
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      const parts = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
      return addr.address || addr.name || JSON.stringify(addr);
    }
    return String(addr);
  };

  const filteredUsers = users.filter((u) => {
    if (!u) return false;
    const q = (search || '').toLowerCase().trim();
    if (!q) return true;
    const name = String(u.name || '').toLowerCase();
    const email = String(u.email || '').toLowerCase();
    const phone = String(u.phone || '').toLowerCase();
    const uRole = String(u.role || '').toLowerCase();
    const adhar = String(u.adharNumber || '').toLowerCase();
    const address = formatAddress(u.address).toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      phone.includes(q) ||
      uRole.includes(q) ||
      adhar.includes(q) ||
      address.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="tactile-card p-6 bg-white border border-slate-200 text-black flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">
              Staff & Employee Directory
            </h2>
            <p className="text-xs text-slate-700 font-bold pt-0.5">
              Manage system permissions, register cashier/inventory accounts, and toggle active status
            </p>
          </div>
        </div>

        {role === 'OWNER' && (
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="tactile-btn py-2.5 px-4 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Register New Staff Member
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="tactile-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setViewMode('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'ALL'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            All Company Users ({users.length})
          </button>
          {selectedBranchId && (
            <button
              onClick={() => setViewMode('BRANCH')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'BRANCH'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Current Branch ({currentBranch?.code || 'Branch'})
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff name, email, role..."
            className="input-tactile text-xs pl-9"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="tactile-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-semibold text-sm">
            Loading user directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-semibold text-sm">
            No registered staff members found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tactile-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Contact Email</th>
                  <th>Phone Number</th>
                  <th>Aadhaar Number</th>
                  <th>Address</th>
                  <th>Assigned Role</th>
                  <th>Assigned Branch</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="font-bold text-slate-900">{u.name}</td>
                    <td className="font-mono text-xs text-slate-600">{u.email}</td>
                    <td className="font-mono text-xs text-slate-600">{u.phone}</td>
                    <td className="font-mono text-xs text-slate-700 font-semibold">{u.adharNumber || '—'}</td>
                    <td className="text-xs text-slate-600 max-w-xs truncate" title={formatAddress(u.address)}>{formatAddress(u.address) || '—'}</td>
                    <td>
                      <span
                        className={`badge ${u.role === 'OWNER'
                            ? 'badge-indigo'
                            : u.role === 'BRANCH_MANAGER'
                              ? 'badge-emerald'
                              : 'badge-amber'
                          }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {getBranchName(u.branchId)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${u.status === 'ACTIVE' ? 'badge-emerald' : 'badge-rose'
                          }`}
                      >
                        {u.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-lg hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                          title="View Full Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
                        {role === 'OWNER' && (
                          <button
                            onClick={() => handleToggleStatus(u._id)}
                            className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Staff Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsRegisterModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              Register New Employee
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter details and assign branch & system role
            </p>

            {regError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  placeholder="John Doe"
                  className="input-tactile"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="john@company.com"
                  className="input-tactile"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Phone Number (For OTP Verification) *
                </label>
                <input
                  type="text"
                  required
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="+919876543210"
                  className="input-tactile font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="input-tactile"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={regForm.adharNumber}
                    onChange={(e) => setRegForm({ ...regForm, adharNumber: e.target.value })}
                    placeholder="1234 5678 9012"
                    className="input-tactile font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={regForm.dob}
                    onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                    className="input-tactile"
                  />
                </div>
              </div>



              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={regForm.address}
                  onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                  placeholder="123 Staff Colony, City"
                  className="input-tactile"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    System Role *
                  </label>
                  <select
                    value={regForm.role}
                    onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                    className="input-tactile font-bold"
                  >
                    <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                    <option value="CASHIER">CASHIER</option>
                    <option value="INVENTORY_STAFF">INVENTORY_STAFF</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Assigned Branch
                  </label>
                  <select
                    value={regForm.branchId}
                    onChange={(e) => setRegForm({ ...regForm, branchId: e.target.value })}
                    className="input-tactile"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="btn-primary w-full justify-center py-2.5 text-xs font-bold mt-2"
              >
                {regLoading ? 'Registering...' : 'Register Employee'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* View Employee Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center border border-indigo-200">
                {selectedUser.name?.[0]?.toUpperCase() || 'E'}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {selectedUser.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge badge-indigo">{selectedUser.role}</span>
                  <span className={`badge ${selectedUser.status === 'ACTIVE' ? 'badge-emerald' : 'badge-rose'}`}>
                    {selectedUser.status || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5 text-[10px]">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Aadhaar Card Number
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {selectedUser.adharNumber || 'Not Provided'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5 text-[10px]">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Date of Birth
                  </span>
                  <p className="font-semibold text-slate-900">
                    {selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : 'Not Provided'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5 text-[10px]">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Residential Address
                </span>
                <p className="font-medium text-slate-800 leading-relaxed">
                  {formatAddress(selectedUser.address) || 'Not Provided'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5 text-[10px]">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Address
                  </span>
                  <p className="font-mono text-slate-900 font-semibold truncate" title={selectedUser.email}>
                    {selectedUser.email || '—'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5 text-[10px]">
                    <Phone className="w-3.5 h-3.5 text-indigo-500" /> Phone Number
                  </span>
                  <p className="font-mono text-slate-900 font-semibold">
                    {selectedUser.phone || '—'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5 text-[10px]">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-500" /> Assigned Branch
                </span>
                <p className="font-semibold text-slate-900">
                  {getBranchName(selectedUser.branchId)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="btn-primary py-2 px-5 text-xs font-bold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
