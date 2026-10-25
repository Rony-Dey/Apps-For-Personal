import React from 'react';
import {
  BarChart3,
  Boxes,
  Cpu,
  DownloadCloud,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Headphones,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import { NavTab, useApp } from '../../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { lang, t, activeTab, setActiveTab, products, followups, quotations } = useApp();

  const lowStockCount = products.filter((p) => p.totalStock <= p.reorderLevel).length;
  const pendingFollowups = followups.filter((f) => f.status === 'due').length;
  const activeQuotesCount = quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length;

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'products', label: t.nav.products, icon: Package },
    { id: 'importer', label: t.nav.importer, icon: DownloadCloud },
    { id: 'categories', label: t.nav.categories, icon: FolderKanban },
    { id: 'inventory', label: t.nav.inventory, icon: Boxes, badge: lowStockCount, badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'suppliers', label: t.nav.suppliers, icon: Truck },
    { id: 'pcBuilder', label: t.nav.pcBuilder, icon: Cpu },
    { id: 'quotations', label: t.nav.quotations, icon: FileText, badge: activeQuotesCount, badgeColor: 'bg-blue-100 text-blue-800' },
    { id: 'customers', label: t.nav.customers, icon: Users },
    { id: 'salesOrders', label: t.nav.salesOrders, icon: ShoppingBag },
    { id: 'followUps', label: t.nav.followUps, icon: Headphones, badge: pendingFollowups, badgeColor: 'bg-rose-100 text-rose-800' },
    { id: 'reports', label: t.nav.reports, icon: BarChart3 },
    { id: 'users', label: t.nav.users, icon: ShieldCheck },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
            <Cpu className="h-6 w-6" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
              SmartIT <span className="text-blue-600">Pro</span>
            </h1>
            <p className="text-[11px] text-slate-500 truncate mt-1">
              {lang === 'bn' ? 'কম্পিউটার ও আইটি সিআরএম' : 'Hardware & IT CRM'}
            </p>
          </div>
        </div>

        {/* Scrollable Navigation List */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {lang === 'bn' ? 'প্রধান মেনু' : 'Main Menu'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobile();
                }}
                className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.badgeColor || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Location info & Version */}
        <div className="border-t border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sylhet & Dhaka Hub</span>
            </span>
            <span className="font-mono text-slate-400">v2.5 BD</span>
          </div>
        </div>
      </aside>
    </>
  );
};
