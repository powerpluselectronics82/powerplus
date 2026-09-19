import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  GitBranch,
  Users,
  Truck,
  BarChart3,
  Boxes,
  Activity,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import companyLogo from '../../assets/logo.jpeg';

export const DynamicSidebar = () => {
  const { role } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['OWNER', 'BRANCH_MANAGER', 'CASHIER', 'INVENTORY_STAFF'],
    },
    {
      label: 'POS Terminal',
      path: '/pos',
      icon: ShoppingCart,
      roles: ['OWNER', 'BRANCH_MANAGER', 'CASHIER'],
    },
    {
      label: 'Due Payments',
      path: '/due-payments',
      icon: Wallet,
      roles: ['OWNER', 'BRANCH_MANAGER', 'CASHIER'],
    },
    {
      label: 'Products & Inventory',
      path: '/products',
      icon: Package,
      roles: ['OWNER', 'BRANCH_MANAGER', 'INVENTORY_STAFF', 'CASHIER'],
    },
    {
      label: 'Branches',
      path: '/branches',
      icon: GitBranch,
      roles: ['OWNER'],
    },
    {
      label: 'Staff Management',
      path: '/staff',
      icon: Users,
      roles: ['OWNER', 'BRANCH_MANAGER'],
    },
    {
      label: 'Suppliers',
      path: '/suppliers',
      icon: Truck,
      roles: ['OWNER', 'BRANCH_MANAGER', 'INVENTORY_STAFF'],
    },
    {
      label: 'Purchase Logs',
      path: '/purchases',
      icon: Boxes,
      roles: ['OWNER', 'BRANCH_MANAGER', 'INVENTORY_STAFF'],
    },
    {
      label: 'Sales & Analytics',
      path: '/analytics',
      icon: BarChart3,
      roles: ['OWNER', 'BRANCH_MANAGER'],
    },
    {
      label: 'Audit & System Health',
      path: '/audit-logs',
      icon: Activity,
      roles: ['OWNER'],
    },
  ];

  // Case-insensitive role matching with fallback to all items if no role specified or match list is empty
  const normalizedRole = role ? role.toUpperCase() : null;

  let filteredNav = navItems.filter(
    (item) => !normalizedRole || item.roles.includes(normalizedRole)
  );

  // Fallback: If role filtering results in zero items, show all nav items
  if (filteredNav.length === 0) {
    filteredNav = navItems;
  }

  return (
    <aside className="w-64 bg-white/90 backdrop-blur-xl border-r border-slate-200/80 flex flex-col justify-between p-4 h-screen sticky top-0 shadow-sm z-30 shrink-0 select-none">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 px-3 py-3 mb-4 border-b border-slate-100 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center overflow-hidden border border-slate-700 shadow-md shrink-0">
            <img src={companyLogo} alt="POWER PLUS ELECTRONICS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-sm leading-tight tracking-tight uppercase">
              POWER PLUS
            </h1>
            <p className="text-[9px] font-black text-orange-600 uppercase tracking-wider">
              ELECTRONICS
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 overflow-y-auto flex-1 pr-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Role Footer Card */}
      <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl mt-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Role: <span className="text-slate-900 font-bold">{role || 'GUEST'}</span>
          </span>
        </div>
      </div>
    </aside>
  );
};
