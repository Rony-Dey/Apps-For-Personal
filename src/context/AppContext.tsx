import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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
  // Firebase Auth & Cloud Sync
  firebaseUser: FirebaseUser | null;
  isAuthChecking: boolean;
  isEmailVerificationPending: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: () => Promise<void>;
  checkEmailVerified: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
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

  // Auth States
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Active User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    uid: 'user_admin_01',
    email: 'service.itlabsolutions@gmail.com',
    displayName: 'Engr. Mahfuzur Rahman (Owner)',
    role: 'admin',
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setIsAuthChecking(false);

      if (fbUser) {
        const isGoogle = fbUser.providerData.some((p) => p.providerId === 'google.com');
        const isVerified = fbUser.emailVerified || isGoogle;

        if (!isVerified) {
          setIsEmailVerificationPending(true);
        } else {
          setIsEmailVerificationPending(false);
          setIsDemoMode(false);
        }

        const email = fbUser.email?.toLowerCase() || '';
        const isAdmin = email === 'service.itlabsolutions@gmail.com' || email.includes('admin');
        setCurrentUser({
          uid: fbUser.uid,
          email: fbUser.email || 'user@smartit.com.bd',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Authorized User',
          role: isAdmin ? 'admin' : 'salesperson',
          photoURL: fbUser.photoURL || undefined,
        });

        // Online Multi-Device Sync: Seed cloud if needed and load fresh data from Firestore
        await dbService.syncAllCloudData();
        await refreshData();
      } else {
        setIsEmailVerificationPending(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const isGoogle = cred.user.providerData.some((p) => p.providerId === 'google.com');
      
      if (!cred.user.emailVerified && !isGoogle) {
        setIsEmailVerificationPending(true);
        showToast(
          lang === 'bn'
            ? 'আপনার ইমেইল এখনও ভেরিফাই করা হয়নি। অনুগ্রহ করে ইনবক্স চেক করে লিংকে ক্লিক করুন।'
            : 'Email not verified yet. Please check your inbox and click the verification link.',
          'error'
        );
        return { success: false, needsVerification: true };
      }

      setIsEmailVerificationPending(false);
      setIsDemoMode(false);
      setShowAuthModal(false);
      showToast(
        lang === 'bn'
          ? `${cred.user.displayName || cred.user.email} হিসেবে সফলভাবে লগইন হয়েছে`
          : `Signed in as ${cred.user.displayName || cred.user.email}`,
        'success'
      );
      await dbService.syncAllCloudData();
      await refreshData();
      return { success: true };
    } catch (err: any) {
      let msg = err.message || 'Login failed';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        msg = lang === 'bn' ? 'ভুল ইমেইল অথবা পাসওয়ার্ড।' : 'Invalid email or password.';
      } else if (err.code === 'auth/too-many-requests') {
        msg =
          lang === 'bn'
            ? 'অতিরিক্ত চেষ্টার কারণে অ্যাকাউন্ট সাময়িক ব্লক হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।'
            : 'Too many attempts. Please try again later.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg =
          lang === 'bn'
            ? 'Firebase Console-এ Email/Password সক্রিয় করতে হবে। অথবা Google দিয়ে সরাসরি ১-ক্লিকে লগইন করুন।'
            : 'Email/Password provider must be enabled in Firebase console, or use Google Sign-in.';
      }
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user);
      setIsEmailVerificationPending(true);
      showToast(
        lang === 'bn'
          ? `ভেরিফিকেশন ইমেইল পাঠানো হয়েছে ${email} ঠিকানায়। অনুগ্রহ করে চেক করুন।`
          : `Verification email sent to ${email}. Please check your inbox.`,
        'success'
      );
      return { success: true };
    } catch (err: any) {
      let msg = err.message || 'Registration failed';
      if (err.code === 'auth/email-already-in-use') {
        msg = lang === 'bn' ? 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে।' : 'Email already in use.';
      } else if (err.code === 'auth/weak-password') {
        msg = lang === 'bn' ? 'পাসওয়ার্ডটি খুব দুর্বল (কমপক্ষে ৬ অক্ষর প্রয়োজন)।' : 'Password is too weak (min 6 chars).';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg =
          lang === 'bn'
            ? 'Firebase Console-এ Email/Password প্রদানকারী চালু করতে হবে। বা Google দিয়ে লগইন করুন।'
            : 'Email/Password auth must be enabled in Firebase console, or use Google Sign-In.';
      }
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      showToast(
        lang === 'bn' ? 'নতুন ভেরিফিকেশন ইমেইল পাঠানো হয়েছে!' : 'New verification email sent!',
        'success'
      );
    }
  };

  const checkEmailVerified = async () => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      setIsEmailVerificationPending(false);
      setShowAuthModal(false);
      setIsDemoMode(false);
      await dbService.syncAllCloudData();
      await refreshData();
      return true;
    }
    return false;
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showToast(
        lang === 'bn' ? 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।' : 'Password reset link sent to your email.',
        'success'
      );
      return { success: true };
    } catch (err: any) {
      let msg = err.message || 'Failed to send reset link';
      if (err.code === 'auth/user-not-found') {
        msg = lang === 'bn' ? 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।' : 'No account found with this email.';
      }
      return { success: false, error: msg };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setIsEmailVerificationPending(false);
      setShowAuthModal(false);
      setIsDemoMode(false);
      showToast(
        lang === 'bn'
          ? `${result.user.displayName || result.user.email} হিসেবে সফলভাবে লগইন হয়েছে`
          : `Signed in as ${result.user.displayName || result.user.email}`,
        'success'
      );
      await dbService.syncAllCloudData();
      await refreshData();
    } catch (err: any) {
      showToast('Google Sign-In failed: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setIsEmailVerificationPending(false);
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
        isAuthChecking,
        isEmailVerificationPending,
        showAuthModal,
        setShowAuthModal,
        isDemoMode,
        setIsDemoMode,
        loginWithEmail,
        registerWithEmail,
        resendVerificationEmail,
        checkEmailVerified,
        resetPassword,
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
