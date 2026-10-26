import React, { useState } from 'react';
import {
  Bell,
  Globe,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const {
    lang,
    setLang,
    t,
    currentUser,
    switchUserRole,
    firebaseUser,
    loginWithGoogle,
    logoutUser,
    searchQuery,
    setSearchQuery,
    setActiveTab,
    followups,
    products,
    settings,
    setShowAuthModal,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Compute pending notifications
  const lowStockCount = products.filter((p) => p.totalStock <= p.reorderLevel).length;
  const pendingFollowupsCount = followups.filter((f) => f.status === 'due').length;
  const totalNotifications = lowStockCount + pendingFollowupsCount;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6">
      {/* Left: Mobile hamburger, Company Logo & Global Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          title="Toggle Sidebar"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Company Logo in Header */}
        {settings?.logoUrl && (
          <div className="hidden sm:flex items-center pr-3 border-r border-slate-200">
            <img
              src={settings.logoUrl}
              alt={settings.companyName || 'Company Logo'}
              className="h-8 max-h-8 max-w-[130px] object-contain rounded"
            />
          </div>
        )}

        <div className="relative w-48 sm:w-64 md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'bn' ? 'পণ্য, কোটেশন, গ্রাহক খুঁজুন...' : 'Search products, quotes, clients...'}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right: Quick actions, Language toggle, Notification, Role badge & User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Add Button */}
        <button
          onClick={() => setActiveTab('quotations')}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{lang === 'bn' ? 'কোটেশন' : 'New Quote'}</span>
        </button>

        {/* Language switch */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            onClick={() => setLang('bn')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
              lang === 'bn' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>বাংলা</span>
          </button>
          <button
            onClick={() => setLang('en')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
              lang === 'en' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>EN</span>
          </button>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {totalNotifications > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {totalNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-sm text-slate-800">
                  {lang === 'bn' ? 'সতর্কতা ও নোটিফিকেশন' : 'Notifications'}
                </span>
                <span className="text-xs text-slate-500">{totalNotifications} new</span>
              </div>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {lowStockCount > 0 && (
                  <div
                    onClick={() => {
                      setActiveTab('inventory');
                      setShowNotifications(false);
                    }}
                    className="cursor-pointer rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    <p className="font-semibold">⚠️ {lowStockCount} {lang === 'bn' ? 'টি পণ্যের স্টক শেষ পর্যায়ে' : 'Low Stock Items'}</p>
                    <p className="text-amber-700">{lang === 'bn' ? 'পুনরায় অর্ডার করতে ইনভেন্টরি দেখুন।' : 'Click to inspect inventory.'}</p>
                  </div>
                )}
                {pendingFollowupsCount > 0 && (
                  <div
                    onClick={() => {
                      setActiveTab('followUps');
                      setShowNotifications(false);
                    }}
                    className="cursor-pointer rounded-lg bg-blue-50 p-2.5 text-xs text-blue-800 hover:bg-blue-100 transition-colors"
                  >
                    <p className="font-semibold">📞 {pendingFollowupsCount} {lang === 'bn' ? 'টি ফলো-আপ কল বকেয়া' : 'Follow-up Calls Due'}</p>
                    <p className="text-blue-700">{lang === 'bn' ? 'সেলস পাইপলাইন চেক করুন।' : 'Review sales follow-up tasks.'}</p>
                  </div>
                )}
                {totalNotifications === 0 && (
                  <p className="py-4 text-center text-xs text-slate-400">
                    {lang === 'bn' ? 'কোনো নতুন নোটিফিকেশন নেই' : 'No new notifications'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sign In button if unauthenticated */}
        {!firebaseUser && (
          <button
            onClick={() => setShowAuthModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'লগইন / রেজিস্টার' : 'Sign In / Register'}</span>
          </button>
        )}

        {/* Role Switcher & User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <div className="text-left hidden md:block">
              <span className="font-semibold block leading-tight text-slate-800">
                {currentUser.role.toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                {currentUser.displayName}
              </span>
            </div>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50">
              <div className="border-b border-slate-100 pb-2.5 mb-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser.displayName}</p>
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${firebaseUser ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${firebaseUser ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {firebaseUser ? (firebaseUser.emailVerified ? 'Cloud (Verified)' : 'Cloud (Unverified)') : 'Demo Mode'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>

                {/* Account Sign-in / Sign-out Actions */}
                <div className="mt-2.5 space-y-1.5">
                  {firebaseUser ? (
                    <button
                      onClick={() => {
                        logoutUser();
                        setShowRoleMenu(false);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{lang === 'bn' ? 'লগআউট করুন' : 'Sign Out'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowAuthModal(true);
                        setShowRoleMenu(false);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      <span>{lang === 'bn' ? 'ইমেইল বা গুগল দিয়ে লগইন' : 'Sign In with Email or Google'}</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {lang === 'bn' ? 'ভূমিকা / রোল পরিবর্তন (টেস্টিং):' : 'Switch Role (Test Permissions):'}
              </p>
              <div className="space-y-1">
                {(['admin', 'manager', 'salesperson', 'inventory', 'viewer'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchUserRole(r);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left transition-colors ${
                      currentUser.role === r
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{t.roles[r]}</span>
                    {currentUser.role === r && <span className="text-blue-600">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
