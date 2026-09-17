import React, { useState, useEffect } from 'react';
import { saleService } from '../services/saleService';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

export const AnalyticsPage = () => {
  const { role } = useAuth();
  const { selectedBranchId, currentBranch } = useBranch();
  const [period, setPeriod] = useState('month'); // day | month | year
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    setLoading(true);
    try {
      let res;
      if (period === 'day') {
        res = await saleService.getSummaryDay(selectedBranchId);
      } else if (period === 'month') {
        res = await saleService.getSummaryMonth(selectedBranchId);
      } else {
        res = await saleService.getSummaryYear(selectedBranchId);
      }

      if (res?.success) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [selectedBranchId, period]);

  // Mock comparison breakdown for charts based on summary data
  const chartData = summaryData
    ? [
        {
          name: 'Revenue',
          Amount: summaryData.totalRevenue || summaryData.totalSale || 0,
        },
        {
          name: 'Tax Collected',
          Amount: summaryData.totalTaxableValue || 0,
        },
        {
          name: 'Cost of Goods',
          Amount: summaryData.totalCost || 0,
        },
        {
          name: 'Net Profit',
          Amount: summaryData.totalProfit || 0,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Period Controls */}
      <div className="tactile-card p-6 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">
              Sales Revenue & Profit Analytics
            </h2>
            <p className="text-xs text-slate-700 font-medium pt-1 flex flex-wrap items-center gap-2">
              <span>Real-time aggregation pipeline reporting for:</span>
              <span className="px-3 py-0.5 rounded-full bg-amber-400 text-black font-black shadow-sm tracking-wide text-xs">
                {currentBranch ? currentBranch.name : 'All Company Branches'}
              </span>
            </p>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner gap-1">
          {[
            { id: 'day', label: 'Daily Summary' },
            { id: 'month', label: 'Monthly Summary' },
            { id: 'year', label: 'Annual Summary' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`px-4 py-2 rounded-lg text-xs transition-all ${
                period === t.id
                  ? 'bg-white text-black shadow-sm font-black'
                  : 'text-slate-600 hover:text-black hover:bg-white/50 font-bold'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      {loading ? (
        <div className="tactile-card p-12 text-center text-slate-600 font-bold text-sm bg-white">
          Calculating analytics pipeline data...
        </div>
      ) : summaryData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="tactile-card p-5 border-l-4 border-l-indigo-600 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Gross Sales
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-black font-mono tracking-tight">
              ₹{Number(summaryData.totalSale || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-600 mt-1 font-semibold">
              Period: {summaryData.periodKey}
            </p>
          </div>

          <div className="tactile-card p-5 border-l-4 border-l-blue-600 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tax Collected (GST)
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <PieChart className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-black font-mono tracking-tight">
              ₹{Number(summaryData.totalTaxableValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-600 mt-1 font-semibold">
              CGST + SGST + IGST
            </p>
          </div>

          <div className="tactile-card p-5 border-l-4 border-l-rose-500 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Cost of Goods Sold (COGS)
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-black font-mono tracking-tight">
              ₹{Number(summaryData.totalCost || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-600 mt-1 font-semibold">
              Total buy cost of sold items
            </p>
          </div>

          <div className="tactile-card p-5 border-l-4 border-l-emerald-600 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Net Profit Margin
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-black font-mono tracking-tight">
              ₹{Number(summaryData.totalProfit || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-600 mt-1 font-semibold">
              Gross sales minus (tax + COGS)
            </p>
          </div>
        </div>
      ) : null}

      {/* Graphical Data Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Distribution Bar Chart */}
        <div className="tactile-card p-6 bg-white shadow-sm">
          <h3 className="font-extrabold text-black text-base mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Financial Metric Breakdown
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 700 }} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
                    color: '#000000',
                    fontWeight: 700,
                  }}
                  itemStyle={{ color: '#000000', fontWeight: 700 }}
                  labelStyle={{ color: '#000000', fontWeight: 800 }}
                />
                <Bar dataKey="Amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Trend Summary */}
        <div className="tactile-card p-6 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                Executive Insights
              </span>
              <span className="text-xs text-slate-700 font-mono font-bold">
                Period: {summaryData?.periodKey}
              </span>
            </div>

            <h3 className="text-xl font-black mb-2 text-black">
              Performance Executive Briefing
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed mb-6 font-medium">
              The MongoDB aggregation pipeline computes real-time gross revenue, item sales tax values, and inventory cost of goods sold across {currentBranch ? `branch ${currentBranch.code}` : 'all company branches'}.
            </p>

            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between p-3.5 bg-slate-50 rounded-xl">
                <span className="text-slate-700 font-semibold">Gross Sales Revenue:</span>
                <span className="font-extrabold text-black text-base">₹{Number(summaryData?.totalSale || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3.5 bg-slate-50 rounded-xl">
                <span className="text-slate-700 font-semibold">Net Estimated Profit:</span>
                <span className="font-extrabold text-black text-base">₹{Number(summaryData?.totalProfit || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-100 text-xs text-slate-600 font-medium">
            * Data refreshed directly from MongoDB Aggregation & Redis Cache.
          </div>
        </div>
      </div>
    </div>
  );
};
