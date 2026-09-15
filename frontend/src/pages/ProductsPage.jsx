import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { productService } from '../services/productService';
import { AddProductModal } from '../components/inventory/AddProductModal';
import { AddStockModal } from '../components/inventory/AddStockModal';
import { CategoryBrandModal } from '../components/inventory/CategoryBrandModal';
import { MonthlyInventoryReportModal } from '../components/inventory/MonthlyInventoryReportModal';
import {
  Package,
  Plus,
  Search,
  Tag,
  RefreshCw,
  DollarSign,
  Boxes,
  Eye,
  Calendar,
  Printer,
  FileText,
  TrendingUp,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export const ProductsPage = () => {
  const { role } = useAuth();
  const { selectedBranchId, currentBranch } = useBranch();

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [products, setProducts] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('ALL'); // ALL | MONTHLY_REPORT | LOW_STOCK | ARCHIVED
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isCatBrandModalOpen, setIsCatBrandModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);

  // Monthly Report tab states
  const [reportMonth, setReportMonth] = useState(currentMonthStr);
  const [monthlyReportData, setMonthlyReportData] = useState(null);
  const [monthlyReportLoading, setMonthlyReportLoading] = useState(false);
  const [expandedSerials, setExpandedSerials] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      let branchProducts = [];
      let globalProducts = [];

      if (selectedBranchId) {
        try {
          const res = await productService.getBranchProducts(selectedBranchId);
          if (res?.success && Array.isArray(res.data)) {
            branchProducts = res.data;
          }
        } catch (err) {
          console.warn('Branch inventory load note:', err.message);
        }
      }

      try {
        const globalRes = await productService.getAllProducts();
        if (globalRes?.success && Array.isArray(globalRes.data)) {
          globalProducts = globalRes.data;
        }
      } catch (err) {
        console.warn('Global products load note:', err.message);
      }

      if (selectedBranchId && branchProducts.length > 0) {
        setProducts(branchProducts);
      } else if (globalProducts.length > 0) {
        setProducts(globalProducts);
      } else if (branchProducts.length > 0) {
        setProducts(branchProducts);
      } else {
        setProducts([]);
      }

      // Stock valuation
      let valRes;
      if (role === 'OWNER' && !selectedBranchId) {
        valRes = await productService.getAllStockValuation();
      } else if (selectedBranchId) {
        valRes = await productService.getBranchStockValuation(selectedBranchId);
      }
      if (valRes?.success) {
        setValuation(valRes.data);
      }
    } catch (err) {
      console.error('Products load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async (targetMonth) => {
    setMonthlyReportLoading(true);
    try {
      const res = await productService.getMonthlyInventoryReport(selectedBranchId || '', targetMonth);
      if (res?.success) {
        setMonthlyReportData(res.data);
      } else {
        setMonthlyReportData(null);
      }
    } catch (err) {
      console.error('Load monthly inventory report error:', err);
      setMonthlyReportData(null);
    } finally {
      setMonthlyReportLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId, role]);

  useEffect(() => {
    if (tab === 'MONTHLY_REPORT') {
      loadMonthlyReport(reportMonth);
    }
  }, [tab, reportMonth, selectedBranchId]);

  const handleToggleStatus = async (productOrId) => {
    const productId = typeof productOrId === 'object'
      ? productOrId._id || productOrId.productId?._id || productOrId.productId
      : productOrId;

    if (!productId) {
      alert('Product ID is missing');
      return;
    }

    try {
      const res = await productService.toggleProductStatus(productId);
      if (res.success) {
        loadData();
      } else {
        alert(res.message || 'Failed to update product status');
      }
    } catch (err) {
      alert(err.message || 'Failed to update product status');
    }
  };

  const toggleSerialExpand = (inventoryId) => {
    setExpandedSerials((prev) => ({
      ...prev,
      [inventoryId]: !prev[inventoryId],
    }));
  };

  // Tab count calculations
  const allActiveCount = products.filter((p) => (p?.status || 'ACTIVE') !== 'ARCHIVED').length;
  const lowStockCount = products.filter((p) => {
    const stock = p?.availableStock ?? p?.stock ?? p?.Stock ?? 0;
    return (p?.status || 'ACTIVE') !== 'ARCHIVED' && stock <= (p?.minStockLevel || 5);
  }).length;
  const archivedCount = products.filter((p) => p?.status === 'ARCHIVED').length;
  const monthlyIntakeCount = monthlyReportData?.items?.length || 0;

  const filteredProducts = products.filter((p) => {
    if (!p) return false;
    const stock = p.availableStock ?? p.stock ?? p.Stock ?? 0;
    const productStatus = p.status || 'ACTIVE';

    const q = (search || '').toLowerCase().trim();
    const name = String(p.name || '').toLowerCase();
    const barcode = String(p.barcode || '').toLowerCase();
    const category = String(p.category || '').toLowerCase();
    const brand = String(p.brand || '').toLowerCase();

    const matchesSearch =
      !q ||
      name.includes(q) ||
      barcode.includes(q) ||
      category.includes(q) ||
      brand.includes(q);

    if (!matchesSearch) return false;

    if (tab === 'LOW_STOCK') {
      return productStatus !== 'ARCHIVED' && stock <= (p.minStockLevel || 5);
    }
    if (tab === 'ARCHIVED') {
      return productStatus === 'ARCHIVED';
    }
    return productStatus !== 'ARCHIVED';
  });

  const filteredMonthlyItems = (monthlyReportData?.items || []).filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchesGeneral =
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.barcode || '').toLowerCase().includes(q) ||
      String(item.category || '').toLowerCase().includes(q) ||
      String(item.brand || '').toLowerCase().includes(q) ||
      String(item.modelNumber || '').toLowerCase().includes(q) ||
      String(item.hsnCode || '').toLowerCase().includes(q);

    const matchesSerial = (item.serialNumbers || []).some((s) =>
      String(s.serialNumber || '').toLowerCase().includes(q)
    );

    return matchesGeneral || matchesSerial;
  });

  const handlePrintMonthlyReport = () => {
    if (!monthlyReportData) return;

    const printableItems = filteredMonthlyItems;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report.');
      return;
    }

    const monthFormatted = new Date(`${reportMonth}-01`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Branch Inventory Intake Report - ${monthFormatted}</title>
          <style>
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 0; margin: 0; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 16px; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 22px; font-weight: 900; color: #1e1b4b; margin: 0; letter-spacing: -0.5px; }
            .subtitle { font-size: 12px; color: #475569; margin-top: 4px; font-weight: 500; }
            .badge { display: inline-block; padding: 4px 10px; background-color: #e0e7ff; color: #3730a3; font-weight: 700; font-size: 11px; border-radius: 6px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
            .stat-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
            .stat-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .stat-value { font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
            th { background-color: #0f172a; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            tr.item-row:nth-child(4n+1) { background-color: #ffffff; }
            tr.item-row:nth-child(4n+3) { background-color: #f8fafc; }
            .num { text-align: right; font-family: monospace; }
            .serials-box { margin-top: 6px; padding: 8px 10px; background-color: #f1f5f9; border-left: 3px solid #6366f1; border-radius: 4px; font-size: 10.5px; }
            .serials-title { font-weight: 800; color: #312e81; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; }
            .serial-tag { display: inline-block; background-color: #ffffff; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; margin: 2px 4px 2px 0; font-family: monospace; font-weight: 700; color: #1e1b4b; }
            .serial-date { font-size: 9px; color: #64748b; font-weight: normal; margin-left: 4px; }
            .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Monthly Branch Inventory Intake Report</h1>
              <div class="subtitle">
                Branch: <strong>${currentBranch ? currentBranch.name : 'All Company Branches'}</strong> | Period: <strong>${monthFormatted}</strong>
              </div>
            </div>
            <div>
              <span class="badge">Generated on ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-title">Total Intake Batches</div>
              <div class="stat-value">${monthlyReportData.totalBatches}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Total Units Added</div>
              <div class="stat-value">${monthlyReportData.totalUnitsAdded.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Total Purchase Valuation</div>
              <div class="stat-value">₹${monthlyReportData.totalIntakeCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Total Expected Selling</div>
              <div class="stat-value">₹${monthlyReportData.totalSellingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Added Date & Time</th>
                <th>Branch</th>
                <th>Product Specs (Name, Category, Brand, HSN)</th>
                <th>Barcode</th>
                <th class="num">Units Added</th>
                <th class="num">Buy Cost / Unit</th>
                <th class="num">Total Buy Cost</th>
                <th class="num">MRP</th>
                <th class="num">Selling Price</th>
                <th class="num">Total Selling Value</th>
              </tr>
            </thead>
            <tbody>
              ${printableItems.map((item, idx) => `
                <tr class="item-row">
                  <td>${idx + 1}</td>
                  <td style="font-family: monospace; color: #4338ca; font-weight: 700;">
                    ${new Date(item.createdAt).toLocaleDateString('en-IN')}<br/>
                    <span style="font-size: 9px; color: #64748b;">${new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td><strong>${item.branchName || 'Main Branch'}</strong></td>
                  <td>
                    <strong style="color: #0f172a; font-size: 12px;">${item.name}</strong><br/>
                    <span style="color: #475569; font-size: 10px;">
                      Cat: <strong>${item.category || 'General'}</strong>
                      ${item.brand ? ` | Brand: <strong>${item.brand}</strong>` : ''}
                      ${item.modelNumber ? ` | Model: <strong>${item.modelNumber}</strong>` : ''}
                      ${item.hsnCode ? ` | HSN: <strong>${item.hsnCode}</strong>` : ''}
                    </span>
                    ${item.isSerialized && (item.serialNumbers || []).length > 0 ? `
                      <div class="serials-box">
                        <div class="serials-title">Added Serial Numbers (${item.serialNumbers.length}):</div>
                        <div>
                          ${item.serialNumbers.map(s => `
                            <span class="serial-tag">
                              ${s.serialNumber}
                              <span class="serial-date">(${new Date(s.addedAt).toLocaleDateString('en-IN')})</span>
                            </span>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                  </td>
                  <td style="font-family: monospace; font-weight: 700;">${item.barcode}</td>
                  <td class="num" style="font-weight: 800; color: #047857;">+${item.stockAdded}</td>
                  <td class="num">₹${Number(item.purchasePrice || 0).toFixed(2)}</td>
                  <td class="num" style="font-weight: 800;">₹${Number(item.totalPurchaseValue || 0).toFixed(2)}</td>
                  <td class="num">₹${Number(item.mrp || 0).toFixed(2)}</td>
                  <td class="num" style="color: #4338ca;">₹${Number(item.sellingPrice || 0).toFixed(2)}</td>
                  <td class="num" style="font-weight: 800; color: #4338ca;">₹${Number(item.totalSellingValue || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #e0e7ff; font-weight: bold; font-size: 11px;">
                <td colspan="5">MONTHLY TOTAL SUMMARY (${printableItems.length} Intake Records)</td>
                <td class="num" style="color: #047857;">${printableItems.reduce((acc, i) => acc + i.stockAdded, 0)}</td>
                <td></td>
                <td class="num">₹${printableItems.reduce((acc, i) => acc + i.totalPurchaseValue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td></td>
                <td></td>
                <td class="num" style="color: #3730a3;">₹${printableItems.reduce((acc, i) => acc + i.totalSellingValue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <div>Official Inventory Intake & Stock Audit Report</div>
            <div>Inventory Management System</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="tactile-card p-6 bg-white border border-slate-200 text-black flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-black">
                Inventory Product Catalog
              </h2>
              <p className="text-xs text-slate-700 font-bold pt-1 flex flex-wrap items-center gap-2">
                <span className="text-black">Showing stock items for:</span>
                <span className="px-3 py-0.5 rounded-full bg-amber-400 text-black border border-amber-500 font-black shadow-sm tracking-wide text-xs">
                  {currentBranch ? currentBranch.name : 'All Company Branches'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              loadData();
              if (tab === 'MONTHLY_REPORT') loadMonthlyReport(reportMonth);
            }}
            className="btn-secondary py-2 px-3 text-xs"
            title="Refresh Catalog & Reports"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setTab('MONTHLY_REPORT');
              setIsReportModalOpen(true);
            }}
            className="btn-secondary py-2.5 px-3.5 text-xs font-bold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 flex items-center gap-1.5 shadow-sm"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            Monthly Intake Report
          </button>

          {(role === 'OWNER' || role === 'BRANCH_MANAGER') && (
            <button
              onClick={() => setIsCatBrandModalOpen(true)}
              className="btn-secondary py-2.5 px-3.5 text-xs font-bold"
            >
              <Tag className="w-4 h-4 text-indigo-600" /> Categories & Brands
            </button>
          )}

          {(role === 'OWNER' || role === 'BRANCH_MANAGER' || role === 'INVENTORY_STAFF') && (
            <>
              <button
                onClick={() => setIsAddStockModalOpen(true)}
                className="btn-secondary py-2.5 px-3.5 text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <Boxes className="w-4 h-4" />
                Receive Stock Intake
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="btn-primary py-2.5 px-4 text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                New Global Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stock Valuation Summary Widget */}
      {valuation && (
        <div className="tactile-card p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest block">
                Total Stock Valuation
              </span>
              <div className="text-2xl font-extrabold font-mono mt-0.5 text-black">
                ₹{Number(valuation.totalValue || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-indigo-200">
            <span className="font-bold block text-black">
              {products.length} Products Tracked
            </span>
            <span>Evaluated at purchase cost</span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="tactile-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl w-full sm:w-auto gap-1">
          {[
            { id: 'ALL', label: 'All Catalog', count: allActiveCount },
            { id: 'MONTHLY_REPORT', label: 'Monthly Added Inventory Report', count: monthlyIntakeCount, icon: FileText },
            { id: 'LOW_STOCK', label: 'Low Stock Alerts', count: lowStockCount },
            { id: 'ARCHIVED', label: 'Archived', count: archivedCount },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  tab === t.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-indigo-600" />}
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    tab === t.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalog, barcode, category..."
            className="input-tactile text-xs pl-9"
          />
        </div>
      </div>

      {/* RENDER TAB 1: DEDICATED MONTHLY INVENTORY INTAKE REPORT SECTION */}
      {tab === 'MONTHLY_REPORT' ? (
        <div className="tactile-card p-6 space-y-5 bg-white">
          {/* Monthly Report Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Monthly Inventory Intake Report</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Clean inventory report of stock added during the month without generic status columns.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <label htmlFor="products-page-month-picker" className="text-xs font-bold text-slate-600">Select Month:</label>
                <input
                  id="products-page-month-picker"
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="text-xs font-bold font-mono text-slate-900 border-none outline-none focus:ring-0 bg-transparent"
                />
              </div>

              {reportMonth !== currentMonthStr && (
                <button
                  onClick={() => setReportMonth(currentMonthStr)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline transition-colors"
                >
                  Current Month
                </button>
              )}

              <button
                onClick={handlePrintMonthlyReport}
                disabled={!monthlyReportData || filteredMonthlyItems.length === 0}
                className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Print Monthly Report</span>
              </button>
            </div>
          </div>

          {/* Report Summary Cards */}
          {monthlyReportData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Intake Batches</span>
                  <span className="text-lg font-extrabold font-mono text-slate-900">{monthlyReportData.totalBatches}</span>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider block">Units Added</span>
                  <span className="text-lg font-extrabold font-mono text-slate-900">{monthlyReportData.totalUnitsAdded.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-700/80 uppercase tracking-wider block">Purchase Valuation</span>
                  <span className="text-base font-extrabold font-mono text-slate-900">₹{monthlyReportData.totalIntakeCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-br from-sky-50 to-white rounded-2xl border border-sky-100 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-sky-600/80 uppercase tracking-wider block">Expected Selling</span>
                  <span className="text-base font-extrabold font-mono text-indigo-700">₹{monthlyReportData.totalSellingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Report Data Table (NO TYPE, NO STATUS, NO ACTION COLUMNS) */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            {monthlyReportLoading ? (
              <div className="p-12 text-center text-slate-400 font-semibold text-sm flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span>Loading monthly inventory intake report...</span>
              </div>
            ) : !monthlyReportData || filteredMonthlyItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-semibold text-sm">
                No inventory intake records found for {reportMonth}.
              </div>
            ) : (
              <table className="tactile-table">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th>Intake Day & Time</th>
                    <th>Branch</th>
                    <th>Product Specs & Serial Numbers</th>
                    <th>Barcode</th>
                    <th>Units Added</th>
                    <th>Buy Price (Cost)</th>
                    <th>Total Purchase Cost</th>
                    <th>Selling Price</th>
                    <th>Total Selling Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonthlyItems.map((item) => {
                    const isExpanded = expandedSerials[item.inventoryId];
                    const hasSerials = item.isSerialized && (item.serialNumbers || []).length > 0;

                    return (
                      <React.Fragment key={item.inventoryId}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="font-mono text-xs font-bold text-indigo-700">
                            <div>{new Date(item.createdAt).toLocaleDateString('en-IN')}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="text-xs font-semibold text-slate-700">
                            {item.branchName}
                          </td>
                          <td>
                            <div>
                              <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{item.name}</span>
                                {hasSerials && (
                                  <button
                                    onClick={() => toggleSerialExpand(item.inventoryId)}
                                    className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                  >
                                    <Layers className="w-3 h-3" />
                                    <span>{item.serialNumbers.length} Serials</span>
                                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {item.category || 'General'} {item.brand && `• Brand: ${item.brand}`} {item.modelNumber && `• Model: ${item.modelNumber}`} {item.hsnCode && `• HSN: ${item.hsnCode}`}
                              </div>
                            </div>
                          </td>
                          <td className="font-mono text-xs font-semibold text-slate-600">
                            {item.barcode}
                          </td>
                          <td className="font-mono text-xs font-bold">
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                              +{item.stockAdded}
                            </span>
                          </td>
                          <td className="font-mono text-xs text-slate-700 font-medium">
                            ₹{Number(item.purchasePrice || 0).toFixed(2)}
                          </td>
                          <td className="font-mono text-xs font-extrabold text-slate-900">
                            ₹{Number(item.totalPurchaseValue || 0).toFixed(2)}
                          </td>
                          <td className="font-mono text-xs text-indigo-600 font-medium">
                            ₹{Number(item.sellingPrice || 0).toFixed(2)}
                          </td>
                          <td className="font-mono text-xs font-extrabold text-indigo-700">
                            ₹{Number(item.totalSellingValue || 0).toFixed(2)}
                          </td>
                        </tr>

                        {/* Serial Numbers Breakdown Sub-Row */}
                        {hasSerials && (isExpanded || search.trim().length > 0) && (
                          <tr className="bg-indigo-50/40">
                            <td colSpan="9" className="p-3 pl-10">
                              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-indigo-900 border-b border-indigo-50 pb-1.5">
                                  <span className="uppercase tracking-wider text-[10px] text-indigo-600">
                                    Serialized Product Intake Breakdown ({item.serialNumbers.length} Serial Units Added)
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {item.serialNumbers.map((s, idx) => (
                                    <div key={s.unitId || idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs font-mono">
                                      <div>
                                        <span className="font-bold text-slate-900 block">{s.serialNumber}</span>
                                        <span className="text-[10px] text-slate-400 font-normal">
                                          Added: {new Date(s.addedAt).toLocaleDateString('en-IN')} {new Date(s.addedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${s.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                                        {s.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* RENDER STANDARD CATALOG DATA TABLE (FOR ALL, LOW_STOCK, ARCHIVED) */
        <div className="tactile-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-semibold text-sm">
              Loading product inventory...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-semibold text-sm">
              No products found matching tab filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tactile-table">
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th>Barcode Tag</th>
                    <th>Buy Price</th>
                    <th>Selling / MRP</th>
                    <th>Available Stock</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, index) => {
                    const stock = p.availableStock ?? p.stock ?? p.Stock ?? 0;
                    const buyPrice = p.purchasePrice ?? 0;
                    const mrp = Number(p.mrp || 0);
                    const discountVal = Number(p.discountValue || 0);
                    const discountAmount = p.discountType === 'percentage'
                      ? (mrp * discountVal) / 100
                      : discountVal;
                    const calculatedSellingPrice = discountAmount > 0
                      ? Math.max(0, mrp - discountAmount)
                      : Number(p.sellingPrice ?? mrp);

                    const isLow = stock <= (p.minStockLevel || 5);

                    return (
                      <tr key={`${p._id || p.barcode || 'prod'}_${index}`}>
                        <td>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {p.category || 'General'} {p.brand && `• ${p.brand}`} {p.modelNumber && `• Model: ${p.modelNumber}`}
                            </span>
                          </div>
                        </td>
                        <td className="font-mono text-xs font-semibold text-slate-600">
                          {p.barcode}
                        </td>
                        <td className="font-mono text-slate-700 font-bold">
                          ₹{Number(buyPrice).toFixed(2)}
                        </td>
                        <td className="font-mono font-bold text-indigo-600">
                          <div className="flex flex-col">
                            <span>₹{calculatedSellingPrice.toFixed(2)}</span>
                            {mrp > calculatedSellingPrice && (
                              <span className="text-[10px] text-slate-400 line-through font-normal">
                                MRP ₹{mrp}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge font-mono font-bold ${
                              isLow ? 'badge-amber' : 'badge-emerald'
                            }`}
                          >
                            {stock} units
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${p.isSerialized ? 'badge-indigo' : 'badge-indigo'}`}>
                            {p.isSerialized ? 'Serialized' : 'Standard'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              (p.status || 'ACTIVE') === 'ARCHIVED' ? 'badge-rose' : 'badge-emerald'
                            }`}
                          >
                            {p.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedProductDetails(p)}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-lg hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                              title="View Full Product & Inventory Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Details
                            </button>
                            {(role === 'OWNER' || role === 'BRANCH_MANAGER' || role === 'INVENTORY_STAFF') && (
                              <button
                                onClick={() => handleToggleStatus(p)}
                                className={`px-2.5 py-1 font-bold text-xs rounded-lg transition-colors ${
                                  (p.status || 'ACTIVE') === 'ARCHIVED'
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                }`}
                              >
                                {(p.status || 'ACTIVE') === 'ARCHIVED' ? 'Activate' : 'Archive'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Product & Inventory Full Details Modal */}
      {selectedProductDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold border border-indigo-100">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {selectedProductDetails.name}
                  </h3>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Barcode: {selectedProductDetails.barcode}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedProductDetails.category || 'General'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Brand</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedProductDetails.brand || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model Number</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{selectedProductDetails.modelNumber || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HSN Code</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{selectedProductDetails.hsnCode || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Added / Intake</span>
                  <span className="font-mono font-bold text-indigo-700 text-xs">
                    {selectedProductDetails.createdAt ? new Date(selectedProductDetails.createdAt).toLocaleDateString('en-IN') : '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Item Type</span>
                  <span className="font-bold text-xs text-indigo-600">
                    {selectedProductDetails.isSerialized ? 'Serialized Tracking' : 'Standard Bulk Item'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                <h4 className="font-extrabold text-xs text-indigo-900 uppercase tracking-wider">
                  Pricing & Stock Inventory Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Purchase Price (Cost):</span>
                    <span className="font-bold text-slate-900">₹{Number(selectedProductDetails.purchasePrice || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">MRP:</span>
                    <span className="font-bold text-slate-900">₹{Number(selectedProductDetails.mrp || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Discount:</span>
                    <span className="font-bold text-emerald-600">
                      {selectedProductDetails.discountValue > 0
                        ? `${selectedProductDetails.discountType === 'percentage' ? `${selectedProductDetails.discountValue}%` : `₹${selectedProductDetails.discountValue}`}`
                        : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Effective Selling Price:</span>
                    <span className="font-extrabold text-indigo-600">
                      ₹{(() => {
                        const mrp = Number(selectedProductDetails.mrp || 0);
                        const dv = Number(selectedProductDetails.discountValue || 0);
                        const da = selectedProductDetails.discountType === 'percentage' ? (mrp * dv) / 100 : dv;
                        return Math.max(0, mrp - da).toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="btn-primary py-2 px-5 text-xs font-bold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Global Catalog Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onRefresh={loadData}
      />

      {/* Add Branch Stock Intake Modal */}
      <AddStockModal
        isOpen={isAddStockModalOpen}
        onClose={() => setIsAddStockModalOpen(false)}
        onRefresh={loadData}
      />

      {/* Category & Brand Master Modal */}
      <CategoryBrandModal
        isOpen={isCatBrandModalOpen}
        onClose={() => setIsCatBrandModalOpen(false)}
        onRefresh={loadData}
      />

      {/* Monthly Added Inventory Report Modal */}
      <MonthlyInventoryReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        selectedBranchId={selectedBranchId}
        currentBranch={currentBranch}
      />
    </div>
  );
};
