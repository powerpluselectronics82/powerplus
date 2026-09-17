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
      <div className="tactile-card p-6 bg-white border border-slate-200 text-black flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">
              Sales Revenue & Profit Analytics
            </h2>
            <p className="text-xs text-slate-700 font-bold pt-1 flex flex-wrap items-center gap-2">
              <span className="text-black">Real-time aggregation pipeline reporting for:</span>
              <span className="px-3 py-0.5 rounded-full bg-amber-400 text-black border border-amber-500 font-black shadow-sm tracking-wide text-xs">
                {currentBranch ? currentBranch.name : 'All Company Branches'}
              </span>
            </p>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'day', label: 'Daily Summary' },
            { id: 'month', label: 'Monthly Summary' },
            { id: 'year', label: 'Annual Summary' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === t.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-semibold text-sm">
          Calculating analytics pipeline data...
        </div>
      ) : summaryData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="tactile-card p-5 border-l-4 border-l-indigo-600">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Total Gross Sales
            </span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{Number(summaryData.totalSale || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Period: {summaryData.periodKey}
            </p>
          </div>

          <div className="tactile-card p-5 border-l-4 border-l-blue-500">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tax Collected (GST)
            </span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{Number(summaryData.totalTaxableValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              CGST + SGST + IGST
            </p>
          </div>

          <div className="tactile-card p-5 border-l-4 border-l-rose-500">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Cost of Goods Sold (COGS)
            </span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{Number(summaryData.totalCost || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Based on purchase price
            </p>
          </div>

          <div className="tactile-card p-5 border-l-4 border-l-emerald-500">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Net Profit Margin
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono">
              ₹{Number(summaryData.totalProfit || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              Gross sales minus (tax + COGS)
            </p>
          </div>
        </div>
      ) : null}

      {/* Graphical Data Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Distribution Bar Chart */}
        <div className="tactile-card p-6">
          <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Financial Metric Breakdown
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="Amount" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Trend Summary */}
        <div className="tactile-card p-6 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="badge badge-indigo">
                Executive Insights
              </span>
              <span className="text-xs text-indigo-300 font-mono">
                Period: {summaryData?.periodKey}
              </span>
            </div>

            <h3 className="text-xl font-extrabold mb-2">
              Performance Executive Briefing
            </h3>
            <p className="text-xs text-indigo-200 leading-relaxed mb-6">
              The MongoDB aggregation pipeline computes real-time gross revenue, item sales tax values, and inventory cost of goods sold across {currentBranch ? `branch ${currentBranch.code}` : 'all company branches'}.
            </p>

            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                <span className="text-indigo-200">Gross Sales Revenue:</span>
                <span className="font-bold text-white">₹{Number(summaryData?.totalSale || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                <span className="text-indigo-200">Net Estimated Profit:</span>
                <span className="font-bold text-emerald-400">₹{Number(summaryData?.totalProfit || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-xs text-indigo-300">
            * Data refreshed directly from MongoDB Aggregation & Redis Cache.
          </div>
        </div>
      </div>
    </div>
  );
};
