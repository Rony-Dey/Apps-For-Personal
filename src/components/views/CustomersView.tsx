import React, { useMemo, useState } from 'react';
import {
  Building,
  CreditCard,
  Edit,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  User,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT, formatDate } from '../../i18n/translations';
import { dbService } from '../../services/db';
import { Customer } from '../../types';

export const CustomersView: React.FC = () => {
  const {
    lang,
    t,
    customers,
    quotations,
    orders,
    refreshData,
    showToast,
    currentUser,
    setActiveTab,
    setTargetCustomerId,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    district: 'Sylhet',
    customerType: 'retail' as 'retail' | 'corporate' | 'reseller',
    preferredChannel: 'whatsapp' as 'phone' | 'whatsapp' | 'email' | 'in_person',
    leadSource: 'Walk-in Showroom',
    notes: '',
  });

  // Duplicate phone warning
  const duplicateWarning = useMemo(() => {
    if (!formData.phone) return null;
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) return null;

    return customers.find(
      (c) =>
        c.id !== editingCustomer?.id &&
        c.phone.replace(/[^0-9]/g, '').includes(cleanPhone.slice(-8))
    );
  }, [formData.phone, customers, editingCustomer]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.phone.includes(q) &&
          !(c.company || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (selectedType !== 'all' && c.customerType !== selectedType) {
        return false;
      }
      return true;
    });
  }, [customers, search, selectedType]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '+880 17',
      email: '',
      company: '',
      address: '',
      district: 'Sylhet',
      customerType: 'retail',
      preferredChannel: 'whatsapp',
      leadSource: 'Walk-in Showroom',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      company: c.company || '',
      address: c.address,
      district: c.district,
      customerType: c.customerType,
      preferredChannel: c.preferredChannel,
      leadSource: c.leadSource || 'Walk-in Showroom',
      notes: c.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showToast('Name and phone number are required', 'error');
      return;
    }

    try {
      if (editingCustomer) {
        await dbService.updateCustomer(
          editingCustomer.id,
          {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            company: formData.company,
            address: formData.address,
            district: formData.district,
            customerType: formData.customerType,
            preferredChannel: formData.preferredChannel,
            leadSource: formData.leadSource,
            notes: formData.notes,
          },
          { uid: currentUser.uid, name: currentUser.displayName }
        );
        showToast(lang === 'bn' ? 'গ্রাহকের তথ্য আপডেট করা হয়েছে' : 'Customer updated successfully');
      } else {
        await dbService.addCustomer(
          {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            company: formData.company,
            address: formData.address,
            district: formData.district,
            customerType: formData.customerType,
            preferredChannel: formData.preferredChannel,
            leadSource: formData.leadSource,
            notes: formData.notes,
            totalOrdersCount: 0,
            totalSpent: 0,
            dueBalance: 0,
          },
          { uid: currentUser.uid, name: currentUser.displayName }
        );
        showToast(lang === 'bn' ? 'নতুন গ্রাহক তালিকাভুক্ত করা হয়েছে' : 'Customer created successfully');
      }

      setIsModalOpen(false);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.customers.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.customers.subtitle}</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{t.customers.newCustomer}</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'bn' ? 'গ্রাহকের নাম, ফোন অথবা কোম্পানি দিয়ে খুঁজুন...' : 'Search customer name, phone or company...'}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-hidden"
        >
          <option value="all">{lang === 'bn' ? 'সকল ধরনের গ্রাহক' : 'All Customer Types'}</option>
          <option value="retail">{t.customers.types.retail}</option>
          <option value="corporate">{t.customers.types.corporate}</option>
          <option value="reseller">{t.customers.types.reseller}</option>
        </select>
      </div>

      {/* Customer Directory Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">{t.customers.name}</th>
                <th className="px-4 py-3">{t.customers.customerType}</th>
                <th className="px-4 py-3">{t.customers.phone} / ইমেইল</th>
                <th className="px-4 py-3">{t.customers.address}</th>
                <th className="px-4 py-3 text-right">{t.customers.totalSpent}</th>
                <th className="px-4 py-3 text-right">{t.customers.dueBalance}</th>
                <th className="px-4 py-3 text-center">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const customerQuotes = quotations.filter((q) => q.customerId === c.id);
                const customerOrders = orders.filter((o) => o.customerId === c.id);

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      {c.company && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3" />
                          <span>{c.company}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          c.customerType === 'corporate'
                            ? 'bg-purple-100 text-purple-800'
                            : c.customerType === 'reseller'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.customers.types[c.customerType] || c.customerType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-800">{c.phone}</div>
                      {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{c.address}</div>
                      <div className="text-[10px] text-slate-400">{c.district}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatBDT(c.totalSpent || 0, lang)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.dueBalance && c.dueBalance > 0 ? (
                        <span className="font-bold text-rose-600">{formatBDT(c.dueBalance, lang)}</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">৳ 0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingCustomer(c)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100"
                          title="View Customer Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          title="Edit Customer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    {t.common.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? (lang === 'bn' ? 'গ্রাহক সম্পাদনা' : 'Edit Customer') : t.customers.newCustomer}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="mt-3 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-800">
                ⚠️ সতর্কতা: এই ফোন নম্বরে ইতিমধ্যে একজন গ্রাহক বিদ্যমান ({duplicateWarning.name})!
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700">{t.customers.name} *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">{t.customers.phone} *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700">{t.customers.email}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">{t.customers.company}</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700">{t.customers.customerType}</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="retail">{t.customers.types.retail}</option>
                    <option value="corporate">{t.customers.types.corporate}</option>
                    <option value="reseller">{t.customers.types.reseller}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">যোগাযোগ মাধ্যম</label>
                  <select
                    value={formData.preferredChannel}
                    onChange={(e) => setFormData({ ...formData, preferredChannel: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Phone Call</option>
                    <option value="email">Email</option>
                    <option value="in_person">Showroom Visit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">জেলা</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.customers.address}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
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

      {/* Customer Profile View Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingCustomer.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{viewingCustomer.phone} • {viewingCustomer.company}</p>
              </div>
              <button onClick={() => setViewingCustomer(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block">{t.customers.totalSpent}:</span>
                  <span className="font-bold text-base text-blue-700">
                    {formatBDT(viewingCustomer.totalSpent || 0, lang)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t.customers.dueBalance}:</span>
                  <span className="font-bold text-base text-rose-600">
                    {formatBDT(viewingCustomer.dueBalance || 0, lang)}
                  </span>
                </div>
              </div>

              {/* Linked Quotations */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2">এই গ্রাহকের পূর্ববর্তী কোটেশন সমূহ:</h4>
                <div className="space-y-1.5">
                  {quotations.filter((q) => q.customerId === viewingCustomer.id).map((q) => (
                    <div key={q.id} className="border border-slate-200 rounded-lg p-2.5 flex justify-between items-center bg-white">
                      <div>
                        <span className="font-bold text-blue-700 font-mono">{q.quoteNumber}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{formatDate(q.createdAt, lang)}</span>
                      </div>
                      <span className="font-bold text-slate-900">{formatBDT(q.grandTotal, lang)}</span>
                    </div>
                  ))}
                  {quotations.filter((q) => q.customerId === viewingCustomer.id).length === 0 && (
                    <p className="text-slate-400 italic">কোনো কোটেশন পাওয়া যায়নি</p>
                  )}
                </div>
              </div>

              {/* Linked Orders */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2">কনফার্মড সেলস অর্ডার:</h4>
                <div className="space-y-1.5">
                  {orders.filter((o) => o.customerId === viewingCustomer.id).map((o) => (
                    <div key={o.id} className="border border-slate-200 rounded-lg p-2.5 flex justify-between items-center bg-white">
                      <div>
                        <span className="font-bold text-emerald-700 font-mono">{o.orderNumber}</span>
                        <span className="text-[10px] text-slate-400 ml-2">Status: {o.orderStatus}</span>
                      </div>
                      <span className="font-bold text-slate-900">{formatBDT(o.totalAmount, lang)}</span>
                    </div>
                  ))}
                  {orders.filter((o) => o.customerId === viewingCustomer.id).length === 0 && (
                    <p className="text-slate-400 italic">কোনো অর্ডার পাওয়া যায়নি</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingCustomer(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
