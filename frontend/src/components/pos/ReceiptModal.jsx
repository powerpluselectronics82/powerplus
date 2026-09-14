import React from 'react';
import { X, Printer, CheckCircle, Store, Phone, Calendar } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import companyLogo from '../../assets/logo.jpeg';

export const ReceiptModal = () => {
  const { completedSale, setCompletedSale } = useCart();

  if (!completedSale) return null;

  const handlePrint = () => {
    const printArea = document.getElementById('printable-receipt');
    if (!printArea) {
      window.print();
      return;
    }

    let iframe = document.getElementById('receipt-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thermal Receipt - ${completedSale.invoiceNumber || 'Receipt'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              font-family: monospace, sans-serif;
              background-color: #ffffff;
              color: #0f172a;
              margin: 0;
              padding: 10px;
            }
            @page {
              size: auto;
              margin: 5mm;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 400px; margin: 0 auto;">
            ${printArea.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 relative animate-in zoom-in duration-200">
        <button
          onClick={() => setCompletedSale(null)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable Receipt Region */}
        <div id="printable-receipt" className="p-4 bg-white">
          <div className="text-center mb-6 border-b pb-4 border-slate-200">
            <div className="w-14 h-14 rounded-xl bg-black flex items-center justify-center mx-auto mb-2 overflow-hidden border border-slate-700 shadow-sm">
              <img src={companyLogo} alt="POWER PLUS ELECTRONICS Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">
              POWER PLUS ELECTRONICS
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Branch: {completedSale.branchName || 'Main Store'}
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Invoice #{completedSale.invoiceNumber}
            </p>
          </div>

          <div className="grid grid-cols-2 text-xs mb-4 text-slate-600 space-y-1">
            <div>
              <span className="font-bold block">Customer:</span>
              <span>{completedSale.customerName || 'Walk-in Customer'}</span>
            </div>
            <div className="text-right">
              <span className="font-bold block">Payment Method:</span>
              <span className="badge badge-emerald text-[10px]">{completedSale.paymentMethod}</span>
            </div>
          </div>

          {/* Item Table */}
          <table className="w-full text-xs text-left mb-4 border-t border-b border-slate-200 py-2">
            <thead>
              <tr className="text-slate-400 font-bold border-b border-slate-100">
                <th className="py-1">Item</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedSale.items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 font-bold text-slate-800">{item.productName}</td>
                  <td className="py-1.5 text-center font-mono">{item.unit}</td>
                  <td className="py-1.5 text-right font-mono">₹{item.sellingPrice}</td>
                  <td className="py-1.5 text-right font-mono font-bold">₹{item.totalAmount?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tax & Total Summary */}
          <div className="space-y-1 text-xs border-b border-slate-200 pb-3 font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>₹{completedSale.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CGST / SGST Tax:</span>
              <span>₹{completedSale.taxableValue?.toFixed(2)}</span>
            </div>
            {completedSale.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount Saved:</span>
                <span>-₹{completedSale.totalDiscount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span>₹{completedSale.grandTotal?.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center mt-4 text-[10px] text-slate-400">
            <p>Thank you for shopping with us!</p>
            <p>Powered by POWER PLUS ELECTRONICS Multi-Branch ERP</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handlePrint}
            className="btn-primary w-full justify-center py-2.5 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print Thermal Receipt
          </button>
          <button
            onClick={() => setCompletedSale(null)}
            className="btn-secondary w-full justify-center py-2.5 text-sm"
          >
            Done / Next Order
          </button>
        </div>
      </div>
    </div>
  );
};
