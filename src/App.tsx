import React, { useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { CategoriesBrandsView } from './components/views/CategoriesBrandsView';
import { CustomersView } from './components/views/CustomersView';
import { DashboardView } from './components/views/DashboardView';
import { FollowUpsView } from './components/views/FollowUpsView';
import { InventoryView } from './components/views/InventoryView';
import { PCBuilderView } from './components/views/PCBuilderView';
import { ProductImporterView } from './components/views/ProductImporterView';
import { ProductsView } from './components/views/ProductsView';
import { QuotationsView } from './components/views/QuotationsView';
import { ReportsView } from './components/views/ReportsView';
import { SalesOrdersView } from './components/views/SalesOrdersView';
import { SettingsView } from './components/views/SettingsView';
import { SuppliersView } from './components/views/SuppliersView';
import { UsersPermissionsView } from './components/views/UsersPermissionsView';
import { AuthModal } from './components/auth/AuthModal';
import { AppProvider, useApp } from './context/AppContext';
import { testFirestoreConnection } from './lib/firebase';
import { AlertCircle, Cloud, Cpu, Loader2, LogIn, ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    lang,
    activeTab,
    toasts,
    removeToast,
    firebaseUser,
    isAuthChecking,
    isEmailVerificationPending,
    showAuthModal,
    setShowAuthModal,
    isDemoMode,
    setIsDemoMode,
  } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Connection test on boot (Firebase integration requirement)
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      console.log('SmartIT Pro initialized. Firestore status:', connected ? 'Connected' : 'Local Fallback');
    });
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'products':
        return <ProductsView />;
      case 'importer':
        return <ProductImporterView />;
      case 'categories':
        return <CategoriesBrandsView />;
      case 'inventory':
        return <InventoryView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'pcBuilder':
        return <PCBuilderView />;
      case 'quotations':
        return <QuotationsView />;
      case 'customers':
        return <CustomersView />;
      case 'salesOrders':
        return <SalesOrdersView />;
      case 'followUps':
        return <FollowUpsView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UsersPermissionsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  if (isAuthChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white flex-col gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/20">
          <Cpu className="h-7 w-7 text-white" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>{lang === 'bn' ? 'ক্লাউড সিস্টেম লোড হচ্ছে...' : 'Initializing Cloud CRM...'}</span>
        </div>
      </div>
    );
  }

  // If user is not logged in and hasn't chosen guest demo preview, show mandatory Auth Gate
  const needsAuthGate = !firebaseUser && !isDemoMode;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-900 flex-col">
      {/* Demo Warning Banner if operating unauthenticated */}
      {isDemoMode && !firebaseUser && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-between shrink-0 shadow-xs z-50">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {lang === 'bn'
                ? '⚠️ ডেমো মোড সক্রিয়: সকল ডিভাইসে একযোগে ডাটা সিঙ্ক করতে ইমেইল ভেরিফিকেশন সহ লগইন করুন।'
                : '⚠️ Demo Mode Active: Sign in with email verification to sync your live data across all devices.'}
            </span>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="ml-3 shrink-0 rounded bg-slate-950 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-slate-800 transition-colors"
          >
            {lang === 'bn' ? 'এখনই লগইন করুন' : 'Sign In Now'}
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onCloseMobile={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Navbar Header */}
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

          {/* Scrollable Page Body */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {renderActiveView()}
            </div>
          </main>
        </div>
      </div>

      {/* Auth Modal / Gate */}
      {(needsAuthGate || showAuthModal || (firebaseUser && isEmailVerificationPending)) && (
        <AuthModal
          isOpen={true}
          onClose={() => {
            if (needsAuthGate) {
              setIsDemoMode(true);
            }
            setShowAuthModal(false);
          }}
          allowGuestPreview={true}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between rounded-xl px-4 py-3 shadow-lg text-xs font-medium transition-all ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : toast.type === 'info'
                ? 'bg-slate-900 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
