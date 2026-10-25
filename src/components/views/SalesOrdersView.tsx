import React, { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  FileCheck,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT, formatDate } from '../../i18n/translations';
import { dbService } from '../../services/db';
import { SalesOrder } from '../../types';

export const SalesOrdersView: React.FC = () => {
  const { lang, t, orders, refreshData, showToast, currentUser } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank_transfer' | 'card'>('bkash');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Handle Order Status change (e.g. Delivered -> actual stock deduction)
  const handleStatusChange = async (order: SalesOrder, newStatus: SalesOrder['orderStatus']) => {
    try {
      await dbService.updateOrderStatus(order.id, newStatus, {
        uid: currentUser.uid,
        name: currentUser.displayName,
      });
      showToast(lang === 'bn' ? `অর্ডার স্ট্যাটাস আপডেট: ${newStatus}` : `Order status changed to ${newStatus}`);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || paymentAmount <= 0) {
      showToast('Enter valid payment amount', 'error');
      return;
    }

    try {
      await dbService.recordOrderPayment(
        selectedOrder.id,
        paymentAmount,
        paymentMethod,
        transactionRef,
        paymentNotes,
        { uid: currentUser.uid, name: currentUser.displayName }
      );
      showToast(lang === 'bn' ? 'পেমেন্ট সফলভাবে গ্রহণ ও রেকর্ড করা হয়েছে' : 'Payment recorded successfully');
      setIsPaymentModalOpen(false);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Payment recording failed', 'error');
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.orderNumber.toLowerCase().includes(q) &&
          !o.customerName.toLowerCase().includes(q) &&
          !o.customerPhone.includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter !== 'all' && o.orderStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.salesOrders.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.salesOrders.subtitle}</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'bn' ? 'অর্ডার নং বা গ্রাহকের নাম দিয়ে খুঁজুন...' : 'Search order # or customer...'}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-hidden"
        >
          <option value="all">{lang === 'bn' ? 'সকল অর্ডার অবস্থা' : 'All Order Statuses'}</option>
          <option value="confirmed">{t.salesOrders.statuses.confirmed}</option>
          <option value="processing">{t.salesOrders.statuses.processing}</option>
          <option value="delivered">{t.salesOrders.statuses.delivered}</option>
          <option value="cancelled">{t.salesOrders.statuses.cancelled}</option>
        </select>
      </div>

      {/* Sales Orders Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">{t.salesOrders.orderNo}</th>
                <th className="px-4 py-3">{t.quotations.customer}</th>
                <th className="px-4 py-3">{t.common.date}</th>
                <th className="px-4 py-3 text-right">{t.common.total}</th>
                <th className="px-4 py-3 text-right">{t.salesOrders.paid}</th>
                <th className="px-4 py-3 text-right">{t.salesOrders.due}</th>
                <th className="px-4 py-3 text-center">{t.salesOrders.orderStatus}</th>
                <th className="px-4 py-3 text-center">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">
                    <div>{order.orderNumber}</div>
                    {order.quotationNumber && (
                      <span className="text-[10px] text-slate-400 font-normal">Quote: {order.quotationNumber}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{order.customerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{order.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">{formatDate(order.createdAt, lang)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatBDT(order.totalAmount, lang)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {formatBDT(order.paidAmount, lang)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.balanceDue > 0 ? (
                      <span className="font-bold text-rose-600">{formatBDT(order.balanceDue, lang)}</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">✓ ৳ 0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={order.orderStatus}
                      onChange={(e) => handleStatusChange(order, e.target.value as any)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border-0 cursor-pointer ${
                        order.orderStatus === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.orderStatus === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : order.orderStatus === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <option value="confirmed">{t.salesOrders.statuses.confirmed}</option>
                      <option value="processing">{t.salesOrders.statuses.processing}</option>
                      <option value="delivered">{t.salesOrders.statuses.delivered}</option>
                      <option value="cancelled">{t.salesOrders.statuses.cancelled}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {order.balanceDue > 0 && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setPaymentAmount(order.balanceDue);
                            setIsPaymentModalOpen(true);
                          }}
                          className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 text-[11px] font-semibold flex items-center gap-1"
                          title="Record Payment"
                        >
                          <CreditCard className="h-3 w-3" />
                          <span>{t.salesOrders.recordPayment}</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100"
                        title="View Items"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    {t.common.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{t.salesOrders.recordPayment}</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t.salesOrders.orderNo}:</span>
                <span className="font-bold font-mono text-slate-900">{selectedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t.quotations.customer}:</span>
                <span className="font-semibold text-slate-800">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t.salesOrders.due}:</span>
                <span className="font-bold text-rose-600">{formatBDT(selectedOrder.balanceDue, lang)}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">{lang === 'bn' ? 'পরিশোধিত টাকার পরিমাণ' : 'Payment Amount'} (BDT) *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedOrder.balanceDue}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">পেমেন্ট মাধ্যম *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="bkash">bKash (Merchant / Personal)</option>
                  <option value="nagad">Nagad</option>
                  <option value="cash">Cash on Delivery / Counter</option>
                  <option value="bank_transfer">Bank Wire (City Bank / BRAC Bank)</option>
                  <option value="card">POS Card Swipe</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">ট্রানজ্যাকশন আইডি / রেফারেন্স</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. bKash TrxID: BK9X29188"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">{t.common.notes}</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 font-semibold text-white shadow-xs hover:bg-emerald-700"
                >
                  {lang === 'bn' ? 'পেমেন্ট জমা নিশ্চিত করুন' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
