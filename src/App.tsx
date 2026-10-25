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
import { AppProvider, useApp } from './context/AppContext';
import { testFirestoreConnection } from './lib/firebase';

const AppContent: React.FC = () => {
  const { activeTab, toasts, removeToast } = useApp();
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-900">
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
