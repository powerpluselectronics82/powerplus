import React, { useMemo, useState, useEffect } from 'react';
import { X, Printer, Download, CheckCircle, Building2, DollarSign, History } from 'lucide-react';
import { numberToWordsInINR } from '../../utils/numberToWords';
import companyLogo from '../../assets/logo.jpeg';
import { useBranch } from '../../context/BranchContext';
import { useAppSelector } from '../../redux/hooks';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { PaymentHistoryModal } from './PaymentHistoryModal';

export const TaxInvoiceModal = ({ sale, isOpen, onClose, company, branch, onPaymentUpdated }) => {
  if (!isOpen || !sale) return null;

  const [activeSale, setActiveSale] = useState(sale);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    if (sale) {
      setActiveSale(sale);
    }
  }, [sale]);

  const branchContext = useBranch?.() || {};
  const contextBranches = branchContext.branches || [];
  const contextCurrentBranch = branchContext.currentBranch || null;
  const reduxBranches = useAppSelector((state) => state?.branches?.branches) || [];

  const targetBranch = useMemo(() => {
    if (branch && typeof branch === 'object' && (branch.phone || branch.code || branch.name)) {
      return branch;
    }
    const saleBranchId = typeof sale?.branchId === 'object' ? sale?.branchId?._id : sale?.branchId;
    const branchIdentifier = typeof branch === 'string' ? branch : saleBranchId;

    const allBranches = [
      ...(Array.isArray(contextBranches) ? contextBranches : []),
      ...(Array.isArray(reduxBranches) ? reduxBranches : []),
    ];

    if (branchIdentifier) {
      const match = allBranches.find((b) => String(b._id) === String(branchIdentifier));
      if (match) return match;
    }

    if (sale?.branchId && typeof sale.branchId === 'object') {
      return sale.branchId;
    }

    return contextCurrentBranch || branch || null;
  }, [branch, sale, contextBranches, reduxBranches, contextCurrentBranch]);

  const contactNo = useMemo(() => {
    const rawPhones = targetBranch?.phone || branch?.phone || sale?.branchPhone || targetBranch?.phones;
    const phoneList = [];

    if (Array.isArray(rawPhones)) {
      rawPhones.forEach((p) => {
        if (!p) return;
        const num = typeof p === 'object' ? (p.number || p.phone || p.contact) : p;
        if (num && typeof num === 'string' && num.trim()) {
          phoneList.push(num.trim());
        }
      });
    } else if (typeof rawPhones === 'string' && rawPhones.trim()) {
      rawPhones.split(',').forEach((n) => {
        if (n.trim()) phoneList.push(n.trim());
      });
    }

    if (phoneList.length === 0) {
      const fallbackSingle =
        targetBranch?.phoneNumber ||
        branch?.phoneNumber ||
        targetBranch?.contactNumber ||
        branch?.contactNumber;
      if (fallbackSingle && typeof fallbackSingle === 'string' && fallbackSingle.trim()) {
        phoneList.push(fallbackSingle.trim());
      }
    }

    const uniquePhones = Array.from(new Set(phoneList));

    if (uniquePhones.length > 0) {
      return uniquePhones.join(', ');
    }

    const compPhone = company?.phone;
    if (compPhone) {
      if (Array.isArray(compPhone)) {
        const cpList = compPhone
          .map((cp) => (typeof cp === 'object' ? cp?.number || cp?.phone : cp))
          .filter((cp) => cp && typeof cp === 'string' && cp.trim());
        if (cpList.length > 0) return Array.from(new Set(cpList)).join(', ');
      } else if (typeof compPhone === 'string' && compPhone.trim()) {
        return compPhone.trim();
      }
    }

    return '+91-7004897821, +91-6181241056';
  }, [targetBranch, branch, sale, company]);

  const handlePrint = () => {
    const printArea = document.getElementById('tax-invoice-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    let iframe = document.getElementById('invoice-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'invoice-print-iframe';
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
          <title>Tax Invoice - ${invoiceNumber}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
              background-color: #ffffff;
              color: #0f172a;
              margin: 0;
              padding: 12px;
            }
            @page {
              size: A4;
              margin: 6mm;
            }
            table {
              page-break-inside: auto !important;
            }
            thead {
              display: table-header-group !important;
            }
            tr, img {
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 850px; margin: 0 auto;">
            ${printArea.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  const invoiceNumber = activeSale.invoiceNumber || sale.invoiceNumber || 'INV-001';
  const saleDate = (activeSale.createdAt || sale.createdAt)
    ? new Date(activeSale.createdAt || sale.createdAt).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');

  const customerName = activeSale.customerName || sale.customerName || sale.buyerName || sale.customer?.name || 'Walk-in Customer';
  const customerPhone = activeSale.customerPhone || sale.customerPhone || sale.buyerPhone || sale.customer?.phone || '';
  const customerAddress =
    activeSale.customerAddress ||
    sale.customerAddress ||
    sale.buyerAddress ||
    sale.customer?.address ||
    sale.address ||
    '';
  const cashierName = activeSale.cashierName || sale.cashierName || 'Cashier';
  const branchName = activeSale.branchName || sale.branchName || targetBranch?.name || branch?.name || 'Main Branch';
  const branchCode = targetBranch?.code || branch?.code || 'BR01';
  const companyName = company?.name || 'POWER PLUS ELECTRONICS';
  const companyGstin = company?.gstin || targetBranch?.gstin || branch?.gstin || '10AAGCK1649C1Z4';
  const companyId = company?.companyId || 'U74110KA2016PTC093403';
  const companyAddress =
    targetBranch?.address && typeof targetBranch.address === 'string' && targetBranch.address.trim()
      ? targetBranch.address
      : (company?.address || branch?.address || 'No. 38/ Agora Plaza, Dak Bangala Road, Bihiya Bihar 802152, India');

  const items = Array.isArray(activeSale.items || sale.items) && (activeSale.items || sale.items).length > 0 ? (activeSale.items || sale.items) : [];
  const subtotal = Number(activeSale.subtotal ?? sale.subtotal ?? activeSale.grandTotal ?? sale.grandTotal ?? 0);
  const cgstTotal = Number(activeSale.cgstTotal ?? sale.cgstTotal ?? 0);
  const sgstTotal = Number(activeSale.sgstTotal ?? sale.sgstTotal ?? 0);
  const grandTotal = Number(activeSale.grandTotal ?? sale.grandTotal ?? subtotal);
  const paidAmount = Number(activeSale.paidAmount ?? (activeSale.paymentStatus === 'PAID' ? grandTotal : 0));
  const dueAmount = Number(activeSale.dueAmount ?? (activeSale.paymentStatus === 'PAID' ? 0 : grandTotal));
  const paymentStatus = activeSale.paymentStatus || (dueAmount <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID'));
  const totalInWords = numberToWordsInINR(grandTotal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:overflow-visible print:w-full print:max-w-none">
        {/* Screen Controls Header */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 select-none print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-sm tracking-wide">
              Official Tax Invoice - {invoiceNumber}
            </h3>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-2 border ${
                paymentStatus === 'PAID'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : paymentStatus === 'PARTIAL'
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-rose-950 text-rose-300 border-rose-700'
              }`}
            >
              {paymentStatus}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {dueAmount > 0 && (
              <button
                onClick={() => setIsPayModalOpen(true)}
                className="btn-primary py-1.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 shadow-md flex items-center gap-1"
              >
                <DollarSign className="w-3.5 h-3.5" /> Pay Due (₹{dueAmount.toFixed(2)})
              </button>
            )}
            {activeSale._id && (
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="py-1.5 px-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                title="View Installment History"
              >
                <History className="w-3.5 h-3.5 text-indigo-400" /> History
              </button>
            )}
            <button
              onClick={handlePrint}
              className="btn-primary py-1.5 px-3.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 shadow-md"
            >
              <Printer className="w-4 h-4" /> Print Tax Invoice (A4 / F4)
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Viewport */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 print:p-0 print:overflow-visible print:bg-white">
          <div
            id="tax-invoice-print-area"
            className="bg-white p-8 max-w-4xl mx-auto shadow-sm border border-slate-300 font-sans text-slate-800 text-xs leading-relaxed print:p-0 print:max-w-none print:border-none print:shadow-none"
          >
            {/* Top Company Header & Tax Invoice Title */}
            <div className="border border-slate-800 grid grid-cols-12">
              {/* Top Left: Logo & Company Address */}
              <div className="col-span-7 p-4 border-r border-slate-800 flex gap-4">
                {/* Logo Box */}
                <div className="w-24 h-24 bg-black rounded-lg flex items-center justify-center p-1 shrink-0 border border-slate-700 shadow-sm overflow-hidden">
                  <img
                    src={company?.logoUrl || companyLogo}
                    alt="POWER PLUS ELECTRONICS Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>

                {/* Address Info */}
                <div className="space-y-0.5 text-[11px]">
                  <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                    {companyName}
                  </h2>
                  <p className="font-semibold text-slate-700">Branch Code - {branchCode}</p>
                  <p className="text-slate-600">Company ID : {companyId}</p>
                  <p className="text-slate-600 leading-tight">{companyAddress}</p>
                  <p className="font-semibold text-slate-800 pt-0.5">GSTIN: {companyGstin}</p>
                  <p className="text-slate-600">Contact No : {contactNo}</p>
                </div>
              </div>

              {/* Top Right: TAX INVOICE Header Meta */}
              <div className="col-span-5 p-4 flex flex-col justify-between">
                <h1 className="text-2xl font-black text-right tracking-tight text-slate-900 uppercase">
                  TAX INVOICE
                </h1>

                <div className="space-y-1 text-[11px] pt-4 font-mono">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">#</span>
                    <span className="font-bold text-indigo-900">: {invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">Invoice Date</span>
                    <span className="font-semibold text-slate-800">: {saleDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">Terms</span>
                    <span className="text-slate-800">: Custom</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">Due Date</span>
                    <span className="text-slate-800">: {saleDate}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="font-bold text-slate-600">Sales person</span>
                    <span className="font-bold text-slate-900">: {cashierName.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div className="border-x border-b border-slate-800 p-3 text-[11px] space-y-1">
              <span className="font-extrabold text-slate-400 uppercase tracking-widest block text-[10px]">
                Bill To
              </span>
              <h4 className="font-extrabold text-slate-900 text-xs">{customerName}</h4>
              {customerPhone && (
                <p className="text-slate-600 font-mono">
                  <span className="font-semibold text-slate-700">Contact No : </span>
                  {customerPhone}
                </p>
              )}
              <p className="text-slate-600 leading-tight">
                <span className="font-semibold text-slate-700">Buyer Address : </span>
                {customerAddress || 'N/A'}
              </p>
            </div>

            {/* Payment Remark Subject Banner */}
            <div className="border-x border-b border-slate-800 p-2.5 bg-slate-100/70 text-[11px] font-semibold">
              <span className="font-bold text-slate-700">Subject : </span>
              <span className="font-mono text-slate-900">
                METHOD: {activeSale.paymentMethod || sale.paymentMethod || 'CASH'} — STATUS: {paymentStatus} (PAID: ₹{paidAmount.toFixed(2)}{dueAmount > 0 ? `, DUE: ₹${dueAmount.toFixed(2)}` : ''}) — INVOICE #{invoiceNumber}
              </span>
            </div>

            {/* Line Items Table */}
            <table className="w-full border-x border-b border-slate-800 text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-800 font-extrabold text-slate-900">
                  <th className="p-2 border-r border-slate-800 text-center w-8">#</th>
                  <th className="p-2 border-r border-slate-800">Item & Description</th>
                  <th className="p-2 border-r border-slate-800 text-center">HSN/SAC</th>
                  <th className="p-2 border-r border-slate-800">Brand</th>
                  <th className="p-2 border-r border-slate-800 text-center">Toll-Free No.</th>
                  <th className="p-2 border-r border-slate-800 text-center">Qty</th>
                  <th className="p-2 border-r border-slate-800 text-right">Rate</th>
                  <th className="p-1 border-r border-slate-800 text-center" colSpan={2}>CGST</th>
                  <th className="p-1 border-r border-slate-800 text-center" colSpan={2}>SGST</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-800 text-[10px] font-bold text-slate-600">
                  <th colSpan={7} className="border-r border-slate-800"></th>
                  <th className="p-1 border-r border-slate-800 text-center">%</th>
                  <th className="p-1 border-r border-slate-800 text-right">Amt</th>
                  <th className="p-1 border-r border-slate-800 text-center">%</th>
                  <th className="p-1 border-r border-slate-800 text-right">Amt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-slate-400 italic">
                      No line items recorded.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    if (!item) return null;
                    const qty = Number(item.unit || item.quantity || 1);
                    const rawSelling = Number(item.sellingPrice || item.mrp || 0);
                    const sellingPrice = isNaN(rawSelling) ? 0 : rawSelling;
                    const rawCgst = Number(item.cgstAmount || 0);
                    const cgstAmt = isNaN(rawCgst) ? 0 : rawCgst;
                    const rawSgst = Number(item.sgstAmount || 0);
                    const sgstAmt = isNaN(rawSgst) ? 0 : rawSgst;
                    const rawTotal = Number(item.totalAmount || (sellingPrice * qty) || 0);
                    const lineTotal = isNaN(rawTotal) ? 0 : rawTotal;

                    return (
                      <tr key={index} className="align-top hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-800 text-center font-mono">{index + 1}</td>
                        <td className="p-2 border-r border-slate-800">
                          <div className="font-bold text-slate-900">{item.productName || item.name || 'Product'}</div>
                          {item.description && (
                            <div className="text-[10px] text-slate-500 line-clamp-1">{item.description}</div>
                          )}
                          {item.serialNumber && (
                            <div className="text-[10px] text-indigo-700 font-mono font-semibold">
                              S/N: {item.serialNumber}
                            </div>
                          )}
                          {item.warranty && (
                            <div className="text-[10px] text-purple-700 font-mono font-medium">
                              Warranty: {item.warranty}
                            </div>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-800 text-center font-mono text-slate-600">
                          {item.hsnCode || '852872'}
                        </td>
                        <td className="p-2 border-r border-slate-800 text-slate-700 font-medium">
                          {item.brand || 'General'}
                        </td>
                        <td className="p-2 border-r border-slate-800 text-center font-mono font-bold text-emerald-800">
                          {item.tollFreeNumber || sale.tollFreeNumber || 'N/A'}
                        </td>
                        <td className="p-2 border-r border-slate-800 text-center font-mono font-bold">
                          {qty} PCS
                        </td>
                        <td className="p-2 border-r border-slate-800 text-right font-mono">
                          {sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-1 border-r border-slate-800 text-center font-mono">9%</td>
                        <td className="p-1 border-r border-slate-800 text-right font-mono">
                          {cgstAmt.toFixed(2)}
                        </td>
                        <td className="p-1 border-r border-slate-800 text-center font-mono">9%</td>
                        <td className="p-1 border-r border-slate-800 text-right font-mono">
                          {sgstAmt.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Invoice Footer Grid */}
            <div className="border-x border-b border-slate-800 grid grid-cols-12 text-[11px]">
              {/* Left Footer: Words, Notes, Bank Info, Terms */}
              <div className="col-span-7 p-3 border-r border-slate-800 space-y-3">
                <div>
                  <span className="font-bold text-slate-500 block text-[10px]">Total In Words</span>
                  <div className="font-bold text-slate-900 italic">{totalInWords}</div>
                </div>

                <div>
                  <span className="font-bold text-slate-500 block text-[10px]">Notes</span>
                  <p className="text-slate-700">
                    Thank you for choosing {companyName} - Elevate Your Electronics Experience!
                  </p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-0.5">
                  <span className="font-extrabold text-slate-800 block text-[10px] uppercase tracking-wider">
                    Details for Transferring Funds
                  </span>
                  <p><span className="font-semibold text-slate-600">Bank Name:</span> Bank of Baroda</p>
                  <p><span className="font-semibold text-slate-600">Account Name:</span> {companyName}</p>
                  <p><span className="font-semibold text-slate-600">Account Number:</span> <span className="font-mono font-bold text-slate-900">30790400000335</span></p>
                  <p><span className="font-semibold text-slate-600">IFSC Code:</span> <span className="font-mono">BARB0BANNER</span></p>
                  <p className="text-[10px] text-slate-500">Bank Address: Bannerghatta Main Road, Bangalore - 560083</p>
                </div>

                <div>
                  <span className="font-extrabold text-slate-800 block text-[10px] uppercase">Terms & Conditions</span>
                  <ol className="list-decimal list-inside text-[10px] text-slate-600 space-y-0.5 pt-0.5">
                    <li>E.&O.E. All sales are final, and goods once sold are non-returnable under any circumstances.</li>
                    <li>Payment must be made within specified timeframe. Failure incurs 18% p.a. interest charge.</li>
                    <li>Unloading services are restricted to ground floor level only.</li>
                    <li>Product warranties & services are provided exclusively by respective brands.</li>
                    <li>All legal matters subject to jurisdiction of local courts.</li>
                  </ol>
                </div>
              </div>

              {/* Right Footer: Totals Calculation & Signature */}
              <div className="col-span-5 p-3 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5 font-mono text-slate-700 text-xs">
                  <div className="flex justify-between">
                    <span>Sub Total</span>
                    <span className="font-bold text-slate-900">
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST9 (9%)</span>
                    <span>₹{cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST9 (9%)</span>
                    <span>₹{sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>Total</span>
                    <span className="text-indigo-900">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-emerald-700 pt-1">
                    <span>Total Paid</span>
                    <span className="font-mono font-bold">₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {dueAmount > 0 && (
                    <div className="flex justify-between text-xs font-extrabold text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200">
                      <span>Remaining Due</span>
                      <span className="font-mono">₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className={`flex justify-between text-xs font-bold p-1.5 rounded border mt-1 ${
                    paymentStatus === 'PAID'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : paymentStatus === 'PARTIAL'
                      ? 'text-amber-800 bg-amber-50 border-amber-200'
                      : 'text-rose-700 bg-rose-50 border-rose-200'
                  }`}>
                    <span>Payment Status</span>
                    <span className="font-mono uppercase">{paymentStatus}</span>
                  </div>
                </div>

                {/* Signature Box */}
                <div className="pt-8 text-center border-t border-slate-300">
                  <div className="h-10"></div>
                  <span className="font-bold text-slate-800 text-xs block">Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receive Due Payment Modal */}
      {isPayModalOpen && activeSale && (
        <ReceivePaymentModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          sale={activeSale}
          onPaymentSuccess={(data) => {
            if (data?.sale) {
              setActiveSale(data.sale);
            }
            if (onPaymentUpdated) onPaymentUpdated(data);
          }}
        />
      )}

      {/* Payment Installment History Modal */}
      {isHistoryModalOpen && activeSale?._id && (
        <PaymentHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          saleId={activeSale._id}
          onReceivePaymentClick={() => setIsPayModalOpen(true)}
        />
      )}
    </div>
  );
};
