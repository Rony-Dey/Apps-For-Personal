import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subBadge?: {
    text: string;
    type?: 'success' | 'warning' | 'danger' | 'info';
  };
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  subBadge,
  icon: Icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  onClick,
  isLoading = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 truncate max-w-[170px]">
          {title}
        </span>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBgColor} ${iconColor} transition-transform group-hover:scale-105`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="mt-2.5">
        {isLoading ? (
          <div className="h-8 w-28 animate-pulse rounded-md bg-slate-200" />
        ) : (
          <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
        {subtitle && (
          <p className="text-[11px] font-medium text-slate-500 truncate">
            {subtitle}
          </p>
        )}

        {subBadge && (
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              subBadge.type === 'danger'
                ? 'bg-rose-100 text-rose-700'
                : subBadge.type === 'warning'
                ? 'bg-amber-100 text-amber-800'
                : subBadge.type === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {subBadge.text}
          </span>
        )}
      </div>
    </div>
  );
};
