import React, { useState } from 'react';
import {
  Building2,
  CreditCard,
  Edit,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Truck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { dbService } from '../../services/db';
import { Supplier } from '../../types';

export const SuppliersView: React.FC = () => {
  const { lang, t, suppliers, products, refreshData, showToast, currentUser } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: '15 Days Credit',
    brandsSupplied: 'Intel, MSI, Corsair',
    notes: '',
  });

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      await dbService.addSupplier(
        {
          name: formData.name,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          paymentTerms: formData.paymentTerms,
          brandsSupplied: formData.brandsSupplied.split(',').map((b) => b.trim()),
          notes: formData.notes,
        },
        { uid: currentUser.uid, name: currentUser.displayName }
      );
      showToast(lang === 'bn' ? 'সাপ্লায়ার যুক্ত করা হয়েছে' : 'Supplier added successfully');
      setIsModalOpen(false);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add supplier', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.nav.suppliers}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'bn'
              ? 'আইটি পরিবেশক ও আমদানিকারকদের সাথে লেনদেন ও ডিস্ট্রিবিউশন শর্তাবলী'
              : 'Authorized IT distributors, suppliers, contact persons and credit agreements'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{lang === 'bn' ? 'নতুন পরিবেশক যোগ' : 'Add Supplier'}</span>
        </button>
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.map((sup) => {
          const suppliedCount = products.filter((p) => p.supplierId === sup.id).length;

          return (
            <div key={sup.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{sup.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>{sup.contactPerson}</span>
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Package className="h-3 w-3 text-slate-500" />
                  <span>{suppliedCount} {lang === 'bn' ? 'পণ্য' : 'SKUs'}</span>
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-800">{sup.phone}</span>
                </div>
                {sup.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{sup.email}</span>
                  </div>
                )}
                {sup.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{sup.address}</span>
                  </div>
                )}
                {sup.paymentTerms && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-blue-700">{sup.paymentTerms}</span>
                  </div>
                )}
              </div>

              {sup.brandsSupplied && sup.brandsSupplied.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {lang === 'bn' ? 'সরবরাহকৃত ব্র্যান্ডসমূহ:' : 'Supplied Brands:'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {sup.brandsSupplied.map((b) => (
                      <span key={b} className="rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-semibold">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{lang === 'bn' ? 'নতুন পরিবেশক যোগ' : 'Add New Supplier'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">পরিবেশক / কোম্পানির নাম *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. UCC Bangladesh / Star Tech"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">যোগাযোগের ব্যক্তি</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t.common.phone} *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.common.email}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.common.address}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">পেমেন্ট টার্মস ও ক্রেডিট সময়</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g. 15 Days Credit / Cash"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
