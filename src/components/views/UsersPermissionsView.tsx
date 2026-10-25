import React, { useState } from 'react';
import {
  Check,
  Eye,
  History,
  KeyRound,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../i18n/translations';
import { UserRole } from '../../types';

export const UsersPermissionsView: React.FC = () => {
  const { lang, t, currentUser, switchUserRole, auditLogs } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'audit_trail'>('users');

  // Role permissions definitions
  const permissionsMatrix = [
    { capability: 'পণ্য যোগ, সম্পাদনা ও আর্কাইভ (Manage Products)', admin: true, manager: true, salesperson: false, inventory: true, viewer: false },
    { capability: 'ক্রয় মূল্য ও মার্জিন প্রদর্শন (View Purchase Costs & Margins)', admin: true, manager: true, salesperson: false, inventory: false, viewer: false },
    { capability: 'কোটেশন তৈরি ও সংশোধন (Create & Edit Quotations)', admin: true, manager: true, salesperson: true, inventory: false, viewer: false },
    { capability: 'সেলস অর্ডার রূপান্তর ও পেমেন্ট গ্রহণ (Sales Orders & Payments)', admin: true, manager: true, salesperson: true, inventory: false, viewer: false },
    { capability: 'স্টক স্থানান্তর ও স্টক সমন্বয় (Stock Transfer & Adjustments)', admin: true, manager: true, salesperson: false, inventory: true, viewer: false },
    { capability: 'সাপ্লায়ার ও পরিবেশক ডাটাবেজ (Suppliers Management)', admin: true, manager: true, salesperson: false, inventory: true, viewer: false },
    { capability: 'সিস্টেম সেটিংস ও স্টোর প্রোফাইল (System Settings)', admin: true, manager: false, salesperson: false, inventory: false, viewer: false },
    { capability: 'ডেমো ডেটা রিসেট ও অডিট মুছে ফেলা (Data Wipe & Reset)', admin: true, manager: false, salesperson: false, inventory: false, viewer: false },
  ];

  const userList = [
    {
      uid: 'user_admin_01',
      name: 'Engr. Mahfuzur Rahman',
      email: 'service.itlabsolutions@gmail.com',
      role: 'admin' as UserRole,
      title: 'Business Owner & IT Director',
      status: 'Active',
    },
    {
      uid: 'user_mgr_01',
      name: 'Abdul Hannan',
      email: 'hannan.mgr@smartitpro.com.bd',
      role: 'manager' as UserRole,
      title: 'Operations & Branch Manager',
      status: 'Active',
    },
    {
      uid: 'user_sales_01',
      name: 'Md. Imran Hossain',
      email: 'imran.sales@smartitpro.com.bd',
      role: 'salesperson' as UserRole,
      title: 'Senior Sales Executive',
      status: 'Active',
    },
    {
      uid: 'user_inv_01',
      name: 'Saddam Hossain',
      email: 'saddam.stock@smartitpro.com.bd',
      role: 'inventory' as UserRole,
      title: 'Warehouse & Stock Officer',
      status: 'Active',
    },
    {
      uid: 'user_auditor_01',
      name: 'External Audit Officer',
      email: 'audit@itlabsolutions.com',
      role: 'viewer' as UserRole,
      title: 'Financial Auditor',
      status: 'Read Only',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.nav.users}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'bn'
              ? 'ভূমিকা-ভিত্তিক অ্যাক্সেস কন্ট্রোল (RBAC), কর্মী তালিকা এবং সিস্টেম অডিট ট্রেইল'
              : 'Role-based access control (RBAC), team accounts and security audit log'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'users' ? 'bg-blue-600 text-white shadow-xs' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>কর্মী তালিকা</span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'matrix' ? 'bg-blue-600 text-white shadow-xs' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>পারমিশন ম্যাট্রিক্স</span>
          </button>
          <button
            onClick={() => setActiveTab('audit_trail')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'audit_trail' ? 'bg-blue-600 text-white shadow-xs' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History className="h-4 w-4" />
            <span>অডিট লগ</span>
          </button>
        </div>
      </div>

      {/* Quick Role Simulator Notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-900">
                {lang === 'bn' ? 'সরাসরি রোল পরিবর্তন করে অ্যাপ্লিকেশন পরীক্ষা করুন:' : 'Switch Active Role (RBAC Simulator):'}
              </p>
              <p className="text-[11px] text-blue-700">
                {lang === 'bn'
                  ? `বর্তমান লগইন রোল: ${currentUser.role.toUpperCase()} (${currentUser.displayName})`
                  : `Currently operating as: ${currentUser.role.toUpperCase()}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['admin', 'manager', 'salesperson', 'inventory', 'viewer'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => switchUserRole(r)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition-colors ${
                  currentUser.role === r
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-blue-200 text-blue-800 hover:bg-blue-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab 1: User Accounts Table */}
      {activeTab === 'users' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">ব্যবহারকারী</th>
                <th className="px-4 py-3">ইমেইল</th>
                <th className="px-4 py-3">পদবী</th>
                <th className="px-4 py-3">সিস্টেম রোল</th>
                <th className="px-4 py-3 text-center">স্ট্যাটাস</th>
                <th className="px-4 py-3 text-center">সিমুলেশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userList.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                      {user.name.slice(0, 1)}
                    </div>
                    <span>{user.name}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{user.title}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-md bg-blue-50 text-blue-700 font-bold px-2 py-0.5 text-[10px] uppercase">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => switchUserRole(user.role)}
                      className="rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      লগইন করুন
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Permissions Matrix */}
      {activeTab === 'matrix' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {lang === 'bn' ? 'মডিউল ও পারমিশন ম্যাট্রিক্স (RBAC Rules)' : 'Module Access & Permissions Matrix'}
            </h3>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">সুবিধা ও অপারেশন (Capability)</th>
                <th className="px-4 py-3 text-center">অ্যাডমিন / মালিক</th>
                <th className="px-4 py-3 text-center">ম্যানেজার</th>
                <th className="px-4 py-3 text-center">সেলস এক্সিকিউটিভ</th>
                <th className="px-4 py-3 text-center">ইনভেন্টরি স্টাফ</th>
                <th className="px-4 py-3 text-center">ভিউয়ার (Audit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsMatrix.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.capability}</td>
                  <td className="px-4 py-3 text-center">{row.admin ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">✕</span>}</td>
                  <td className="px-4 py-3 text-center">{row.manager ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">✕</span>}</td>
                  <td className="px-4 py-3 text-center">{row.salesperson ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">✕</span>}</td>
                  <td className="px-4 py-3 text-center">{row.inventory ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">✕</span>}</td>
                  <td className="px-4 py-3 text-center">{row.viewer ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">✕</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Security & Activity Audit Trail */}
      {activeTab === 'audit_trail' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {lang === 'bn' ? 'সিস্টেম অ্যাকশন অডিট ট্রেইল' : 'System Activity Audit Log'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'bn' ? 'কোটেশন তৈরি, মূল্য পরিবর্তন, স্টক মুভমেন্ট ও পেমেন্টের প্রতিটি রেকর্ড' : 'Track who created quotes, modified prices, moved stock, or adjusted balances'}
            </p>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">{t.common.date}</th>
                <th className="px-4 py-3">অ্যাকশন</th>
                <th className="px-4 py-3">মডিউল / এনটিটি</th>
                <th className="px-4 py-3">বিবরণ</th>
                <th className="px-4 py-3">সম্পাদনাকারী</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-slate-500">{formatDate(log.createdAt, lang)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{log.action}</td>
                  <td className="px-4 py-3 text-slate-600">{log.entity}</td>
                  <td className="px-4 py-3 text-slate-800">{log.details}</td>
                  <td className="px-4 py-3 font-medium text-slate-600">{log.performedByName}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                    কোনো অডিট রেকর্ড নেই
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
