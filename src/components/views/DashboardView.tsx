import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  FileText,
  Package,
  Plus,
  Radio,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { LowStockAlertCard } from '../dashboard/LowStockAlertCard';
import { MarketIntelligenceCard } from '../dashboard/MarketIntelligenceCard';
import { MetricCard } from '../dashboard/MetricCard';
import { TodayQuotationsCard } from '../dashboard/TodayQuotationsCard';
import { useApp } from '../../context/AppContext';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { formatBDT, formatDate } from '../../i18n/translations';

export const DashboardView: React.FC = () => {
  const {
    lang,
    t,
    setActiveTab,
    setTargetQuoteId,
    canViewCost,
  } = useApp();

  // Core real-time Firestore data-fetching hook
  const {
    totalActiveProducts,
    totalStockUnits,
    lowStockCount,
    lowStockProducts,
    outOfStockCount,
    outOfStockProducts,
    todayQuotationsCount,
    todayQuotations,
    todaySalesAmount,
    monthSalesAmount,
    totalPaidAmount,
    totalOutstandingDue,
    pendingFollowupsCount,
    confirmedOrdersCount,
    conversionRate,
    recentQuotations,
    upcomingFollowups,
    topProducts,
    isLoading,
    isRealtime,
    refetch,
  } = useDashboardMetrics();

  return (
    <div className="space-y-6">
      {/* Top Header: Title, Live Firestore Badge, & Quick Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
              {t.dashboard.title}
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                isRealtime
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isRealtime ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
              <span>{isRealtime ? 'Firestore Live' : 'Synced'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 shadow-xs"
            title="Refresh database state"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setActiveTab('quotations')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t.dashboard.newQuotation}</span>
          </button>
          <button
            onClick={() => setActiveTab('pcBuilder')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Cpu className="h-4 w-4 text-blue-600" />
            <span>{t.dashboard.newPCBuild}</span>
          </button>
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {/* 1. Total Active Products */}
        <MetricCard
          title={t.dashboard.activeProducts}
          value={totalActiveProducts}
          subtitle={`${totalStockUnits.toLocaleString('en-BD')} ${lang === 'bn' ? 'ইউনিট মজুদ' : 'units in stock'}`}
          subBadge={{
            text: outOfStockCount > 0 ? `${outOfStockCount} Out` : 'Available',
            type: outOfStockCount > 0 ? 'warning' : 'success',
          }}
          icon={Package}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => setActiveTab('products')}
          isLoading={isLoading}
        />

        {/* 2. Low-Stock Items */}
        <MetricCard
          title={t.dashboard.lowStockAlerts}
          value={lowStockCount}
          subtitle={
            outOfStockCount > 0
              ? `${outOfStockCount} ${lang === 'bn' ? 'টি শেষ' : 'out of stock'}`
              : lang === 'bn' ? 'রিঅর্ডার প্রয়োজন' : 'Needs reorder'
          }
          subBadge={{
            text: lowStockCount > 0 ? 'Urgent' : 'Healthy',
            type: lowStockCount > 0 ? 'danger' : 'success',
          }}
          icon={AlertTriangle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-700"
          onClick={() => setActiveTab('inventory')}
          isLoading={isLoading}
        />

        {/* 3. Today's Quotations */}
        <MetricCard
          title={t.dashboard.todayQuotes}
          value={todayQuotationsCount}
          subtitle={`${conversionRate}% ${lang === 'bn' ? 'কনভার্সন রেট' : 'conversion'}`}
          subBadge={{
            text: todayQuotationsCount > 0 ? 'Active' : 'No quotes',
            type: todayQuotationsCount > 0 ? 'info' : 'warning',
          }}
          icon={FileText}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
          onClick={() => setActiveTab('quotations')}
          isLoading={isLoading}
        />

        {/* 4. Total Sales & Revenue */}
        <MetricCard
          title={t.dashboard.monthSales}
          value={formatBDT(monthSalesAmount, lang)}
          subtitle={`${formatBDT(totalPaidAmount, lang)} ${lang === 'bn' ? 'পরিশোধিত' : 'collected'}`}
          subBadge={{
            text: confirmedOrdersCount > 0 ? `${confirmedOrdersCount} Orders` : '0 Orders',
            type: 'success',
          }}
          icon={DollarSign}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => setActiveTab('salesOrders')}
          isLoading={isLoading}
        />
      </div>

      {/* Google Search Grounded Market Intelligence Banner */}
      <MarketIntelligenceCard lang={lang} />

      {/* Two Essential Real-Time UI Cards: Low Stock Alert Card & Today's Quotations Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Low-Stock Alerts Card */}
        <LowStockAlertCard
          lowStockCount={lowStockCount}
          outOfStockCount={outOfStockCount}
          lowStockProducts={lowStockProducts}
          outOfStockProducts={outOfStockProducts}
          lang={lang}
          onViewInventory={() => setActiveTab('inventory')}
          isLoading={isLoading}
        />

        {/* Real-time Today's Quotations Card */}
        <TodayQuotationsCard
          todayQuotationsCount={todayQuotationsCount}
          todayQuotations={todayQuotations}
          lang={lang}
          onCreateQuotation={() => setActiveTab('quotations')}
          onSelectQuotation={(id) => {
            setTargetQuoteId(id);
            setActiveTab('quotations');
          }}
          onViewAllQuotations={() => setActiveTab('quotations')}
          isLoading={isLoading}
        />
      </div>

      {/* Bottom Section: Recent Quotations & Upcoming Follow-up Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Quotations Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {t.dashboard.recentQuotations}
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('quotations')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              <span>{lang === 'bn' ? 'সকল দেখুন' : 'View All'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">{t.quotations.quoteNo}</th>
                  <th className="px-4 py-2.5">{t.quotations.customer}</th>
                  <th className="px-4 py-2.5 text-right">{t.quotations.grandTotal}</th>
                  <th className="px-4 py-2.5 text-center">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentQuotations.map((quote) => (
                  <tr
                    key={quote.id}
                    onClick={() => {
                      setTargetQuoteId(quote.id);
                      setActiveTab('quotations');
                    }}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-blue-600 font-mono">
                      {quote.quoteNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{quote.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{quote.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatBDT(quote.grandTotal, lang)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          quote.status === 'accepted' || quote.status === 'ordered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : quote.status === 'sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.quotations.statuses[quote.status] || quote.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentQuotations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                      {t.common.noData}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Follow-up Tasks */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {t.dashboard.upcomingFollowups}
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('followUps')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              <span>{lang === 'bn' ? 'পাইপলাইন দেখুন' : 'View Pipeline'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 p-2">
            {upcomingFollowups.map((task) => (
              <div
                key={task.id}
                onClick={() => setActiveTab('followUps')}
                className="flex items-start justify-between rounded-lg p-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">{task.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {task.customerName} • {task.customerPhone}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 italic line-clamp-1">
                    "{task.notes}"
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      task.priority === 'high'
                        ? 'bg-rose-100 text-rose-700'
                        : task.priority === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.priority.toUpperCase()}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {formatDate(task.dueDate, lang)}
                  </div>
                </div>
              </div>
            ))}
            {upcomingFollowups.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">{t.common.noData}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
