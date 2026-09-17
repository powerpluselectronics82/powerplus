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
    <div className="space-y-6 bg-white p-6 rounded-2xl border-2 border-black min-h-full text-black shadow-sm">
      {/* Header & Period Controls */}
      <div className="p-6 bg-white border-2 border-black rounded-2xl text-black flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center border-2 border-black shadow-sm">
            <BarChart3 className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">
              Sales Revenue & Profit Analytics
            </h2>
            <p className="text-xs text-black font-black pt-1 flex flex-wrap items-center gap-2">
              <span className="text-black font-black">Real-time aggregation pipeline reporting for:</span>
              <span className="px-3 py-0.5 rounded-full bg-white text-black border-2 border-black font-black shadow-sm tracking-wide text-xs">
                {currentBranch ? currentBranch.name : 'All Company Branches'}
              </span>
            </p>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex bg-white p-1.5 rounded-xl border-2 border-black shadow-sm gap-1.5">
          {[
            { id: 'day', label: 'Daily Summary' },
            { id: 'month', label: 'Monthly Summary' },
            { id: 'year', label: 'Annual Summary' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                period === t.id
                  ? 'bg-black text-white shadow-md'
                  : 'bg-white text-black hover:bg-slate-100 border border-black'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-black font-black text-sm bg-white rounded-2xl border-2 border-black">
          Calculating analytics pipeline data...
        </div>
      ) : summaryData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 bg-white border-2 border-black rounded-2xl shadow-sm text-black">
            <span className="text-xs font-black text-black uppercase tracking-wider block mb-1">
              Total Gross Sales
            </span>
            <div className="text-3xl font-black text-black font-mono tracking-tight">
              ₹{Number(summaryData.totalSale || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-black font-black mt-1">
              Period: {summaryData.periodKey}
            </p>
          </div>

          <div className="p-5 bg-white border-2 border-black rounded-2xl shadow-sm text-black">
            <span className="text-xs font-black text-black uppercase tracking-wider block mb-1">
              Tax Collected (GST)
            </span>
            <div className="text-3xl font-black text-black font-mono tracking-tight">
              ₹{Number(summaryData.totalTaxableValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-black font-black mt-1">
              CGST + SGST + IGST
            </p>
          </div>

          <div className="p-5 bg-white border-2 border-black rounded-2xl shadow-sm text-black">
            <span className="text-xs font-black text-black uppercase tracking-wider block mb-1">
              Cost of Goods Sold (COGS)
            </span>
            <div className="text-3xl font-black text-black font-mono tracking-tight">
              ₹{Number(summaryData.totalCost || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-black font-black mt-1">
              Total buy cost of sold items
            </p>
          </div>

          <div className="p-5 bg-white border-2 border-black rounded-2xl shadow-sm text-black">
            <span className="text-xs font-black text-black uppercase tracking-wider block mb-1">
              Net Profit Margin
            </span>
            <div className="text-3xl font-black text-black font-mono tracking-tight">
              ₹{Number(summaryData.totalProfit || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-black font-black mt-1">
              Gross sales minus (tax + COGS)
            </p>
          </div>
        </div>
      ) : null}

      {/* Graphical Data Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Distribution Bar Chart */}
        <div className="p-6 bg-white border-2 border-black rounded-2xl shadow-sm text-black">
          <h3 className="font-black text-black text-base mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-black" />
            Financial Metric Breakdown
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#000000', fontWeight: 900 }} />
                <YAxis tick={{ fontSize: 12, fill: '#000000', fontWeight: 900 }} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #000000',
                    borderRadius: '12px',
                    color: '#000000',
                    fontWeight: 900,
                  }}
                  itemStyle={{ color: '#000000', fontWeight: 900 }}
                  labelStyle={{ color: '#000000', fontWeight: 900 }}
                />
                <Bar dataKey="Amount" fill="#000000" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Trend Summary */}
        <div className="p-6 bg-white border-2 border-black rounded-2xl text-black flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-white text-black border-2 border-black text-xs font-black uppercase tracking-wider">
                Executive Insights
              </span>
              <span className="text-xs text-black font-mono font-black">
                Period: {summaryData?.periodKey}
              </span>
            </div>

            <h3 className="text-xl font-black mb-2 text-black">
              Performance Executive Briefing
            </h3>
            <p className="text-xs text-black leading-relaxed mb-6 font-black">
              The MongoDB aggregation pipeline computes real-time gross revenue, item sales tax values, and inventory cost of goods sold across {currentBranch ? `branch ${currentBranch.code}` : 'all company branches'}.
            </p>

            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between p-3.5 bg-white rounded-xl border-2 border-black shadow-sm">
                <span className="text-black font-black">Gross Sales Revenue:</span>
                <span className="font-black text-black text-base">₹{Number(summaryData?.totalSale || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3.5 bg-white rounded-xl border-2 border-black shadow-sm">
                <span className="text-black font-black">Net Estimated Profit:</span>
                <span className="font-black text-black text-base">₹{Number(summaryData?.totalProfit || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t-2 border-black text-xs text-black font-black">
            * Data refreshed directly from MongoDB Aggregation & Redis Cache.
          </div>
        </div>
      </div>
    </div>
  );
};
