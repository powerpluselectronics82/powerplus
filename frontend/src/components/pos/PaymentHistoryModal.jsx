import React, { useState, useEffect } from 'react';
import { X, History, Banknote, QrCode, CreditCard, Calendar, Clock, AlertCircle } from 'lucide-react';
import { paymentService } from '../../services/paymentService';

export const PaymentHistoryModal = ({ isOpen, onClose, saleId, onReceivePaymentClick }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyData, setHistoryData] = useState({ sale: null, payments: [] });

  useEffect(() => {
    if (isOpen && saleId) {
      fetchHistory();
    }
  }, [isOpen, saleId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentService.getPaymentHistory(saleId);
      if (res.success && res.data) {
        setHistoryData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !saleId) return null;

  const sale = historyData.sale;
  const payments = historyData.payments || [];

  const getMethodBadge = (method) => {
    switch (method?.toUpperCase()) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
            <Banknote className="w-3 h-3" /> CASH
          </span>
        );
      case 'UPI':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono">
            <QrCode className="w-3 h-3" /> UPI
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
            <CreditCard className="w-3 h-3" /> CARD
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {method}
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
            PAID
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
            PARTIAL
          </span>
        );
      case 'UNPAID':
      case 'DUE':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
            UNPAID
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <History className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Payment History</h3>
              <p className="text-xs text-slate-300 font-mono">Invoice #{sale?.invoiceNumber || '...'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Sale Summary Banner */}
          {sale && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{sale.customerName}</h4>
                  <p className="text-xs text-slate-500 font-mono">{sale.customerPhone || 'No Phone'}</p>
                </div>
                <div>{getStatusBadge(sale.paymentStatus)}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase">Total Amount</span>
                  <span className="font-bold text-slate-900 text-sm">₹{Number(sale.grandTotal).toFixed(2)}</span>
                </div>
                <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block uppercase">Total Paid</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    ₹{Number(sale.paidAmount ?? (sale.paymentStatus === 'PAID' ? sale.grandTotal : 0)).toFixed(2)}
                  </span>
                </div>
                <div className="bg-rose-50/80 p-2.5 rounded-lg border border-rose-200">
                  <span className="text-[10px] text-rose-700 block uppercase">Outstanding Due</span>
                  <span className="font-extrabold text-rose-700 text-sm">
                    ₹{Number(sale.dueAmount ?? (sale.paymentStatus === 'PAID' ? 0 : sale.grandTotal)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Installments Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Installment Receipts ({payments.length})
              </h5>
              {sale && Number(sale.dueAmount) > 0 && onReceivePaymentClick && (
                <button
                  onClick={() => {
                    onClose();
                    onReceivePaymentClick(sale);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  + Record Payment
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Loading installment history...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs font-medium">
                No installment records found for this invoice.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-2.5">Date & Time</th>
                      <th className="p-2.5">Amount</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5">Txn / Ref</th>
                      <th className="p-2.5">Received By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p, idx) => (
                      <tr key={p._id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-mono text-[11px] text-slate-600">
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {new Date(p.paymentDate).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700 text-xs">
                          ₹{Number(p.amountPaid).toFixed(2)}
                        </td>
                        <td className="p-2.5">{getMethodBadge(p.paymentMethod)}</td>
                        <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                          {p.transactionRef || (p.notes ? <span className="italic text-slate-400">{p.notes}</span> : '-')}
                        </td>
                        <td className="p-2.5 text-slate-700 font-medium">
                          {p.recordedByName || 'Cashier'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
