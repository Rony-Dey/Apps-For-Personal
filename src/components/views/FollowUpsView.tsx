import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Headphones,
  MessageSquare,
  PhoneCall,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../i18n/translations';
import { dbService } from '../../services/db';
import { FollowUpStatus, FollowUpTask } from '../../types';

export const FollowUpsView: React.FC = () => {
  const { lang, t, followups, customers, quotations, refreshData, showToast, currentUser } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [isLostReasonModalOpen, setIsLostReasonModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<FollowUpTask | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    quotationId: '',
    quoteNumber: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'high' as 'low' | 'medium' | 'high',
    status: 'due' as FollowUpStatus,
    notes: '',
    nextAction: '',
  });

  const [callSummary, setCallSummary] = useState('');
  const [callChannel, setCallChannel] = useState<'call' | 'whatsapp' | 'email' | 'meeting'>('call');
  const [lostReasonText, setLostReasonText] = useState('Price objection / Found lower price elsewhere');

  // Groups
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = followups.filter((f) => f.dueDate === todayStr && f.status !== 'won' && f.status !== 'lost');
  const overdueTasks = followups.filter((f) => f.dueDate < todayStr && f.status !== 'won' && f.status !== 'lost');
  const wonCount = followups.filter((f) => f.status === 'won').length;
  const lostCount = followups.filter((f) => f.status === 'lost').length;

  const handleOpenCreate = () => {
    setActiveTask(null);
    setFormData({
      title: '',
      customerId: customers[0]?.id || '',
      customerName: customers[0]?.name || '',
      customerPhone: customers[0]?.phone || '',
      quotationId: quotations[0]?.id || '',
      quoteNumber: quotations[0]?.quoteNumber || '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'high',
      status: 'due',
      notes: '',
      nextAction: '',
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.customerName) {
      showToast('Title and customer are required', 'error');
      return;
    }

    try {
      await dbService.addFollowUp(
        {
          title: formData.title,
          customerId: formData.customerId,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          quotationId: formData.quotationId,
          quoteNumber: formData.quoteNumber,
          assignedTo: currentUser.uid,
          assignedToName: currentUser.displayName,
          dueDate: formData.dueDate,
          priority: formData.priority,
          status: formData.status,
          notes: formData.notes,
          nextAction: formData.nextAction,
        },
        { uid: currentUser.uid, name: currentUser.displayName }
      );
      showToast(lang === 'bn' ? 'ফলো-আপ টাস্ক সফলভাবে তৈরি হয়েছে' : 'Follow-up task scheduled successfully');
      setIsModalOpen(false);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  // Log conversation note
  const handleLogCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !callSummary) return;

    try {
      const logs = activeTask.communicationLog || [];
      const updatedLogs = [
        ...logs,
        {
          date: new Date().toISOString(),
          type: callChannel,
          summary: callSummary,
          loggedBy: currentUser.displayName,
        },
      ];

      await dbService.updateFollowUp(
        activeTask.id,
        {
          communicationLog: updatedLogs,
          notes: `${activeTask.notes}\n[${callChannel.toUpperCase()}]: ${callSummary}`,
        },
        { uid: currentUser.uid, name: currentUser.displayName }
      );

      showToast(lang === 'bn' ? 'কল / বার্তা লগ রেকর্ড করা হয়েছে' : 'Communication logged');
      setIsLogCallModalOpen(false);
      setCallSummary('');
      await refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Mark Won
  const handleMarkWon = async (task: FollowUpTask) => {
    try {
      await dbService.updateFollowUp(task.id, { status: 'won' }, {
        uid: currentUser.uid,
        name: currentUser.displayName,
      });
      showToast(lang === 'bn' ? 'অভিনন্দন! ডিল সফলভাবে সম্পন্ন হয়েছে (Won)' : 'Deal won successfully!');
      await refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Mark Lost
  const handleConfirmLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;

    try {
      await dbService.updateFollowUp(
        activeTask.id,
        {
          status: 'lost',
          lostReason: lostReasonText,
        },
        { uid: currentUser.uid, name: currentUser.displayName }
      );
      showToast(lang === 'bn' ? 'ডিল ব্যর্থ হিসেবে চিহ্নিত করা হয়েছে' : 'Deal marked as lost');
      setIsLostReasonModalOpen(false);
      await refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filtered
  const filteredTasks = useMemo(() => {
    return followups.filter((f) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !f.title.toLowerCase().includes(q) &&
          !f.customerName.toLowerCase().includes(q) &&
          !f.customerPhone.includes(q)
        ) {
          return false;
        }
      }
      if (selectedStatus !== 'all' && f.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [followups, search, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.followUps.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.followUps.subtitle}</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{t.followUps.newTask}</span>
        </button>
      </div>

      {/* KPI pipeline status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
          <span className="text-xs font-semibold text-blue-900">{t.followUps.todayFollowups}</span>
          <p className="text-2xl font-black text-blue-700 mt-1">{todayTasks.length}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
          <span className="text-xs font-semibold text-rose-900">{t.followUps.overdue}</span>
          <p className="text-2xl font-black text-rose-700 mt-1">{overdueTasks.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <span className="text-xs font-semibold text-emerald-900">{lang === 'bn' ? 'সফল ডিল (Won)' : 'Deals Won'}</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{wonCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-700">{lang === 'bn' ? 'বাতিল ডিল (Lost)' : 'Deals Lost'}</span>
          <p className="text-2xl font-black text-slate-600 mt-1">{lostCount}</p>
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
            placeholder={lang === 'bn' ? 'টাস্ক বা গ্রাহকের নাম দিয়ে খুঁজুন...' : 'Search task or client...'}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-hidden"
        >
          <option value="all">{lang === 'bn' ? 'সকল অবস্থা' : 'All Statuses'}</option>
          <option value="due">Follow-up Due</option>
          <option value="negotiation">Negotiation</option>
          <option value="sent">Quotation Sent</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {/* Follow-up tasks table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">টাস্ক ও শিরোনাম</th>
                <th className="px-4 py-3">{t.quotations.customer}</th>
                <th className="px-4 py-3">{t.followUps.dueDate}</th>
                <th className="px-4 py-3">{t.followUps.priority}</th>
                <th className="px-4 py-3">{t.common.status}</th>
                <th className="px-4 py-3">{t.followUps.assignedTo}</th>
                <th className="px-4 py-3 text-center">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const isOverdue = task.dueDate < todayStr && task.status !== 'won' && task.status !== 'lost';

                return (
                  <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{task.title}</div>
                      <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-sm truncate">
                        "{task.notes}"
                      </div>
                      {task.quoteNumber && (
                        <span className="text-[9px] font-mono text-blue-600">Ref: {task.quoteNumber}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{task.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{task.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className={isOverdue ? 'font-bold text-rose-600' : 'text-slate-600'}>
                        {formatDate(task.dueDate, lang)}
                      </span>
                      {isOverdue && <span className="block text-[9px] text-rose-500 font-bold">OVERDUE</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          task.priority === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : task.priority === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          task.status === 'won'
                            ? 'bg-emerald-100 text-emerald-800'
                            : task.status === 'lost'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {task.status.toUpperCase()}
                      </span>
                      {task.lostReason && (
                        <p className="text-[9px] text-rose-600 mt-0.5 italic">Reason: {task.lostReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] font-medium">{task.assignedToName}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setActiveTask(task);
                            setIsLogCallModalOpen(true);
                          }}
                          className="rounded-md border border-slate-200 bg-white p-1 text-blue-600 hover:bg-blue-50"
                          title="Log Conversation"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </button>
                        {task.status !== 'won' && (
                          <button
                            onClick={() => handleMarkWon(task)}
                            className="rounded-md border border-emerald-200 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100"
                            title="Mark Won"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {task.status !== 'lost' && (
                          <button
                            onClick={() => {
                              setActiveTask(task);
                              setIsLostReasonModalOpen(true);
                            }}
                            className="rounded-md border border-rose-200 bg-rose-50 p-1 text-rose-700 hover:bg-rose-100"
                            title="Mark Lost"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
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

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{t.followUps.newTask}</h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">টাস্ক শিরোনাম *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Call client regarding Core i5 quote price"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">{t.quotations.customer} *</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => {
                    const cust = customers.find((c) => c.id === e.target.value);
                    if (cust) {
                      setFormData({
                        ...formData,
                        customerId: cust.id,
                        customerName: cust.name,
                        customerPhone: cust.phone,
                      });
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700">{t.followUps.dueDate}</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">{t.followUps.priority}</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">{t.common.notes}</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Client requirements or discussion points..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Call Modal */}
      {isLogCallModalOpen && activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{t.followUps.logCall}</h3>
              <button onClick={() => setIsLogCallModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLogCommunication} className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">গ্রাহক:</span>
                <span className="font-bold text-slate-900">{activeTask.customerName} ({activeTask.customerPhone})</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">যোগাযোগের চ্যানেল</label>
                <select
                  value={callChannel}
                  onChange={(e) => setCallChannel(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                >
                  <option value="call">Phone Call</option>
                  <option value="whatsapp">WhatsApp Message</option>
                  <option value="meeting">In-Person Meeting</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">আলোচনার সারসংক্ষেপ ও গ্রাহকের প্রতিক্রিয়া *</label>
                <textarea
                  required
                  rows={3}
                  value={callSummary}
                  onChange={(e) => setCallSummary(e.target.value)}
                  placeholder="e.g. Spoke with customer. Agreed on price. Requested delivery this Saturday."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLogCallModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  লগ রেকর্ড করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Lost Reason Modal */}
      {isLostReasonModalOpen && activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{t.followUps.markLost}</h3>
              <button onClick={() => setIsLostReasonModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmLost} className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600">
                ডিল হারানোর কারণ বিশ্লেষণ রিপোর্ট উন্নত করতে সহায়ক হবে।
              </p>

              <div>
                <label className="block font-semibold text-slate-700">{t.followUps.lostReason} *</label>
                <select
                  value={lostReasonText}
                  onChange={(e) => setLostReasonText(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                >
                  <option value="Price objection / Found lower price elsewhere">দাম বেশি / অন্য দোকান থেকে কম দামে পেয়েছে</option>
                  <option value="Required component out of stock">প্রয়োজনীয় যন্ত্রাংশ স্টকে ছিল না</option>
                  <option value="Customer postponed PC purchase project">গ্রাহক সাময়িকভাবে কেনার সিদ্ধান্ত স্থগিত করেছে</option>
                  <option value="Competitor offered longer warranty">অন্য শপ বেশি দিন ওয়ারেন্টির প্রস্তাব দিয়েছে</option>
                  <option value="Customer unreachable after repeated calls">গ্রাহকের ফোন বন্ধ / সাড়া মেলেনি</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLostReasonModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-4 py-1.5 font-semibold text-white shadow-xs hover:bg-rose-700"
                >
                  নিশ্চিত করুন (Mark Lost)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
