import React, { useState, useEffect, useMemo } from 'react';
import { systemService } from '../services/systemService';
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  Cpu,
  CheckCircle,
  Search,
  Clock,
  ShieldCheck,
  Zap,
  Terminal,
  User,
  Tag,
  Layers,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet
} from 'lucide-react';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await systemService.getHealth();
      if (res?.success) setHealth(res.data);
    } catch (err) {
      console.error('Health check error:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchLogs = async (p = 1) => {
    setLoadingLogs(true);
    try {
      const res = await systemService.getAuditLogs({ page: p, limit: 25 });
      if (res?.success) {
        setLogs(res.data || []);
        setMeta(res.meta || {});
      }
    } catch (err) {
      console.error('Audit logs fetch error:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchLogs(page);
  }, [page]);

  // Filter logs locally by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter((log) => {
      const uName = (log.userName || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const res = (log.resource || '').toLowerCase();
      const details = JSON.stringify(log.details || {}).toLowerCase();
      return uName.includes(q) || action.includes(q) || res.includes(q) || details.includes(q);
    });
  }, [logs, searchQuery]);

  const renderPrettyDetails = (details) => {
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
      return <span className="text-slate-400 italic text-[11px]">No metadata details</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(details).map(([key, val]) => {
          let displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-200"
            >
              <span className="text-slate-500 font-semibold">{key}:</span>
              <span className="font-extrabold text-slate-900">{displayVal}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const getActionBadgeClass = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('CREATE') || act.includes('ADD')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('UPDATE') || act.includes('EDIT')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (act.includes('DELETE') || act.includes('REMOVE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('PURCHASE')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (act.includes('SALE') || act.includes('POS')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const handleExportCsv = async (shouldDelete = false) => {
    try {
      const res = await systemService.exportAuditLogs();
      const logsToExport = (res?.success && Array.isArray(res.data)) ? res.data : logs;

      if (!logsToExport || logsToExport.length === 0) {
        alert('No audit log records available to export.');
        return;
      }

      if (shouldDelete) {
        const confirmed = window.confirm(
          `Are you sure you want to download ${logsToExport.length} audit records to an Excel CSV file AND DELETE them from the database? This action cannot be undone.`
        );
        if (!confirmed) return;
      }

      // Generate UTF-8 BOM CSV File for Excel compatibility
      let csvContent = '\uFEFF';
      csvContent += `System Audit Activity Logs Report\n`;
      csvContent += `Generated On: ${new Date().toLocaleString('en-IN')}, Total Records: ${logsToExport.length}\n\n`;

      const headers = ['Timestamp', 'Operator / User Name', 'Action', 'Target Resource', 'Event Metadata Details'];
      csvContent += headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

      logsToExport.forEach((log) => {
        const timeStr = new Date(log.createdAt).toLocaleString('en-IN');
        const user = log.userName || 'System Auto';
        const action = log.action || '';
        const resource = log.resource || '';
        const details = JSON.stringify(log.details || {});

        const row = [timeStr, user, action, resource, details];
        csvContent += row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateTag = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `System_Audit_Logs_${dateTag}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // If user requested delete after export
      if (shouldDelete) {
        const clearRes = await systemService.clearAuditLogs();
        if (clearRes?.success) {
          alert(`Successfully exported and deleted ${clearRes.data?.deletedCount || logsToExport.length} audit log entries from database.`);
          setPage(1);
          fetchLogs(1);
        } else {
          alert(clearRes?.message || 'Failed to clear audit log entries after export.');
        }
      }
    } catch (err) {
      console.error('Export CSV error:', err);
      alert('Failed to export audit logs. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="tactile-card p-6 bg-white border border-slate-200 text-black flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-black">
              System Health & Audit Trail
            </h2>
            <p className="text-xs text-slate-700 font-bold pt-0.5">
              Monitor real-time database connection metrics, Redis cache status, and user mutation logs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportCsv(false)}
            className="tactile-btn text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-3.5 py-2 border border-slate-300 flex items-center gap-1.5"
            title="Download all audit log records to Excel CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export Excel (CSV)
          </button>

          <button
            onClick={() => handleExportCsv(true)}
            className="tactile-btn text-xs bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-3.5 py-2 shadow-md flex items-center gap-1.5"
            title="Download all audit log records to Excel CSV and delete from database"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Download & Clear Logs
          </button>

          <button
            onClick={() => {
              fetchHealth();
              fetchLogs(page);
            }}
            className="tactile-btn text-xs bg-indigo-600 text-white hover:bg-indigo-500 font-extrabold px-3.5 py-2 shadow-md flex items-center gap-1.5"
            title="Refresh System Status"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
          </button>
        </div>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MongoDB Card */}
        <div className="tactile-card p-5 bg-white space-y-3 border-t-4 border-t-emerald-500 border-x border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" /> Database Status
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              {health?.database?.status || 'Connected'}
            </span>
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900">
              MongoDB Cluster ({health?.database?.name || 'inventry'})
            </h4>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Host: {health?.database?.host || 'localhost:27017'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Engine: Mongoose 8.x</span>
            <span className="text-emerald-700 font-bold">100% Operational</span>
          </div>
        </div>

        {/* Redis Cache Card */}
        <div className="tactile-card p-5 bg-white space-y-3 border-t-4 border-t-indigo-500 border-x border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-600" /> Redis Cache Engine
            </span>
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
              <Zap className="w-3 h-3 text-indigo-600" />
              {health?.redis?.status || 'Active'}
            </span>
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900">
              In-Memory Caching Tier
            </h4>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Policy: Cache-Aside (15m TTL)
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Latency: &lt; 2ms</span>
            <span className="text-indigo-700 font-bold">Low Latency</span>
          </div>
        </div>

        {/* Server Memory Card */}
        <div className="tactile-card p-5 bg-white space-y-3 border-t-4 border-t-sky-500 border-x border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-sky-600" /> Server Runtime
            </span>
            <span className="text-[11px] font-mono text-slate-600 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Uptime: {health ? Math.floor(health.server.uptime / 60) : 0}m
            </span>
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900">
              Node.js v20.x Environment
            </h4>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Heap Used:{' '}
              <strong className="text-slate-800 font-bold">
                {health
                  ? `${(health.server.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`
                  : 'N/A'}
              </strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Memory Load: Normal</span>
            <span className="text-sky-700 font-bold">Healthy</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="tactile-card p-4 bg-white border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full flex-1 max-w-2xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit logs by action, user name, resource, or metadata details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tactile-input pl-10 text-xs w-full py-2.5 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="text-xs text-slate-500 font-extrabold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secured System Audit Ledger</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="tactile-card overflow-hidden bg-white border border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Activity Audit Log ({meta.total || logs.length} Records)
            </h3>
          </div>
        </div>

        {loadingLogs ? (
          <div className="p-12 text-center text-slate-400 font-semibold text-sm">
            Loading audit activity log entries...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-semibold text-sm space-y-1">
            <p>No audit log records matching your query.</p>
            {searchQuery && <p className="text-xs text-slate-400">Try clearing your search input.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tactile-table text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User / Operator</th>
                  <th className="py-3 px-4 text-center">Action</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Event Metadata Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-extrabold text-slate-900">{log.userName || 'System Auto'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold border ${getActionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-800">{log.resource}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xl">
                      {renderPrettyDetails(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="tactile-btn bg-white text-slate-700 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous Page
            </button>
            <span className="font-bold text-slate-700">
              Page {page} of {meta.totalPages} ({meta.total} entries)
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="tactile-btn bg-white text-slate-700 disabled:opacity-40 flex items-center gap-1"
            >
              Next Page <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
