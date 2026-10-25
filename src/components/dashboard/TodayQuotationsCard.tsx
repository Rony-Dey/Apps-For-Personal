import React from 'react';
import { ArrowRight, FileCheck, FileText, Plus } from 'lucide-react';
import { formatBDT } from '../../i18n/translations';
import { Quotation } from '../../types';

export interface TodayQuotationsCardProps {
  todayQuotationsCount: number;
  todayQuotations: Quotation[];
  lang?: 'bn' | 'en';
  onCreateQuotation: () => void;
  onSelectQuotation: (id: string) => void;
  onViewAllQuotations: () => void;
  isLoading?: boolean;
}

export const TodayQuotationsCard: React.FC<TodayQuotationsCardProps> = ({
  todayQuotationsCount,
  todayQuotations,
  lang = 'bn',
  onCreateQuotation,
  onSelectQuotation,
  onViewAllQuotations,
  isLoading = false,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {lang === 'bn' ? 'আজকের কোটেশন সমূহ' : "Today's Quotations"}
            </h3>
            <p className="text-[10px] text-slate-400">
              {todayQuotationsCount} {lang === 'bn' ? 'টি কোটেশন আজ প্রস্তুত হয়েছে' : 'quotations issued today'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateQuotation}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>{lang === 'bn' ? 'নতুন কোটেশন' : 'New Quote'}</span>
          </button>
        </div>
      </div>

      {/* List / Items */}
      <div className="divide-y divide-slate-100 p-2">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-slate-200" />
          </div>
        ) : todayQuotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
              <FileCheck className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              {lang === 'bn' ? 'আজ এখনও কোনো কোটেশন তৈরি হয়নি' : 'No quotations created yet today'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'bn' ? 'গ্রাহকদের জন্য প্রস্তুত করতে বাটনে ক্লিক করুন।' : 'Click button to generate a new official price quote.'}
            </p>
            <button
              onClick={onCreateQuotation}
              className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-blue-600" />
              <span>{lang === 'bn' ? 'আজকের প্রথম কোটেশন বানান' : 'Create First Quote'}</span>
            </button>
          </div>
        ) : (
          todayQuotations.slice(0, 4).map((quote) => (
            <div
              key={quote.id}
              onClick={() => onSelectQuotation(quote.id)}
              className="flex items-center justify-between rounded-lg p-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-blue-700 font-mono">{quote.quoteNumber}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      quote.status === 'accepted' || quote.status === 'ordered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : quote.status === 'sent'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {quote.status.toUpperCase()}
                  </span>
                </div>
                <h4 className="text-xs font-medium text-slate-800 mt-0.5">{quote.customerName}</h4>
                <p className="text-[10px] text-slate-400">
                  {quote.items.length} {lang === 'bn' ? 'টি আইটেম' : 'line items'}
                  {quote.customerPhone ? ` • ${quote.customerPhone}` : ''}
                </p>
              </div>

              <div className="text-right shrink-0 ml-3">
                <span className="text-xs font-extrabold text-slate-900 block">
                  {formatBDT(quote.grandTotal, lang)}
                </span>
                <span className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-0.5">
                  <span>{lang === 'bn' ? 'পিডিএফ দেখুন' : 'View PDF'}</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {todayQuotations.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 text-center">
          <button
            onClick={onViewAllQuotations}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {lang === 'bn' ? 'সকল কোটেশন ও হিস্ট্রি দেখুন' : 'View All Quotation Records'} →
          </button>
        </div>
      )}
    </div>
  );
};
