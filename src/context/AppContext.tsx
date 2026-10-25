import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { translations, Language } from '../i18n/translations';
import { dbService } from '../services/db';
import {
  AuditLog,
  CompanySettings,
  Customer,
  FollowUpTask,
  Product,
  Quotation,
  SalesOrder,
  StockLocation,
  StockMovement,
  Supplier,
  UserProfile,
  UserRole,
} from '../types';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'importer'
  | 'categories'
  | 'inventory'
  | 'suppliers'
  | 'pcBuilder'
  | 'quotations'
  | 'customers'
  | 'salesOrders'
  | 'followUps'
  | 'reports'
  | 'users'
  | 'settings';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.bn;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: UserProfile;
  switchUserRole: (role: UserRole) => void;
  products: Product[];
  customers: Customer[];
  quotations: Quotation[];
  orders: SalesOrder[];
  followups: FollowUpTask[];
  locations: StockLocation[];
  suppliers: Supplier[];
  settings: CompanySettings;
  auditLogs: AuditLog[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refreshData: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
  // Permissions
  canViewCost: boolean;
  canManageSettings: boolean;
  canManageInventory: boolean;
  canCreateQuotations: boolean;
  // Preselected item for cross-module actions
  targetQuoteId: string | null;
  setTargetQuoteId: (id: string | null) => void;
  targetCustomerId: string | null;
  setTargetCustomerId: (id: string | null) => void;
  prefilledPCBuildQuote: any | null;
  setPrefilledPCBuildQuote: (data: any | null) => void;
  // Firebase Auth
  firebaseUser: FirebaseUser | null;
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('smartit_lang') as Language) || 'bn';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('smartit_lang', newLang);
  };

  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Current active user with role-based access
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    uid: 'user_admin_01',
    email: 'service.itlabsolutions@gmail.com',
    displayName: 'Engr. Mahfuzur Rahman (Owner)',
    role: 'admin',
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const email = fbUser.email?.toLowerCase() || '';
        const isAdmin = email === 'service.itlabsolutions@gmail.com' || email.includes('admin');
        setCurrentUser({
          uid: fbUser.uid,
          email: fbUser.email || 'user@smartit.com.bd',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Authorized User',
          role: isAdmin ? 'admin' : 'salesperson',
          photoURL: fbUser.photoURL || undefined,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      showToast(
        lang === 'bn'
          ? `${result.user.displayName || result.user.email} হিসেবে সফলভাবে লগইন হয়েছে`
          : `Signed in as ${result.user.displayName || result.user.email}`,
        'success'
      );
    } catch (err: any) {
      showToast('Google Sign-In failed: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setCurrentUser({
        uid: 'user_admin_01',
        email: 'service.itlabsolutions@gmail.com',
        displayName: 'Engr. Mahfuzur Rahman (Owner)',
        role: 'admin',
      });
      showToast(lang === 'bn' ? 'লগআউট সফল হয়েছে' : 'Signed out successfully', 'info');
    } catch (err: any) {
      showToast('Sign-out failed: ' + err.message, 'error');
    }
  };

  const switchUserRole = (role: UserRole) => {
    const roleNames: Record<UserRole, string> = {
      admin: 'Engr. Mahfuzur Rahman (Owner/Admin)',
      manager: 'Abdul Hannan (Operations Manager)',
      salesperson: 'Md. Imran Hossain (Sales Executive)',
      inventory: 'Saddam Hossain (Stock Keeper)',
      viewer: 'Guest Audit Auditor (Read-Only)',
    };
    setCurrentUser((prev) => ({
      ...prev,
      role,
      displayName: roleNames[role],
    }));
    showToast(`Switched active role to: ${role.toUpperCase()}`, 'info');
  };

  // Domain data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [followups, setFollowups] = useState<FollowUpTask[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<CompanySettings>({} as CompanySettings);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Cross-module states
  const [targetQuoteId, setTargetQuoteId] = useState<string | null>(null);
  const [targetCustomerId, setTargetCustomerId] = useState<string | null>(null);
  const [prefilledPCBuildQuote, setPrefilledPCBuildQuote] = useState<any | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshData = async () => {
    try {
      const [p, c, q, o, f, l, s, setts] = await Promise.all([
        dbService.getProducts(),
        dbService.getCustomers(),
        dbService.getQuotations(),
        dbService.getOrders(),
        dbService.getFollowUps(),
        dbService.getLocations(),
        dbService.getSuppliers(),
        dbService.getSettings(),
      ]);
      setProducts(p);
      setCustomers(c);
      setQuotations(q);
      setOrders(o);
      setFollowups(f);
      setLocations(l);
      setSuppliers(s);
      setSettings(setts);
      setAuditLogs(dbService.getAuditLogs());
    } catch (e) {
      console.error('Failed to refresh data', e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Permissions
  const canViewCost = currentUser.role === 'admin' || currentUser.role === 'manager';
  const canManageSettings = currentUser.role === 'admin';
  const canManageInventory = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'inventory';
  const canCreateQuotations = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'salesperson';

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        activeTab,
        setActiveTab,
        currentUser,
        switchUserRole,
        products,
        customers,
        quotations,
        orders,
        followups,
        locations,
        suppliers,
        settings,
        auditLogs,
        searchQuery,
        setSearchQuery,
        refreshData,
        showToast,
        toasts,
        removeToast,
        canViewCost,
        canManageSettings,
        canManageInventory,
        canCreateQuotations,
        targetQuoteId,
        setTargetQuoteId,
        targetCustomerId,
        setTargetCustomerId,
        prefilledPCBuildQuote,
        setPrefilledPCBuildQuote,
        firebaseUser,
        loginWithGoogle,
        logoutUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
