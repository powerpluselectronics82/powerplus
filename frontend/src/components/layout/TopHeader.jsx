import React from 'react';
import { GitBranch, LogOut, User, Shield, PhoneCall } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

export const TopHeader = () => {
  const { user, logout, role, setOtpUser } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId, currentBranch } = useBranch();

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Branch Selector / Display */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
          <GitBranch className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
            Active Branch
          </span>
          {role === 'OWNER' ? (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 text-sm focus:outline-none cursor-pointer hover:text-indigo-600 transition-colors"
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          ) : (
            <span className="font-bold text-slate-800 text-sm">
              {currentBranch ? `${currentBranch.name} (${currentBranch.code})` : 'All Branches'}
            </span>
          )}
        </div>
      </div>

      {/* User Actions & Profile */}
      <div className="flex items-center gap-4">


        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block">
            <h4 className="font-bold text-slate-800 text-sm leading-tight">
              {user?.name || 'Manager'}
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              {user?.email || 'user@system.com'}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Logout"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
