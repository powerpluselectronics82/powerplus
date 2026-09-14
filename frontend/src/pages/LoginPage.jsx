import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, Zap, UserCheck, AlertCircle } from 'lucide-react';
import companyLogo from '../assets/logo.jpeg';

export const LoginPage = () => {
  const { login, loginAsDemo, loading, setOtpUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (!res.success) {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blur Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Header Logo */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-black mx-auto mb-3 flex items-center justify-center overflow-hidden border border-slate-700 shadow-xl">
            <img src={companyLogo} alt="POWER PLUS ELECTRONICS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase">
            POWER PLUS ELECTRONICS
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Multi-Branch Enterprise POS & Inventory System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Employee Login
          </h2>
          <p className="text-xs text-slate-500 font-medium mb-6">
            Enter your credentials to access the operational dashboard
          </p>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Authentication Failed</span>
              </div>
              <p className="text-[11px] text-rose-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="input-tactile pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-tactile pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm font-bold mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Server'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold tracking-widest">
                Or Instant Demo Access
              </span>
            </div>
          </div>

          {/* Instant 1-Click Role Logins */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'OWNER', label: 'Owner Admin', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200' },
              { role: 'BRANCH_MANAGER', label: 'Branch Manager', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' },
              { role: 'CASHIER', label: 'Cashier POS', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' },
              { role: 'INVENTORY_STAFF', label: 'Inventory Staff', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' },
            ].map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => loginAsDemo(d.role)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${d.color}`}
              >
                <span>{d.label}</span>
                <Zap className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
