import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { CartProvider } from './context/CartContext';

import { DynamicSidebar } from './components/layout/DynamicSidebar';
import { TopHeader } from './components/layout/TopHeader';
import { PhoneOtpModal } from './components/auth/PhoneOtpModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/PosPage';
import { ProductsPage } from './pages/ProductsPage';
import { BranchesPage } from './pages/BranchesPage';
import { StaffPage } from './pages/StaffPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <PhoneOtpModal />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <DynamicSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopHeader />
        <main className="p-6 flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pos" element={<PosPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global OTP Modal trigger */}
      <PhoneOtpModal />
    </div>
  );
};

export function App() {
  return (
    <Router>
      <AuthProvider>
        <BranchProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </BranchProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
