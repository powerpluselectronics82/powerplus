import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Banknote, QrCode, CreditCard, ShieldCheck } from 'lucide-react';
import { paymentService } from '../../services/paymentService';

export const ReceivePaymentModal = ({
  isOpen,
  onClose,
  sale,
  onPaymentSuccess,
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dueAmount = Number(sale?.dueAmount ?? 0);
  const grandTotal = Number(sale?.grandTotal ?? 0);
  const paidAmount = Number(sale?.paidAmount ?? 0);

  useEffect(() => {
    if (isOpen && sale) {
      setAmount(dueAmount > 0 ? String(dueAmount) : '');
      setPaymentMethod('CASH');
      setTransactionRef('');
      setNotes('');
      setError('');
    }
  }, [isOpen, sale, dueAmount]);

  if (!isOpen || !sale) return null;

  const numericAmount = Number(amount) || 0;
  const remainingAfterPayment = Math.max(0, Number((dueAmount - numericAmount).toFixed(2)));
  const isOverpaying = numericAmount > dueAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0');
      return;
    }
    if (isOverpaying) {
      setError(`Payment amount cannot exceed remaining due (₹${dueAmount.toFixed(2)})`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await paymentService.receivePayment({
        saleId: sale._id,
        amountPaid: numericAmount,
        paymentMethod,
        transactionRef: transactionRef.trim(),
        notes: notes.trim(),
      });

      if (res.success) {
        if (onPaymentSuccess) {
          onPaymentSuccess(res.data);
        }
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
    { id: 'CARD', label: 'Debit / Card', icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Receive Due Payment</h3>
              <p className="text-xs text-indigo-200 font-mono">Invoice #{sale.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-indigo-200 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Customer:</span>
              <span className="font-bold text-slate-800">
                {sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 text-center font-mono">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Total</span>
                <span className="font-bold text-slate-900 text-xs">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-emerald-700 block">Already Paid</span>
                <span className="font-bold text-emerald-700 text-xs">₹{paidAmount.toFixed(2)}</span>
              </div>
              <div className="bg-rose-50/70 p-2 rounded-lg border border-rose-200">
                <span className="text-[10px] text-rose-700 block">Current Due</span>
                <span className="font-extrabold text-rose-700 text-xs">₹{dueAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Amount to Pay */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-700">Installment Amount to Pay (₹)</label>
              <button
                type="button"
                onClick={() => setAmount(String(dueAmount))}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Pay Full Due (₹{dueAmount.toFixed(2)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={dueAmount}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max: ${dueAmount.toFixed(2)}`}
                className={`input-tactile pl-8 text-sm font-mono font-bold ${
                  isOverpaying ? 'border-rose-500 ring-1 ring-rose-500' : ''
                }`}
              />
            </div>
            {isOverpaying && (
              <p className="text-[11px] text-rose-600 font-medium">
                Amount cannot exceed due balance of ₹{dueAmount.toFixed(2)}.
              </p>
            )}
            {!isOverpaying && numericAmount > 0 && (
              <p className="text-[11px] text-slate-500 font-mono flex justify-between">
                <span>Remaining Due after payment:</span>
                <span className="font-bold text-slate-800">₹{remainingAfterPayment.toFixed(2)}</span>
              </p>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Transaction Ref / UPI UTR
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="UTR / Card receipt #"
                className="input-tactile text-xs py-1.5"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Installment Note
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 2nd installment"
                className="input-tactile text-xs py-1.5"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || numericAmount <= 0 || isOverpaying}
              className="btn-primary py-2 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Record ₹{numericAmount > 0 ? numericAmount.toFixed(2) : '0.00'} Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
