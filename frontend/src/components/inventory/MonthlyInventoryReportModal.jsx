import React, { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import {
  Calendar,
  Printer,
  FileText,
  Boxes,
  DollarSign,
  TrendingUp,
  X,
  Search,
  RefreshCw,
  Package,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export const MonthlyInventoryReportModal = ({ isOpen, onClose, selectedBranchId, currentBranch }) => {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonthStr);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSerials, setExpandedSerials] = useState({});

  const fetchReport = async (targetMonth) => {
    setLoading(true);
    try {
      const res = await productService.getMonthlyInventoryReport(selectedBranchId || '', targetMonth);
      if (res?.success) {
        setReportData(res.data);
      } else {
        setReportData(null);
      }
    } catch (err) {
      console.error('Fetch monthly inventory report error:', err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport(month);
    }
  }, [isOpen, month, selectedBranchId]);

  if (!isOpen) return null;

  const toggleSerialExpand = (inventoryId) => {
    setExpandedSerials((prev) => ({
      ...prev,
      [inventoryId]: !prev[inventoryId],
    }));
  };

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
  };

  const filteredItems = (reportData?.items || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesGeneral =
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.barcode || '').toLowerCase().includes(q) ||
      String(item.category || '').toLowerCase().includes(q) ||
      String(item.brand || '').toLowerCase().includes(q) ||
      String(item.modelNumber || '').toLowerCase().includes(q) ||
      String(item.hsnCode || '').toLowerCase().includes(q);

    const matchesSerial = (item.serialNumbers || []).some((s) => {
      const sn = typeof s === 'object' ? s?.serialNumber : s;
      return String(sn || '').toLowerCase().includes(q);
    });

    return matchesGeneral || matchesSerial;
  });

  const handlePrint = () => {
    if (!reportData) return;

    const printableItems = filteredItems;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report.');
      return;
    }

    const monthFormatted = new Date(`${month}-01`).toLocaleDateString('en-US', {
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
              <div class="stat-value">${reportData.totalBatches}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Total Units Added</div>
              <div class="stat-value">${reportData.totalUnitsAdded.toLocaleString('en-IN')}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Total Purchase Valuation</div>
              <div class="stat-value">₹${reportData.totalIntakeCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Total Expected Selling</div>
              <div class="stat-value">₹${reportData.totalSellingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
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
                          ${item.serialNumbers.map(s => {
                            const sn = typeof s === 'object' ? s.serialNumber : s;
                            const dt = s?.addedAt ? new Date(s.addedAt).toLocaleDateString('en-IN') : '';
                            return `
                              <span class="serial-tag">
                                ${sn}
                                ${dt ? `<span class="serial-date">(${dt})</span>` : ''}
                              </span>
                            `;
                          }).join('')}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-6xl w-full p-6 relative max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold border border-indigo-100 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                Monthly Inventory Intake Report
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Detailed record of products added to inventory for{' '}
                <span className="font-bold text-indigo-700">
                  {currentBranch ? currentBranch.name : 'All Company Branches'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!reportData || filteredItems.length === 0}
              className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm disabled:opacity-50"
              title="Print Monthly Inventory Report"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Print Report</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Month Selector & Search Controls */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <label htmlFor="modal-month-picker-input" className="text-xs font-bold text-slate-600">Month:</label>
              <input
                id="modal-month-picker-input"
                type="month"
                value={month}
                onChange={handleMonthChange}
                className="text-xs font-bold font-mono text-slate-900 border-none outline-none focus:ring-0 bg-transparent"
              />
            </div>

            {month !== currentMonthStr && (
              <button
                onClick={() => setMonth(currentMonthStr)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline transition-colors"
              >
                Current Month
              </button>
            )}

            <button
              onClick={() => fetchReport(month)}
              className="p-2 rounded-xl text-slate-500 hover:bg-white hover:text-indigo-600 transition-all border border-transparent hover:border-slate-200"
              title="Refresh Month Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by product, serial, barcode..."
              className="input-tactile text-xs pl-9 py-1.5"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Summary Widgets */}
        {reportData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Intake Batches</span>
                <span className="text-lg font-extrabold font-mono text-slate-900">{reportData.totalBatches}</span>
              </div>
            </div>

            <div className="p-3 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider block">Units Added</span>
                <span className="text-lg font-extrabold font-mono text-slate-900">{reportData.totalUnitsAdded.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-700/80 uppercase tracking-wider block">Purchase Valuation</span>
                <span className="text-base font-extrabold font-mono text-slate-900">₹{reportData.totalIntakeCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            <div className="p-3 bg-gradient-to-br from-sky-50 to-white rounded-2xl border border-sky-100 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-sky-600/80 uppercase tracking-wider block">Expected Selling</span>
                <span className="text-base font-extrabold font-mono text-indigo-700">₹{reportData.totalSellingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl shadow-inner bg-white">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-semibold text-sm flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Fetching monthly inventory intake report...</span>
            </div>
          ) : !reportData || filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-semibold text-sm">
              No product intake records found for {month}.
            </div>
          ) : (
            <table className="tactile-table">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th>Intake Day & Time</th>
                  <th>Branch</th>
                  <th>Product Details (Specs & Serials)</th>
                  <th>Barcode</th>
                  <th>Units Added</th>
                  <th>Buy Price (Cost)</th>
                  <th>Total Purchase Cost</th>
                  <th>Selling Price</th>
                  <th>Total Selling Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
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
                      {hasSerials && (isExpanded || searchQuery.trim().length > 0) && (
                        <tr className="bg-indigo-50/40">
                          <td colSpan="9" className="p-3 pl-10">
                            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 border-b border-indigo-50 pb-1.5">
                                <span className="uppercase tracking-wider text-[10px] text-indigo-600">
                                  Serialized Product Intake Breakdown ({item.serialNumbers.length} Serial Units Added)
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {item.serialNumbers.map((s, idx) => {
                                  const sn = typeof s === 'object' ? s.serialNumber : s;
                                  const dt = s?.addedAt ? new Date(s.addedAt) : new Date(item.createdAt);
                                  const status = typeof s === 'object' ? (s.status || 'available') : 'available';
                                  return (
                                    <div key={s?.unitId || idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs font-mono">
                                      <div>
                                        <span className="font-bold text-slate-900 block">{sn}</span>
                                        <span className="text-[10px] text-slate-400 font-normal">
                                          Added: {dt.toLocaleDateString('en-IN')} {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                                        {status}
                                      </span>
                                    </div>
                                  );
                                })}
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

        {/* Modal Footer */}
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Total <span className="font-bold text-slate-800">{filteredItems.length}</span> added product batch(es) for {month}
          </div>
          <button
            onClick={onClose}
            className="btn-primary py-2 px-5 text-xs font-bold"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
