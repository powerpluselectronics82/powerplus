import React from 'react';
import { X, Printer, Truck } from 'lucide-react';
import { numberToWordsInINR } from '../../utils/numberToWords';

const formatPhoneList = (phones, populatedPhones, legacyPhone) => {
  const combined = [];
  if (Array.isArray(phones) && phones.length > 0) {
    combined.push(...phones);
  }
  if (Array.isArray(populatedPhones) && populatedPhones.length > 0) {
    combined.push(...populatedPhones);
  }
  if (legacyPhone) {
    combined.push(legacyPhone);
  }

  const cleaned = combined
    .map((p) => {
      if (!p) return '';
      if (typeof p === 'string') return p.trim();
      if (typeof p === 'object') return (p.number || p.phone || JSON.stringify(p)).trim();
      return String(p).trim();
    })
    .filter(Boolean);

  return [...new Set(cleaned)].join(', ');
};

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [
      addr.street,
      addr.addressLine1,
      addr.addressLine2,
      addr.city,
      addr.state,
      addr.zipCode || addr.pincode || addr.pin,
      addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : JSON.stringify(addr);
  }
  return String(addr);
};

export const PurchaseInvoiceModal = ({ purchase, isOpen, onClose, company, branch }) => {
  if (!isOpen || !purchase) return null;

  const invoiceNumber = purchase.purchaseInvoiceNumber || 'PUR-001';
  const purchaseDate = purchase.purchaseDate
    ? new Date(purchase.purchaseDate).toLocaleDateString('en-IN')
    : new Date(purchase.createdAt || Date.now()).toLocaleDateString('en-IN');

  const supplierName = purchase.supplierName || purchase.supplierId?.name || 'Vendor Supplier';
  const supplierBrand = purchase.supplierId?.brand || '';
  const supplierGstin = purchase.supplierGstin || purchase.supplierId?.gstin || '';

  const supplierPhone = formatPhoneList(
    purchase.supplierPhoneNumbers,
    purchase.supplierId?.phoneNumbers,
    purchase.supplierId?.phone
  );

  const supplierEmail = purchase.supplierEmail || purchase.supplierId?.email || '';
  const supplierAddress = formatAddress(purchase.supplierAddress || purchase.supplierId?.address);

  const branchName = purchase.branchId?.name || branch?.name || 'Main Branch';
  const branchCode = purchase.branchId?.code || branch?.code || 'BR01';
  const branchGstin = purchase.branchId?.gstin || branch?.gstin || company?.gstin || '';
  const branchAddress = formatAddress(purchase.branchId?.address || branch?.address || company?.address);
  const branchPhone = formatPhoneList([], purchase.branchId?.phone || branch?.phone || company?.phone, null);

  const items = Array.isArray(purchase.items) && purchase.items.length > 0 ? purchase.items : [];
  const subtotal = purchase.subtotal || 0;
  const taxTotal = purchase.taxTotal || 0;
  const grandTotal = purchase.grandTotal || (subtotal + taxTotal);
  const totalInWords = numberToWordsInINR(grandTotal);

  const handlePrint = () => {
    const printArea = document.getElementById('purchase-invoice-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    let iframe = document.getElementById('purchase-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'purchase-print-iframe';
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
          <title>Stock Purchase Invoice - ${invoiceNumber}</title>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:overflow-visible print:w-full print:max-w-none">
        {/* Modal Controls Header */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 select-none print:hidden">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-sm tracking-wide">
              Stock Purchase Invoice - {invoiceNumber}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="btn-primary py-1.5 px-3.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 shadow-md"
            >
              <Printer className="w-4 h-4" /> Print Purchase PDF (A4)
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Document */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 print:p-0 print:overflow-visible print:bg-white">
          <div
            id="purchase-invoice-print-area"
            className="bg-white p-8 max-w-4xl mx-auto shadow-sm border border-slate-300 font-sans text-slate-800 text-xs leading-relaxed print:p-0 print:max-w-none print:border-none print:shadow-none"
          >
            {/* Top Vendor Header */}
            <div className="border border-slate-800 grid grid-cols-12">
              <div className="col-span-7 p-4 border-r border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                  Vendor / Supplier Invoice Issuer
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                  {supplierName}
                </h2>
                {supplierBrand && (
                  <p className="font-semibold text-slate-700">Brand / Tag: {supplierBrand}</p>
                )}
                {supplierGstin ? (
                  <p className="font-bold text-slate-900 font-mono">GSTIN: {supplierGstin}</p>
                ) : (
                  <p className="text-slate-400 font-mono italic">GSTIN: Not Specified</p>
                )}
                {supplierAddress && (
                  <p className="text-slate-600 leading-tight">Address: {supplierAddress}</p>
                )}
                {supplierPhone ? (
                  <p className="text-slate-700 font-mono font-semibold">Contact: {supplierPhone}</p>
                ) : (
                  <p className="text-slate-400 font-mono italic">Contact: Not Specified</p>
                )}
                {supplierEmail && (
                  <p className="text-slate-600">Email: {supplierEmail}</p>
                )}
              </div>

              <div className="col-span-5 p-4 flex flex-col justify-between">
                <h1 className="text-xl font-black text-right tracking-tight text-slate-900 uppercase">
                  PURCHASE INVOICE
                </h1>

                <div className="space-y-1 text-[11px] pt-2 font-mono">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">Purchase Invoice #</span>
                    <span className="font-bold text-indigo-900">: {invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-600">Purchase Date</span>
                    <span className="font-semibold text-slate-800">: {purchaseDate}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="font-bold text-slate-600">Payment Status</span>
                    <span className="font-bold text-emerald-800">: {purchase.paymentStatus || 'PAID'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Consignee / Stock Received At Branch Details */}
            <div className="border-x border-b border-slate-800 p-3 bg-slate-50/50 space-y-1 text-[11px]">
              <span className="font-extrabold text-slate-400 uppercase tracking-widest block text-[10px]">
                Stock Received At Branch (Billed To / Ship To)
              </span>
              <h4 className="font-extrabold text-slate-900 text-xs">{branchName} ({branchCode})</h4>
              {branchGstin && <p className="text-slate-700 font-mono font-semibold">GSTIN: {branchGstin}</p>}
              {branchAddress && <p className="text-slate-600">Address: {branchAddress}</p>}
              {branchPhone && <p className="text-slate-600 font-mono">Contact: {branchPhone}</p>}
            </div>

            {/* Line Items Table */}
            <table className="w-full border-x border-b border-slate-800 text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-800 font-extrabold text-slate-900">
                  <th className="p-2 border-r border-slate-800 text-center w-8">#</th>
                  <th className="p-2 border-r border-slate-800">Product Name & Barcode</th>
                  <th className="p-2 border-r border-slate-800 text-center">HSN / Model #</th>
                  <th className="p-2 border-r border-slate-800 text-center">Qty Received</th>
                  <th className="p-2 border-r border-slate-800 text-right">Unit Cost (₹)</th>
                  <th className="p-1 border-r border-slate-800 text-center">CGST</th>
                  <th className="p-1 border-r border-slate-800 text-center">SGST</th>
                  <th className="p-2 text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                      No purchase line items recorded.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const qty = Number(item.quantity || 1);
                    const cost = Number(item.purchasePrice || 0);
                    const cgst = Number(item.cgstRate || 0);
                    const sgst = Number(item.sgstRate || 0);
                    const lineTotal = Number(item.totalAmount || (qty * cost * (1 + (cgst + sgst) / 100)));
                    const hsn = item.hsnCode || item.productId?.hsnCode || '';
                    const modelNo = item.modelNumber || item.productId?.modelNumber || '';

                    return (
                      <tr key={index} className="align-top hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-800 text-center font-mono">{index + 1}</td>
                        <td className="p-2 border-r border-slate-800">
                          <div className="font-bold text-slate-900">{item.productName || item.name || 'Catalog Item'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Barcode: {item.barcode || 'N/A'}</div>
                        </td>
                        <td className="p-2 border-r border-slate-800 text-center font-mono">
                          {hsn && <div className="font-semibold text-slate-800">HSN: {hsn}</div>}
                          {modelNo && <div className="text-[10px] text-slate-600">Model: {modelNo}</div>}
                          {!hsn && !modelNo && <div className="text-slate-400 italic text-[10px]">N/A</div>}
                        </td>
                        <td className="p-2 border-r border-slate-800 text-center font-mono font-bold">
                          {qty} PCS
                        </td>
                        <td className="p-2 border-r border-slate-800 text-right font-mono">
                          ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 border-r border-slate-800 text-center font-mono">{cgst}%</td>
                        <td className="p-2 border-r border-slate-800 text-center font-mono">{sgst}%</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Footer Summary Grid */}
            <div className="border-x border-b border-slate-800 grid grid-cols-12 text-[11px]">
              <div className="col-span-7 p-3 border-r border-slate-800 space-y-3">
                <div>
                  <span className="font-bold text-slate-500 block text-[10px]">Total Purchase Amount In Words</span>
                  <div className="font-bold text-slate-900 italic">{totalInWords}</div>
                </div>

                <div>
                  <span className="font-bold text-slate-500 block text-[10px]">Stock Intake Declaration</span>
                  <p className="text-slate-700">
                    Received and verified stock into store inventory at {branchName}.
                  </p>
                </div>
              </div>

              <div className="col-span-5 p-3 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5 font-mono text-slate-700 text-xs">
                  <div className="flex justify-between">
                    <span>Taxable Subtotal</span>
                    <span className="font-bold text-slate-900">
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax Amount</span>
                    <span>₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>Grand Total</span>
                    <span className="text-indigo-900">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-6 text-center border-t border-slate-300">
                  <span className="font-bold text-slate-800 text-xs block">Authorized Receiver Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
