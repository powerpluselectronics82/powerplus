import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
  Receipt,
  History,
  FileText,
} from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  fetchDueSales,
  invalidateDueSalesCache,
  updateSaleDueRecord,
} from '../redux/slices/paymentsSlice';
import { ReceivePaymentModal } from '../components/pos/ReceivePaymentModal';
import { PaymentHistoryModal } from '../components/pos/PaymentHistoryModal';
import { TaxInvoiceModal } from '../components/pos/TaxInvoiceModal';

export const DuePaymentsPage = () => {
  const { user, role } = useAuth();
  const { currentBranch } = useBranch();
  const dispatch = useAppDispatch();

  // Redux Global Cached State
  const {
    dueSales,
    meta,
    loading,
    error,
  } = useAppSelector((state) => state.payments);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' (all), 'PARTIAL', 'UNPAID'
  const [page, setPage] = useState(1);

  // Modal States
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState(null);
  const [selectedSaleForHistory, setSelectedSaleForHistory] = useState(null);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState(null);

  const loadData = useCallback(
    (force = false) => {
      dispatch(
        fetchDueSales({
          search: searchQuery.trim(),
          status: statusFilter,
          page,
          limit: 20,
          force,
        })
      );
    },
    [dispatch, searchQuery, statusFilter, page]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle successful installment payment
  const handlePaymentSuccess = (updatedSale) => {
    if (updatedSale?._id) {
      dispatch(updateSaleDueRecord(updatedSale));
    }
    loadData(true);
  };

  // Metrics breakdown
  const partialCount = dueSales.filter((s) => s.paymentStatus === 'PARTIAL').length;
  const unpaidCount = dueSales.filter((s) => s.paymentStatus === 'UNPAID' || s.paymentStatus === 'DUE').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-indigo-600" />
            Due Payments & Receivables
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track customer pending balances, record installments, and inspect payment receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 shadow-sm transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Due */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl p-4 shadow-lg shadow-rose-500/20 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-rose-100 uppercase tracking-wider">Total Outstanding</span>
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black font-mono">₹{meta.totalDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[11px] text-rose-100 mt-0.5">Across {meta.totalCount} pending invoices</p>
          </div>
        </div>

        {/* Total Due Invoices */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Invoices</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 font-mono">{meta.totalCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Require customer settlement</p>
          </div>
        </div>

        {/* Partially Paid */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partially Paid</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600 font-bold text-xs">
              PARTIAL
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-700 font-mono">{partialCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">At least 1 installment received</p>
          </div>
        </div>

        {/* Completely Unpaid */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zero Paid</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600 font-bold text-xs">
              UNPAID
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-700 font-mono">{unpaidCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Full invoice balance pending</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search customer, phone, invoice..."
            className="input-tactile pl-9 text-xs py-2 w-full"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {[
            { id: '', label: 'All Due' },
            { id: 'PARTIAL', label: 'Partial Only' },
            { id: 'UNPAID', label: 'Unpaid Only' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Due Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading due receivables...</span>
          </div>
        ) : dueSales.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center shadow-sm">
              <Receipt className="w-7 h-7" />
            </div>
            <h4 className="text-base font-extrabold text-slate-800">No Outstanding Due Payments</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              There are currently no customer invoices with unpaid balances.
              When a sale is completed in the POS with a partial or unpaid amount, it will automatically appear here with a <strong>Pay Due</strong> button to collect installments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Customer Details</th>
                  <th className="p-3.5 text-right font-mono">Total</th>
                  <th className="p-3.5 text-right font-mono">Paid</th>
                  <th className="p-3.5 text-right font-mono">Remaining Due</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dueSales.map((sale) => {
                  const grandTotal = Number(sale.grandTotal || 0);
                  const paidAmount = Number(sale.paidAmount ?? (sale.paymentStatus === 'PAID' ? grandTotal : 0));
                  const dueAmount = Number(sale.dueAmount ?? (sale.paymentStatus === 'PAID' ? 0 : grandTotal));

                  return (
                    <tr key={sale._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Invoice Number */}
                      <td className="p-3.5 font-mono font-bold text-indigo-900">
                        {sale.invoiceNumber}
                        {sale.branchName && (
                          <span className="block text-[10px] text-slate-400 font-sans font-medium">
                            {sale.branchName}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(sale.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{sale.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {sale.customerPhone || 'No Phone'}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid */}
                      <td className="p-3.5 text-right font-mono font-semibold text-emerald-700">
                        ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Due */}
                      <td className="p-3.5 text-right font-mono font-extrabold text-rose-700 text-sm">
                        ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            sale.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {sale.paymentStatus || 'UNPAID'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Receive Payment Button */}
                          <button
                            onClick={() => setSelectedSaleForPayment(sale)}
                            className="btn-primary py-1.5 px-3 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 shadow-sm flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Pay Due
                          </button>

                          {/* Payment History Button */}
                          <button
                            onClick={() => setSelectedSaleForHistory(sale)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                            title="Payment History"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Tax Invoice Modal Button */}
                          <button
                            onClick={() => setSelectedSaleForInvoice(sale)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors"
                            title="Print Tax Invoice"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="p-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {meta.currentPage} of {meta.totalPages} ({meta.totalCount} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 font-bold"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receive Payment Modal */}
      {selectedSaleForPayment && (
        <ReceivePaymentModal
          isOpen={Boolean(selectedSaleForPayment)}
          onClose={() => setSelectedSaleForPayment(null)}
          sale={selectedSaleForPayment}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Payment History Modal */}
      {selectedSaleForHistory && (
        <PaymentHistoryModal
          isOpen={Boolean(selectedSaleForHistory)}
          onClose={() => setSelectedSaleForHistory(null)}
          saleId={selectedSaleForHistory._id}
          onReceivePaymentClick={(sale) => setSelectedSaleForPayment(sale)}
        />
      )}

      {/* Tax Invoice Modal */}
      {selectedSaleForInvoice && (
        <TaxInvoiceModal
          sale={selectedSaleForInvoice}
          isOpen={Boolean(selectedSaleForInvoice)}
          onClose={() => setSelectedSaleForInvoice(null)}
          branch={selectedSaleForInvoice?.branchId || currentBranch}
        />
      )}
    </div>
  );
};
