import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { productService } from '../services/productService';
import { saleService } from '../services/saleService';
import { TaxInvoiceModal } from '../components/pos/TaxInvoiceModal';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Boxes,
  ShoppingCart,
  Users,
  GitBranch,
  DollarSign,
  ArrowUpRight,
  PlusCircle,
  ShieldAlert,
  FileText,
  Download,
  Printer,
  Eye,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchStockValuation, fetchLowStockProducts } from '../redux/slices/productsSlice';
import { fetchDailySummary, fetchMonthlySales } from '../redux/slices/salesSlice';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { role, user } = useAuth();
  const { selectedBranchId, currentBranch } = useBranch();

  // Redux Cached State
  const { stockValuation: reduxValuation, lowStockProducts: lowStock, valuationLoading, lowStockLoading } = useAppSelector((state) => state.products);
  const { dailySummary, monthlySales, dailyLoading, monthlyLoading } = useAppSelector((state) => state.sales);

  const valuation = reduxValuation || { totalValue: 0, products: [] };
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthlySearch, setMonthlySearch] = useState('');
  const loading = valuationLoading || dailyLoading;

  // Tax Invoice Modal State
  const [selectedInvoiceSale, setSelectedInvoiceSale] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Monthly Sales Ledger Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Warranty Status State
  const [warrantyData, setWarrantyData] = useState({
    summary: { totalItems: 0, expiringWithinMonthCount: 0, activeCount: 0 },
    items: [],
  });
  const [warrantyFilter, setWarrantyFilter] = useState('EXPIRING_SOON');
  const [warrantySearch, setWarrantySearch] = useState('');
  const [warrantyLoading, setWarrantyLoading] = useState(false);

  const fetchWarrantyData = async () => {
    setWarrantyLoading(true);
    try {
      const res = await saleService.getWarrantyStatus(selectedBranchId, warrantyFilter, warrantySearch);
      if (res?.success && res?.data) {
        setWarrantyData(res.data);
      }
    } catch (err) {
      console.error('Warranty status load error:', err);
    } finally {
      setWarrantyLoading(false);
    }
  };

  useEffect(() => {
    fetchWarrantyData();
  }, [selectedBranchId, warrantyFilter, warrantySearch]);

  const handleOpenInvoice = (sale) => {
    setSelectedInvoiceSale(sale);
    setIsInvoiceOpen(true);
  };

  const handleDownloadExcel = () => {
    const listToExport = filteredMonthSales;
    if (!listToExport || listToExport.length === 0) {
      alert('No sales data available to export for the selected month.');
      return;
    }

    const branchName = currentBranch ? currentBranch.name : 'All_Branches';

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    csvContent += `Monthly Sales Ledger Report - ${selectedMonth}\n`;
    csvContent += `Branch: ${branchName}, Generated On: ${new Date().toLocaleString('en-IN')}\n`;
    csvContent += `Total Sales Amount: ₹${Number(monthlySales?.totalSalesAmount || 0).toFixed(2)}, Total Invoices: ${listToExport.length}\n\n`;

    const headers = [
      'Sale Date & Time',
      'Invoice Number',
      'Customer Name',
      'Customer Phone',
      'Items Count',
      'Line Items Details',
      'Payment Method',
      'Cashier',
      'Subtotal (INR)',
      'Tax Amount (INR)',
      'Grand Total (INR)',
    ];

    csvContent += headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

    listToExport.forEach((s) => {
      const dateStr = new Date(s.createdAt).toLocaleString('en-IN');
      const invoiceNo = s.invoiceNumber || '';
      const custName = s.customerName || 'Walk-in Customer';
      const custPhone = s.customerPhone || '';
      const itemsCount = Array.isArray(s.items) ? s.items.length : 1;
      const itemDetails = Array.isArray(s.items)
        ? s.items.map((i) => `${i.productName} (x${i.unit})`).join('; ')
        : s.productName || '';
      const payMethod = s.paymentMethod || 'CASH';
      const cashier = s.cashierName || 'Cashier';
      const subtotal = Number(s.subtotal || 0).toFixed(2);
      const tax = Number(s.taxAmount || 0).toFixed(2);
      const grandTotal = Number(s.grandTotal || s.subtotal || 0).toFixed(2);

      const row = [
        dateStr,
        invoiceNo,
        custName,
        custPhone,
        itemsCount,
        itemDetails,
        payMethod,
        cashier,
        subtotal,
        tax,
        grandTotal,
      ];

      csvContent += row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Monthly_Sales_Ledger_${selectedMonth}_${branchName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintLedger = () => {
    if (!filteredMonthSales || filteredMonthSales.length === 0) {
      alert('No sales data available to print for the selected month.');
      return;
    }
    window.print();
  };

  const loadDashboardData = (force = false) => {
    const bId = selectedBranchId || currentBranch?._id;
    dispatch(fetchStockValuation({ branchId: bId, force }));
    dispatch(fetchLowStockProducts({ branchId: bId, force }));
    dispatch(fetchDailySummary({ branchId: bId, force }));
    if (bId) {
      dispatch(fetchMonthlySales({ branchId: bId, month: selectedMonth, force }));
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedBranchId, currentBranch?._id, selectedMonth, role, dispatch]);

  const monthSalesList = Array.isArray(monthlySales?.sales) ? monthlySales.sales : [];
  const filteredMonthSales = monthSalesList.filter((s) => {
    if (!s) return false;
    const q = (monthlySearch || '').toLowerCase().trim();
    if (!q) return true;
    const inv = String(s.invoiceNumber || '').toLowerCase();
    const cust = String(s.customerName || '').toLowerCase();
    const phone = String(s.customerPhone || '').toLowerCase();
    const cashier = String(s.cashierName || '').toLowerCase();
    const method = String(s.paymentMethod || '').toLowerCase();
    return (
      inv.includes(q) ||
      cust.includes(q) ||
      phone.includes(q) ||
      cashier.includes(q) ||
      method.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="tactile-card p-6 bg-white border border-slate-200 text-black shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-emerald">
                System Active
              </span>
              <span className="px-3 py-0.5 rounded-full bg-amber-400 text-black border border-amber-500 font-black text-xs shadow-sm">
                Branch: {currentBranch ? `${currentBranch.name}` : 'Company-Wide'}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-black">
              Welcome back, {user?.name || 'Manager'} 👋
            </h2>
            <p className="text-xs text-slate-700 font-bold max-w-xl pt-0.5">
              Here is your store real-time inventory stock overview, daily sales count, and quick POS actions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                navigate('/pos');
              }}
              className="tactile-btn py-2 px-4 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> New POS Billing
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Stock Valuation */}
        <div className="tactile-card p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stock Valuation
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            ₹{Number(valuation?.totalValue || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span className="text-indigo-600 font-bold">{valuation?.products?.length || 0}</span> catalog items tracked
          </p>
        </div>

        {/* Today's Sales Revenue */}
        <div className="tactile-card p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            ₹{Number(dailySummary?.totalSale || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
            Taxable: ₹{Number(dailySummary?.totalTaxableValue || 0).toFixed(2)}
          </p>
        </div>

        {/* Monthly Branch Sales Summary */}
        <div className="tactile-card p-5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Monthly Sales ({selectedMonth})
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            ₹{Number(monthlySales?.totalSalesAmount || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {monthlySales ? `${monthlySales.saleCount || 0} total invoices in ${monthlySales.month}` : 'Select a branch'}
          </p>
        </div>

        {/* Low Stock Alerts Count */}
        <div className="tactile-card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Low Stock Items
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">
            {lowStock.length}
          </div>
          <p className="text-xs text-amber-700 mt-1 font-medium">
            Requires immediate reorder
          </p>
        </div>
      </div>

      {/* DEDICATED SECTION: Monthly Branch Sales Ledger Table */}
      <div className="tactile-card p-6 bg-white space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Monthly Sales Ledger & Invoice History
              </h3>
              {selectedBranchId && monthSalesList.length > 0 && (
                <span className="badge badge-indigo font-mono text-[11px] py-0.5 px-2">
                  {filteredMonthSales.length} {filteredMonthSales.length === 1 ? 'Invoice' : 'Invoices'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Fetched directly for branch:{' '}
              <span className="font-bold text-slate-800">{currentBranch ? currentBranch.name : 'Select Branch'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Picker Input */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
              <span className="text-xs font-bold text-slate-500">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold font-mono text-slate-900 focus:outline-none"
              />
            </div>

            {/* Monthly Search Bar */}
            <input
              type="text"
              placeholder="Search by invoice #, customer..."
              value={monthlySearch}
              onChange={(e) => setMonthlySearch(e.target.value)}
              className="input-tactile text-xs py-1.5 w-full sm:w-48"
            />

            {/* Action Buttons: View, Print & Download Excel */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLedgerModalOpen(true)}
                title="View Full Ledger Summary Modal"
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>See Summary</span>
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Sales Table (Scrollable Section) */}
        {!selectedBranchId ? (
          <div className="p-8 text-center text-slate-400 font-semibold text-xs bg-slate-50 rounded-2xl border border-slate-100">
            Please select a specific branch from the header to view monthly sales invoices.
          </div>
        ) : filteredMonthSales.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-semibold text-xs bg-slate-50 rounded-2xl border border-slate-100">
            No sales invoices recorded for branch during {selectedMonth}.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200/80 shadow-inner">
            <table className="tactile-table text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm shadow-sm">
                <tr>
                  <th className="bg-slate-100/95">Sale Date & Time</th>
                  <th className="bg-slate-100/95">Invoice #</th>
                  <th className="bg-slate-100/95">Customer Name</th>
                  <th className="bg-slate-100/95">Line Items</th>
                  <th className="bg-slate-100/95">Payment Mode</th>
                  <th className="bg-slate-100/95">Cashier</th>
                  <th className="text-right bg-slate-100/95">Grand Total</th>
                  <th className="text-right bg-slate-100/95">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthSales.map((sale) => (
                  <tr
                    key={sale._id}
                    onClick={() => handleOpenInvoice(sale)}
                    className="cursor-pointer hover:bg-indigo-50/60 transition-colors"
                  >
                    <td className="font-mono text-slate-500">
                      {new Date(sale.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="font-mono font-bold text-indigo-600">
                      {sale.invoiceNumber}
                    </td>
                    <td>
                      <div>
                        <span className="font-bold text-slate-900 block">{sale.customerName}</span>
                        {sale.customerPhone && (
                          <span className="text-[10px] text-slate-400 font-mono">{sale.customerPhone}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800">
                          {Array.isArray(sale.items) ? `${sale.items.length} Items` : '1 Item'}
                        </span>
                        <div className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">
                          {Array.isArray(sale.items)
                            ? sale.items.map((i) => `${i.productName} (x${i.unit})`).join(', ')
                            : sale.productName}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${sale.paymentMethod === 'CASH'
                          ? 'badge-emerald'
                          : sale.paymentMethod === 'UPI'
                            ? 'badge-indigo'
                            : 'badge-amber'
                          }`}
                      >
                        {sale.paymentMethod || 'CASH'}
                      </span>
                    </td>
                    <td className="font-medium text-slate-700">
                      {sale.cashierName || 'Cashier'}
                    </td>
                    <td className="text-right font-mono font-bold text-slate-900 text-sm">
                      ₹{Number(sale.grandTotal || sale.subtotal || 0).toFixed(2)}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInvoice(sale);
                        }}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DEDICATED SECTION: Product Warranty Expiration Tracker */}
      <div className="tactile-card p-6 bg-white space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldAlert className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Product Warranty Expiration & Status Tracker
              </h3>
              {warrantyData.summary?.expiringWithinMonthCount > 0 && (
                <span className="badge badge-amber font-mono text-[11px] py-0.5 px-2">
                  {warrantyData.summary.expiringWithinMonthCount} Expiring Soon
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Individual product sales with active warranties or warranties expiring within 1 month.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              placeholder="Search invoice, customer, product, serial..."
              value={warrantySearch}
              onChange={(e) => setWarrantySearch(e.target.value)}
              className="input-tactile text-xs py-1.5 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Category Summary Pills / Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setWarrantyFilter('EXPIRING_SOON')}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
              warrantyFilter === 'EXPIRING_SOON'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80'
            }`}
          >
            <span>⚠️ Expiring in 1 Month</span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-900/20 text-[10px] font-mono">
              {warrantyData.summary?.expiringWithinMonthCount || 0}
            </span>
          </button>

          <button
            onClick={() => setWarrantyFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
              warrantyFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'
            }`}
          >
            <span>✅ Active Warranty</span>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-900/20 text-[10px] font-mono">
              {warrantyData.summary?.activeCount || 0}
            </span>
          </button>
        </div>

        {/* Warranty Items Table */}
        {warrantyLoading ? (
          <div className="p-8 text-center text-slate-400 font-semibold text-xs bg-slate-50 rounded-2xl border border-slate-100">
            Loading warranty data...
          </div>
        ) : !warrantyData.items || warrantyData.items.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-semibold text-xs bg-slate-50 rounded-2xl border border-slate-100">
            No product sales match the selected warranty criteria.
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200/80 shadow-inner">
            <table className="tactile-table text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm shadow-sm">
                <tr>
                  <th className="bg-slate-100/95">Customer Info</th>
                  <th className="bg-slate-100/95">Invoice & Sale Date</th>
                  <th className="bg-slate-100/95">Product Details</th>
                  <th className="bg-slate-100/95">Toll-Free No.</th>
                  <th className="bg-slate-100/95">Warranty Term</th>
                  <th className="bg-slate-100/95">Expiry Date</th>
                  <th className="bg-slate-100/95 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {warrantyData.items.map((item, idx) => (
                  <tr key={`${item.saleId}-${item.productId}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td>
                      <span className="font-bold text-slate-900 block">{item.customerName}</span>
                      {item.customerPhone && (
                        <span className="text-[10px] text-slate-400 font-mono">{item.customerPhone}</span>
                      )}
                    </td>
                    <td>
                      <span className="font-mono font-bold text-indigo-600 block">{item.invoiceNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.saleDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td>
                      <span className="font-bold text-slate-800 block">{item.productName}</span>
                      <div className="text-[10px] text-slate-500 font-mono space-x-2">
                        {item.modelNumber && <span>Model: {item.modelNumber}</span>}
                        {item.serialNumber && <span>SN: {item.serialNumber}</span>}
                      </div>
                    </td>
                    <td className="font-mono text-emerald-700 font-bold text-xs">
                      {item.tollFreeNumber ? `📞 ${item.tollFreeNumber}` : 'N/A'}
                    </td>
                    <td>
                      <span className="badge badge-purple font-semibold">
                        {item.warranty}
                      </span>
                    </td>
                    <td className="font-mono text-slate-700 font-semibold">
                      {item.expiryDate
                        ? new Date(item.expiryDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </td>
                    <td className="text-right">
                      {item.status === 'EXPIRING_SOON' && (
                        <span className="badge bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                          ⚠️ Expiring in {item.daysRemaining} days
                        </span>
                      )}
                      {item.status === 'ACTIVE' && (
                        <span className="badge badge-emerald font-bold">
                          ✅ Active ({item.daysRemaining} days left)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Content Split: Low Stock Alerts & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Warning Table (2 Cols) */}
        <div className="lg:col-span-2 tactile-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Low Stock Alert Monitor
              </h3>
            </div>
            <Link to="/products" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              View Catalog <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-sm font-semibold text-slate-500">
                🎉 All products have healthy stock levels above minimum thresholds.
              </p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200/80 shadow-inner">
              <table className="tactile-table">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm shadow-sm">
                  <tr>
                    <th className="bg-slate-100/95">Product Name</th>
                    <th className="bg-slate-100/95">Barcode</th>
                    <th className="bg-slate-100/95">Available Stock</th>
                    <th className="bg-slate-100/95">Min Level</th>
                    <th className="bg-slate-100/95">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((prod, index) => {
                    const currentStock = prod.stock ?? prod.availableStock ?? prod.Stock ?? prod.quantity ?? 0;
                    return (
                      <tr key={`${prod._id || prod.barcode || 'low'}_${index}`}>
                        <td className="font-bold text-slate-900">{prod.name}</td>
                        <td className="font-mono text-xs text-slate-500">{prod.barcode}</td>
                        <td>
                          <span className="badge badge-amber font-mono font-bold">
                            {currentStock} units
                          </span>
                        </td>
                        <td className="font-mono text-slate-600">{prod.minStockLevel || 0}</td>
                        <td>
                          <Link
                            to="/products"
                            className="px-3 py-1 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-lg hover:bg-indigo-100 inline-block"
                          >
                            Restock
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions & Navigation Cards */}
        <div className="space-y-4">
          <div className="tactile-card p-6">
            <h3 className="font-extrabold text-slate-900 text-base mb-4">
              Quick Operations
            </h3>

            <div className="space-y-3">
              <Link
                to="/pos"
                className="w-full flex items-center justify-between p-3.5 bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-900 rounded-xl font-bold text-sm transition-all border border-indigo-100"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  <span>Open Cashier POS</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-indigo-500" />
              </Link>

              <Link
                to="/products"
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-sm transition-all border border-slate-200/80"
              >
                <div className="flex items-center gap-3">
                  <PlusCircle className="w-5 h-5 text-slate-600" />
                  <span>Receive Stock / Product</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>

              {role === 'OWNER' && (
                <Link
                  to="/branches"
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-sm transition-all border border-slate-200/80"
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-5 h-5 text-slate-600" />
                    <span>Manage Company Branches</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </Link>
              )}

              {(role === 'OWNER' || role === 'BRANCH_MANAGER') && (
                <Link
                  to="/staff"
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-sm transition-all border border-slate-200/80"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-slate-600" />
                    <span>Staff Directory</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tax Invoice Modal Component */}
      <TaxInvoiceModal
        sale={selectedInvoiceSale}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        branch={currentBranch}
        onPaymentUpdated={() => loadDashboardData(true)}
      />

      {/* Monthly Sales Summary Modal */}
      {isLedgerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    Monthly Sales Ledger & Invoice Summary
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Month: <span className="font-bold text-slate-800">{selectedMonth}</span> | Branch:{' '}
                    <span className="font-bold text-slate-800">{currentBranch?.name || 'Company-Wide'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLedgerModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Metric Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <span className="text-xs font-bold text-indigo-600 uppercase">Total Monthly Sales</span>
                  <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                    ₹{Number(monthlySales?.totalSalesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-indigo-500 font-medium">
                    {filteredMonthSales.length} invoice records
                  </span>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <span className="text-xs font-bold text-emerald-600 uppercase">Cash Collection</span>
                  <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                    ₹{filteredMonthSales
                      .filter((s) => s.paymentMethod === 'CASH')
                      .reduce((sum, s) => sum + Number(s.grandTotal || s.subtotal || 0), 0)
                      .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    {filteredMonthSales.filter((s) => s.paymentMethod === 'CASH').length} cash transactions
                  </span>
                </div>

                <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-xl">
                  <span className="text-xs font-bold text-purple-600 uppercase">UPI / Card Sales</span>
                  <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                    ₹{filteredMonthSales
                      .filter((s) => s.paymentMethod !== 'CASH')
                      .reduce((sum, s) => sum + Number(s.grandTotal || s.subtotal || 0), 0)
                      .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-purple-600 font-medium">
                    {filteredMonthSales.filter((s) => s.paymentMethod !== 'CASH').length} digital transactions
                  </span>
                </div>
              </div>

              {/* Full Invoices Detailed Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">Monthly Invoices Breakdown</h4>
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {filteredMonthSales.length} items
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="tactile-table text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100">
                      <tr>
                        <th>Date</th>
                        <th>Invoice #</th>
                        <th>Customer</th>
                        <th>Payment Mode</th>
                        <th>Cashier</th>
                        <th className="text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMonthSales.map((sale) => (
                        <tr key={sale._id} onClick={() => handleOpenInvoice(sale)} className="cursor-pointer hover:bg-slate-50">
                          <td className="font-mono text-slate-500">
                            {new Date(sale.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="font-mono font-bold text-indigo-600">{sale.invoiceNumber}</td>
                          <td className="font-medium text-slate-900">{sale.customerName || 'Walk-in'}</td>
                          <td>
                            <span className="badge badge-indigo text-[10px]">{sale.paymentMethod || 'CASH'}</span>
                          </td>
                          <td className="text-slate-600">{sale.cashierName || 'Cashier'}</td>
                          <td className="text-right font-mono font-bold text-slate-900">
                            ₹{Number(sale.grandTotal || sale.subtotal || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setIsLedgerModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition-all"
              >
                Close
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintLedger}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel (.csv)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Area for Monthly Sales Ledger (Used when window.print() is called) */}
      <div id="monthly-sales-print-area" className="hidden print:block p-4 bg-white text-black font-sans w-full">
        <div className="border-b-2 border-black pb-3 mb-3 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider">{currentBranch?.name || 'Inventory Store'}</h1>
            <p className="text-xs text-gray-600 mt-0.5">{currentBranch?.address || 'Official Sales Ledger Report'}</p>
            <h2 className="text-sm font-bold text-indigo-900 mt-1">
              Monthly Sales Ledger Report - {selectedMonth}
            </h2>
          </div>
          <div className="text-right text-xs">
            <p><strong>Generated On:</strong> {new Date().toLocaleString('en-IN')}</p>
            <p><strong>Branch:</strong> {currentBranch?.name || 'All Branches'}</p>
            <p><strong>Total Sales:</strong> ₹{Number(monthlySales?.totalSalesAmount || 0).toFixed(2)}</p>
            <p><strong>Total Invoices:</strong> {filteredMonthSales.length}</p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse border border-gray-300">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="p-2 border-r border-gray-300 font-bold">Date & Time</th>
              <th className="p-2 border-r border-gray-300 font-bold">Invoice #</th>
              <th className="p-2 border-r border-gray-300 font-bold">Customer Name</th>
              <th className="p-2 border-r border-gray-300 font-bold">Phone</th>
              <th className="p-2 border-r border-gray-300 font-bold">Payment</th>
              <th className="p-2 border-r border-gray-300 font-bold">Cashier</th>
              <th className="p-2 font-bold text-right">Grand Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredMonthSales.map((sale, idx) => (
              <tr key={sale._id || idx} className="border-b border-gray-200">
                <td className="p-2 border-r border-gray-200">
                  {new Date(sale.createdAt).toLocaleString('en-IN')}
                </td>
                <td className="p-2 border-r border-gray-200 font-mono font-bold">{sale.invoiceNumber}</td>
                <td className="p-2 border-r border-gray-200">{sale.customerName || 'Walk-in'}</td>
                <td className="p-2 border-r border-gray-200 font-mono">{sale.customerPhone || '-'}</td>
                <td className="p-2 border-r border-gray-200">{sale.paymentMethod || 'CASH'}</td>
                <td className="p-2 border-r border-gray-200">{sale.cashierName || 'Cashier'}</td>
                <td className="p-2 text-right font-mono font-bold">
                  ₹{Number(sale.grandTotal || sale.subtotal || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 pt-3 border-t border-gray-300 flex justify-between text-xs text-gray-500">
          <p>Report end • {filteredMonthSales.length} records printed</p>
          <p>Signature / Verified By: ___________________________</p>
        </div>
      </div>
    </div>
  );
};
