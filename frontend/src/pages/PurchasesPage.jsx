import React, { useState, useEffect, useMemo } from 'react';
import { purchaseService } from '../services/purchaseService';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import {
  Boxes,
  Plus,
  Printer,
  Search,
  Receipt,
  IndianRupee,
  Building2,
  Calendar,
  FileText,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag
} from 'lucide-react';
import { CreatePurchaseModal } from '../components/inventory/CreatePurchaseModal';
import { PurchaseInvoiceModal } from '../components/inventory/PurchaseInvoiceModal';

import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchPurchases, invalidatePurchasesCache } from '../redux/slices/purchasesSlice';
import { fetchSuppliers } from '../redux/slices/suppliersSlice';
import { fetchCatalogProducts, invalidateProductCaches } from '../redux/slices/productsSlice';

export const PurchasesPage = () => {
  const dispatch = useAppDispatch();
  const { role, company } = useAuth();
  const { selectedBranchId, currentBranch } = useBranch();
  const { purchases, loading } = useAppSelector((state) => state.purchases);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const loadPurchases = (force = false) => {
    const bId = (role === 'OWNER' && !selectedBranchId) ? null : (selectedBranchId || currentBranch?._id);
    dispatch(fetchPurchases({ branchId: bId, force }));
  };

  useEffect(() => {
    loadPurchases();
    dispatch(fetchSuppliers());
    dispatch(fetchCatalogProducts());
  }, [selectedBranchId, role, dispatch]);

  const handleOpenPdf = (purchaseItem) => {
    setSelectedPurchase(purchaseItem);
    setIsPrintModalOpen(true);
  };

  // Filtered purchases based on search and status
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchStatus = statusFilter === 'ALL' || (p.paymentStatus || 'PAID') === statusFilter;
      
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchStatus;

      const invNo = (p.purchaseInvoiceNumber || '').toLowerCase();
      const supName = (p.supplierName || p.supplierId?.name || '').toLowerCase();
      const supGstin = (p.supplierGstin || p.supplierId?.gstin || '').toLowerCase();
      
      const itemMatch = Array.isArray(p.items) && p.items.some((item) => {
        const name = (item.productName || item.name || '').toLowerCase();
        const barcode = (item.barcode || '').toLowerCase();
        const hsn = (item.hsnCode || '').toLowerCase();
        const model = (item.modelNumber || '').toLowerCase();
        return name.includes(q) || barcode.includes(q) || hsn.includes(q) || model.includes(q);
      });

      return matchStatus && (invNo.includes(q) || supName.includes(q) || supGstin.includes(q) || itemMatch);
    });
  }, [purchases, searchQuery, statusFilter]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = purchases.length;
    let totalExpenditure = 0;
    let totalTax = 0;
    const vendorsSet = new Set();

    purchases.forEach((p) => {
      totalExpenditure += Number(p.grandTotal || p.totalAmount || 0);
      totalTax += Number(p.taxTotal || p.taxableAmount || 0);
      if (p.supplierName || p.supplierId?.name) {
        vendorsSet.add(p.supplierName || p.supplierId?.name);
      }
    });

    return {
      totalCount,
      totalExpenditure,
      totalTax,
      uniqueVendors: vendorsSet.size,
    };
  }, [purchases]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="tactile-card p-6 bg-white border border-slate-200 text-black flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">
              Stock Receive & Purchase Invoices
            </h2>
            <p className="text-xs text-slate-700 font-bold pt-1 flex flex-wrap items-center gap-2">
              <span className="text-black">Historical ledger of vendor intake orders for:</span>
              <span className="px-3 py-0.5 rounded-full bg-amber-400 text-black border border-amber-500 font-black shadow-sm tracking-wide text-xs">
                {currentBranch ? currentBranch.name : 'All Company Branches'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="tactile-btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold px-5 py-2.5 shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Receive Stock (New Invoice)
        </button>
      </div>

      {/* Summary KPI Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="tactile-card p-4 bg-white border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Purchase Orders</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="tactile-card p-4 bg-white border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Stock Intake Cost</p>
            <h3 className="text-xl font-extrabold text-indigo-700 font-mono mt-1">
              ₹{metrics.totalExpenditure.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="tactile-card p-4 bg-white border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Tax Paid</p>
            <h3 className="text-xl font-extrabold text-slate-800 font-mono mt-1">
              ₹{metrics.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="tactile-card p-4 bg-white border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Unique Suppliers</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.uniqueVendors}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="tactile-card p-4 bg-white border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full flex-1 max-w-2xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search purchase invoice #, supplier name, barcode, HSN, or model #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tactile-input pl-10 text-xs w-full py-2.5 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Status:
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['ALL', 'PAID', 'UNPAID', 'PARTIAL'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-white text-indigo-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Purchase Log Table */}
      <div className="tactile-card overflow-hidden bg-white border border-slate-200">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-semibold text-sm">
            Loading stock purchase logs...
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 font-bold text-sm">No purchase invoice logs found</p>
            <p className="text-xs text-slate-400">
              {searchQuery ? 'Try clearing your search query or status filter.' : 'Click "Receive Stock" above to record a new invoice.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tactile-table text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Purchased Items & Specs</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Tax (₹)</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((p) => {
                  const isMultiItem = Array.isArray(p.items) && p.items.length > 0;
                  const supplierName = p.supplierName || p.supplierId?.name || 'Direct Vendor';
                  const supplierGstin = p.supplierGstin || p.supplierId?.gstin || '';
                  const invoiceNo = p.purchaseInvoiceNumber || 'N/A';
                  const pDate = new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-IN');

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{pDate}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-extrabold text-indigo-700">
                        {invoiceNo}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 block">{supplierName}</span>
                          {supplierGstin ? (
                            <span className="text-[10px] text-indigo-600 font-mono font-bold block">
                              GSTIN: {supplierGstin}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic block">GSTIN: N/A</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-md">
                        {isMultiItem ? (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {p.items.length} Product Items
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {p.items.map((i, idx) => {
                                const hsn = i.hsnCode || i.productId?.hsnCode;
                                const model = i.modelNumber || i.productId?.modelNumber;
                                return (
                                  <span
                                    key={idx}
                                    className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200"
                                  >
                                    <strong className="text-slate-900">{i.productName || i.name}</strong>
                                    {model && <span className="text-slate-500"> ({model})</span>}
                                    {hsn && <span className="text-indigo-600 font-mono"> HSN:{hsn}</span>}
                                    <span className="text-indigo-900 font-bold ml-1">x{i.quantity}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900">{p.productName || 'Stock Line Item'}</span>
                            <span className="text-[11px] text-slate-500 block font-mono">
                              Barcode: {p.barcode || 'N/A'} | Qty: {p.Stock || 1}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                            p.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : p.paymentStatus === 'UNPAID'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {p.paymentStatus === 'PAID' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : p.paymentStatus === 'UNPAID' ? (
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          {p.paymentStatus || 'PAID'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 font-semibold">
                        ₹{(p.taxTotal || p.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                        ₹{(p.grandTotal || p.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenPdf(p)}
                          className="tactile-btn py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 text-xs font-bold inline-flex items-center gap-1.5 border border-indigo-200 transition-all shadow-sm"
                          title="View and print purchase invoice PDF"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          View PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Multi-Item Purchase Order Modal */}
      <CreatePurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          dispatch(invalidatePurchasesCache());
          dispatch(invalidateProductCaches());
          loadPurchases(true);
        }}
      />

      {/* Purchase Invoice PDF Printable Modal */}
      <PurchaseInvoiceModal
        purchase={selectedPurchase}
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedPurchase(null);
        }}
        company={company}
        branch={currentBranch}
      />
    </div>
  );
};
