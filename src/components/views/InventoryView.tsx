import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  CheckCircle2,
  Clock,
  Filter,
  History,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../i18n/translations';
import { dbService } from '../../services/db';
import { Product, StockLocation, StockMovement } from '../../types';

export const InventoryView: React.FC = () => {
  const { lang, t, products, locations, refreshData, showToast, currentUser, canManageInventory } = useApp();

  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'stock_grid' | 'movements_ledger'>('stock_grid');

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [transferData, setTransferData] = useState({
    fromLoc: 'loc_sylhet',
    toLoc: 'loc_dhaka',
    quantity: 1,
    reason: 'Inter-branch shop stock rebalancing',
  });

  const [adjustData, setAdjustData] = useState({
    locationId: 'loc_sylhet',
    newQuantity: 0,
    reason: 'Physical shelf inventory count verification',
  });

  const loadMovements = async () => {
    const data = await dbService.getStockMovements();
    setMovements(data);
  };

  useEffect(() => {
    loadMovements();
  }, [products]);

  // Filtered products
  const filteredProducts = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Handle Stock Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (transferData.fromLoc === transferData.toLoc) {
      showToast('Source and destination locations cannot be identical', 'error');
      return;
    }

    try {
      await dbService.transferStock(
        selectedProduct.id,
        transferData.fromLoc,
        transferData.toLoc,
        transferData.quantity,
        transferData.reason,
        { uid: currentUser.uid, name: currentUser.displayName }
      );
      showToast(lang === 'bn' ? 'স্টক সফলভাবে স্থানান্তর করা হয়েছে' : 'Stock transferred successfully');
      setIsTransferModalOpen(false);
      await refreshData();
      await loadMovements();
    } catch (err: any) {
      showToast(err.message || 'Transfer failed', 'error');
    }
  };

  // Handle Manual Stock Adjustment
  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      await dbService.adjustStock(
        selectedProduct.id,
        adjustData.locationId,
        adjustData.newQuantity,
        adjustData.reason,
        { uid: currentUser.uid, name: currentUser.displayName }
      );
      showToast(lang === 'bn' ? 'স্টক সমন্বয় রেকর্ড করা হয়েছে' : 'Stock adjusted successfully');
      setIsAdjustModalOpen(false);
      await refreshData();
      await loadMovements();
    } catch (err: any) {
      showToast(err.message || 'Adjustment failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.inventory.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.inventory.subtitle}</p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('stock_grid')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'stock_grid' ? 'bg-blue-600 text-white shadow-xs' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>{lang === 'bn' ? 'লোকেশন স্টক গ্রিড' : 'Multi-Location Stock'}</span>
          </button>
          <button
            onClick={() => setActiveTab('movements_ledger')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'movements_ledger' ? 'bg-blue-600 text-white shadow-xs' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History className="h-4 w-4" />
            <span>{t.inventory.movementHistory}</span>
          </button>
        </div>
      </div>

      {/* Location overview badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {locations.map((loc) => {
          const locUnits = products.reduce((sum, p) => sum + (p.stockByLocation[loc.id] || 0), 0);

          return (
            <div key={loc.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{loc.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{loc.code}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-700">{locUnits} {lang === 'bn' ? 'টি' : 'units'}</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 truncate">{loc.address}</p>
            </div>
          );
        })}
      </div>

      {/* Main Stock Table */}
      {activeTab === 'stock_grid' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === 'bn' ? 'পণ্য বা SKU দিয়ে ফিল্টার করুন...' : 'Search stock item or SKU...'}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">{t.products.productName}</th>
                  <th className="px-4 py-3">{t.inventory.onHand} (মোট)</th>
                  <th className="px-4 py-3">{t.inventory.reserved}</th>
                  <th className="px-4 py-3">{t.inventory.available}</th>
                  <th className="px-4 py-3 text-center">সিলেট শোরুম</th>
                  <th className="px-4 py-3 text-center">ঢাকা হাব</th>
                  <th className="px-4 py-3 text-center">চট্টগ্রাম ডিপো</th>
                  {canManageInventory && <th className="px-4 py-3 text-center">{t.common.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const onHand = p.totalStock || 0;
                  const reserved = p.reservedStock || 0;
                  const available = Math.max(0, onHand - reserved);
                  const isLow = available <= p.reorderLevel;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.sku} • {p.brand}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{onHand}</td>
                      <td className="px-4 py-3 text-amber-700 font-medium">{reserved}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            available === 0
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {available} {lang === 'bn' ? 'টি' : 'units'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {p.stockByLocation['loc_sylhet'] || 0}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {p.stockByLocation['loc_dhaka'] || 0}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {p.stockByLocation['loc_ctg'] || 0}
                      </td>
                      {canManageInventory && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setTransferData({
                                  fromLoc: 'loc_sylhet',
                                  toLoc: 'loc_dhaka',
                                  quantity: 1,
                                  reason: 'Branch stock transfer',
                                });
                                setIsTransferModalOpen(true);
                              }}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                              title="Transfer Stock"
                            >
                              <ArrowRightLeft className="h-3 w-3 text-blue-600" />
                              <span>{lang === 'bn' ? 'স্থানান্তর' : 'Transfer'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setAdjustData({
                                  locationId: 'loc_sylhet',
                                  newQuantity: p.stockByLocation['loc_sylhet'] || 0,
                                  reason: 'Count adjustment',
                                });
                                setIsAdjustModalOpen(true);
                              }}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                              title="Adjust Stock"
                            >
                              <Sliders className="h-3 w-3 text-amber-600" />
                              <span>{lang === 'bn' ? 'সমন্বয়' : 'Adjust'}</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Movement Audit Ledger Table */}
      {activeTab === 'movements_ledger' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h3 className="text-sm font-bold text-slate-900">{t.inventory.movementHistory}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'স্টকের প্রতিটি পরিবর্তন, কে করেছে, কখন এবং কেন করেছে তার অপরিবর্তনীয় অডিট লগ'
                : 'Immutable audit trail of all inventory additions, sales, transfers, and corrections'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">{t.common.date}</th>
                  <th className="px-4 py-3">{t.products.productName}</th>
                  <th className="px-4 py-3">টাইপ / ধরন</th>
                  <th className="px-4 py-3">{t.common.quantity}</th>
                  <th className="px-4 py-3">লোকেশন</th>
                  <th className="px-4 py-3">{t.inventory.reason}</th>
                  <th className="px-4 py-3">সম্পাদনাকারী</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {formatDate(m.createdAt, lang)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{m.productName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          m.type === 'received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.type === 'sale'
                            ? 'bg-blue-100 text-blue-800'
                            : m.type === 'transfer'
                            ? 'bg-indigo-100 text-indigo-800'
                            : m.type === 'reserved'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{m.quantity}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.fromLocation ? `${m.fromLocation} → ${m.toLocation}` : m.toLocation || 'Warehouse'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.reason}</td>
                    <td className="px-4 py-3 text-slate-500 font-medium">{m.recordedByName}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
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
      )}

      {/* Transfer Stock Modal */}
      {isTransferModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{t.inventory.transferStock}</h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 bg-slate-50 p-2.5 rounded-lg text-xs">
              <span className="text-slate-500 block">পণ্য:</span>
              <span className="font-bold text-slate-900">{selectedProduct.name}</span>
            </div>

            <form onSubmit={handleTransfer} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.inventory.fromLoc}</label>
                <select
                  value={transferData.fromLoc}
                  onChange={(e) => setTransferData({ ...transferData, fromLoc: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} (মজুদ: {selectedProduct.stockByLocation[loc.id] || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.inventory.toLoc}</label>
                <select
                  value={transferData.toLoc}
                  onChange={(e) => setTransferData({ ...transferData, toLoc: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.common.quantity} *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 1 })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.inventory.reason} *</label>
                <input
                  type="text"
                  required
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  placeholder="e.g. Demand in Sylhet showroom"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  {lang === 'bn' ? 'স্থানান্তর নিশ্চিত করুন' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">{t.inventory.adjustStock}</h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 bg-slate-50 p-2.5 rounded-lg text-xs">
              <span className="text-slate-500 block">পণ্য:</span>
              <span className="font-bold text-slate-900">{selectedProduct.name}</span>
            </div>

            <form onSubmit={handleAdjust} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.inventory.location}</label>
                <select
                  value={adjustData.locationId}
                  onChange={(e) => {
                    const locId = e.target.value;
                    setAdjustData({
                      ...adjustData,
                      locationId: locId,
                      newQuantity: selectedProduct.stockByLocation[locId] || 0,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {lang === 'bn' ? 'সংশোধিত নতুন স্টক সংখ্যা' : 'New Stock Quantity on Hand'} *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustData.newQuantity}
                  onChange={(e) => setAdjustData({ ...adjustData, newQuantity: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.inventory.reason} *</label>
                <input
                  type="text"
                  required
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  placeholder="e.g. Physical inventory count discrepancy correction"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700"
                >
                  {lang === 'bn' ? 'সমন্বয় সংরক্ষণ করুন' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
