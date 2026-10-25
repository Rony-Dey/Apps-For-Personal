import React from 'react';
import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, PackageX, Sparkles } from 'lucide-react';
import { Product } from '../../types';

export interface LowStockAlertCardProps {
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  lang?: 'bn' | 'en';
  onViewInventory: () => void;
  isLoading?: boolean;
}

export const LowStockAlertCard: React.FC<LowStockAlertCardProps> = ({
  lowStockCount,
  outOfStockCount,
  lowStockProducts,
  outOfStockProducts,
  lang = 'bn',
  onViewInventory,
  isLoading = false,
}) => {
  const totalAlerts = lowStockCount + outOfStockCount;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {lang === 'bn' ? 'কম স্টক ও ঘাটতি সতর্কতা' : 'Low-Stock & Inventory Alerts'}
            </h3>
            <p className="text-[10px] text-slate-400">
              {totalAlerts} {lang === 'bn' ? 'টি পণ্যে পুনরায় অর্ডার প্রয়োজন' : 'items need urgent replenishment'}
            </p>
          </div>
        </div>

        <button
          onClick={onViewInventory}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          <span>{lang === 'bn' ? 'ইনভেন্টরি দেখুন' : 'Manage Stock'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body List */}
      <div className="divide-y divide-slate-100 p-2">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-slate-200" />
          </div>
        ) : totalAlerts === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              {lang === 'bn' ? 'সকল পণ্যের স্টক সন্তোষজনক!' : 'All products adequately stocked!'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'bn' ? 'কোনো পণ্য রিঅর্ডার সীমার নিচে নেই।' : 'No items currently below reorder thresholds.'}
            </p>
          </div>
        ) : (
          <>
            {/* Out of stock section */}
            {outOfStockProducts.slice(0, 2).map((item) => (
              <div
                key={item.id}
                onClick={onViewInventory}
                className="flex items-center justify-between rounded-lg p-2.5 hover:bg-rose-50/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                    <PackageX className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      SKU: {item.sku} • {item.brand}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                    {lang === 'bn' ? 'স্টক শূন্য (0)' : 'Out of Stock (0)'}
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-0.5">
                    {lang === 'bn' ? `রিঅর্ডার লেভেল: ${item.reorderLevel}` : `Min: ${item.reorderLevel}`}
                  </span>
                </div>
              </div>
            ))}

            {/* Low stock section */}
            {lowStockProducts.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={onViewInventory}
                className="flex items-center justify-between rounded-lg p-2.5 hover:bg-amber-50/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>{item.brand}</span>
                      <span>•</span>
                      <span>Syl: {item.stockByLocation['loc_sylhet'] || 0}</span>
                      <span>•</span>
                      <span>Dhk: {item.stockByLocation['loc_dhaka'] || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {item.totalStock} {lang === 'bn' ? 'টি অবশিষ্ট' : 'left'}
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-0.5">
                    {lang === 'bn' ? `রিঅর্ডার: ${item.reorderLevel}` : `Min: ${item.reorderLevel}`}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
