import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileSpreadsheet,
  PieChart,
  Printer,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../i18n/translations';

export const ReportsView: React.FC = () => {
  const { lang, t, orders, quotations, products, followups, customers, canViewCost } = useApp();

  const [dateRange, setDateRange] = useState<'all' | 'this_month' | 'this_year'>('all');

  // Compute live analytical totals
  const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalDue = orders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);

  // Stock valuation: Retail price vs Wholesale purchase cost
  const totalUnits = products.reduce((sum, p) => sum + (p.totalStock || 0), 0);
  const retailStockValuation = products.reduce((sum, p) => sum + (p.totalStock || 0) * p.sellingPrice, 0);
  const purchaseCostValuation = products.reduce((sum, p) => sum + (p.totalStock || 0) * p.purchaseCost, 0);
  const potentialInventoryMargin = retailStockValuation - purchaseCostValuation;

  // Quotation metrics
  const totalQuotes = quotations.length;
  const acceptedQuotes = quotations.filter((q) => q.status === 'accepted' || q.status === 'ordered').length;
  const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

  // Salesperson breakdown
  const salesByEmployee = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      const name = o.salespersonName || 'Unassigned';
      if (!map[name]) map[name] = { count: 0, revenue: 0 };
      map[name].count += 1;
      map[name].revenue += o.totalAmount;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [orders]);

  // Lost deals analysis
  const lostDeals = followups.filter((f) => f.status === 'lost');
  const lostReasonsBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    lostDeals.forEach((d) => {
      const reason = d.lostReason || 'Unknown reason';
      map[reason] = (map[reason] || 0) + 1;
    });
    return Object.entries(map).map(([reason, count]) => ({ reason, count }));
  }, [lostDeals]);

  // Export report to CSV
  const handleExportReportCSV = () => {
    const rows = [
      ['Metric', 'Value in BDT / Count'],
      ['Total Sales Revenue', totalSales],
      ['Total Collected Amount', totalPaid],
      ['Total Outstanding Due', totalDue],
      ['Total Stock Units', totalUnits],
      ['Retail Stock Valuation', retailStockValuation],
      canViewCost ? ['Wholesale Purchase Valuation', purchaseCostValuation] : [],
      ['Quotation Conversion Rate', `${conversionRate}%`],
      ['Total Quotations Created', totalQuotes],
      ['Accepted / Converted Quotes', acceptedQuotes],
    ].filter((r) => r.length > 0);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `smartit_analytics_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.reports.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.reports.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            <span>{t.common.print}</span>
          </button>
          <button
            onClick={handleExportReportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>{t.common.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">{t.reports.salesSummary}</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatBDT(totalSales, lang)}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">{formatBDT(totalPaid, lang)} collected</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">{t.reports.conversionRate}</span>
          <p className="text-xl font-black text-blue-600 mt-1">{conversionRate}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{acceptedQuotes} of {totalQuotes} quotes</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">{t.reports.stockValuation} (Retail)</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatBDT(retailStockValuation, lang)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{totalUnits} hardware units</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">বকেয়া পাওনা (Due Balance)</span>
          <p className="text-xl font-black text-rose-600 mt-1">{formatBDT(totalDue, lang)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">from confirmed sales orders</p>
        </div>
      </div>

      {/* Confidential Profit & Valuation (Authorized only for Admin/Manager) */}
      {canViewCost ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-emerald-700" />
            <h3 className="text-sm font-bold text-emerald-950">
              {t.reports.profitMargin}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg bg-white p-3.5 border border-emerald-200 shadow-2xs">
              <span className="text-slate-500 block">ইনভেন্টরি ক্রয়মূল্য মূল্যায়ন (Cost):</span>
              <span className="text-base font-bold text-slate-900 block mt-1">
                {formatBDT(purchaseCostValuation, lang)}
              </span>
            </div>
            <div className="rounded-lg bg-white p-3.5 border border-emerald-200 shadow-2xs">
              <span className="text-slate-500 block">ইনভেন্টরি সম্ভাব্য বিক্রয়মূল্য (Retail):</span>
              <span className="text-base font-bold text-slate-900 block mt-1">
                {formatBDT(retailStockValuation, lang)}
              </span>
            </div>
            <div className="rounded-lg bg-white p-3.5 border border-emerald-200 shadow-2xs">
              <span className="text-slate-500 block">সম্ভাব্য মোট গ্রস লাভ (Gross Profit):</span>
              <span className="text-base font-black text-emerald-700 block mt-1">
                {formatBDT(potentialInventoryMargin, lang)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-400" />
          <span>ক্রয়মূল্য ও মার্জিন সংক্রান্ত গোপনীয় রিপোর্ট শুধুমাত্র অ্যাডমিন ও ম্যানেজারদের জন্য সংরক্ষিত।</span>
        </div>
      )}

      {/* Sales by Employee & Lost Deals Reasons Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Salesperson Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.reports.salespersonReport}
            </h3>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">কর্মীর নাম</th>
                <th className="px-4 py-3 text-center">অর্ডার সংখ্যা</th>
                <th className="px-4 py-3 text-right">মোট বিক্রয় (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesByEmployee.map((emp, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-800">{emp.name}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{emp.count}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{formatBDT(emp.revenue, lang)}</td>
                </tr>
              ))}
              {salesByEmployee.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-xs text-slate-400">
                    {t.common.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lost Deals Reasons Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.reports.lostDealReasons}
            </h3>
          </div>

          <div className="p-4 space-y-3 text-xs">
            {lostReasonsBreakdown.map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>{item.reason}</span>
                  <span className="font-bold text-slate-900">{item.count} deals</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${Math.min(100, (item.count / Math.max(1, lostDeals.length)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {lostReasonsBreakdown.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">কোনো বাতিল ডিল নেই</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
