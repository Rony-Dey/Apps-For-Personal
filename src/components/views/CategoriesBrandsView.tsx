import React, { useState } from 'react';
import {
  Boxes,
  Cpu,
  FolderKanban,
  HardDrive,
  Monitor,
  Plus,
  Server,
  Tag,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CategoriesBrandsView: React.FC = () => {
  const { lang, t, products } = useApp();

  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');

  // Hardware categories with item counts
  const hardwareCategories = [
    { name: 'Processor', nameBn: 'প্রসেসর', icon: Cpu, subcategories: ['Intel Core', 'AMD Ryzen', 'Server Xeon'] },
    { name: 'Motherboard', nameBn: 'মাদারবোর্ড', icon: Server, subcategories: ['Intel B760/Z790', 'AMD B650/X670', 'Budget H610/B450'] },
    { name: 'RAM', nameBn: 'র‌্যাম', icon: Zap, subcategories: ['DDR5 Desktop', 'DDR4 Desktop', 'Laptop SODIMM'] },
    { name: 'Graphics Card', nameBn: 'গ্রাফিক্স কার্ড', icon: Monitor, subcategories: ['NVIDIA GeForce RTX', 'AMD Radeon RX'] },
    { name: 'Storage', nameBn: 'স্টোরেজ ও এসএসডি', icon: HardDrive, subcategories: ['PCIe 4.0 NVMe', 'PCIe 3.0 NVMe', 'SATA SSD', 'HDD'] },
    { name: 'Power Supply', nameBn: 'পাওয়ার সাপ্লাই', icon: Zap, subcategories: ['80+ Bronze', '80+ Gold', 'Modular PSU'] },
    { name: 'Casing', nameBn: 'কেসিং ও ক্যাবিনেট', icon: Boxes, subcategories: ['Mid-Tower RGB', 'Micro-ATX Mini', 'Full Tower'] },
    { name: 'CPU Cooler', nameBn: 'সিপিইউ কুলার', icon: Server, subcategories: ['Air Cooler', 'Liquid AIO 240/360'] },
    { name: 'Monitor', nameBn: 'মনিটর', icon: Monitor, subcategories: ['FHD 100Hz', '2K 180Hz IPS', 'Curved Gaming'] },
  ];

  // Distinct brands with counts
  const brandsList = [
    { name: 'Intel', country: 'USA', segment: 'Processors' },
    { name: 'AMD', country: 'USA', segment: 'Processors & Graphics' },
    { name: 'MSI', country: 'Taiwan', segment: 'Motherboards & GPUs' },
    { name: 'ASUS', country: 'Taiwan', segment: 'Motherboards, Monitors & GPUs' },
    { name: 'Gigabyte', country: 'Taiwan', segment: 'Motherboards & Graphics Cards' },
    { name: 'Corsair', country: 'USA', segment: 'RAM, Power Supplies & Cooling' },
    { name: 'Kingston', country: 'USA', segment: 'RAM & NVMe Storage' },
    { name: 'Samsung', country: 'South Korea', segment: 'High-speed NVMe SSDs' },
    { name: 'DeepCool', country: 'China', segment: 'Coolers & Bronze PSUs' },
    { name: 'Montech', country: 'Taiwan', segment: 'Gaming Cases & Fans' },
    { name: 'Antec', country: 'USA', segment: 'Cases & Power Supplies' },
    { name: 'LG', country: 'South Korea', segment: 'IPS Displays & Monitors' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
          {t.nav.categories}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {lang === 'bn' ? 'হার্ডওয়্যার ক্যাটাগরি, সাবক্যাটাগরি এবং অথরাইজড ব্র্যান্ড ব্যবস্থাপনা' : 'Manage computer hardware categories, subcategories, and authorized brands'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'categories' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          <span>{lang === 'bn' ? 'ক্যাটাগরি সমূহ' : 'Categories'}</span>
        </button>
        <button
          onClick={() => setActiveTab('brands')}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'brands' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>{lang === 'bn' ? 'ব্র্যান্ড সমূহ' : 'Brands'}</span>
        </button>
      </div>

      {/* Categories View */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hardwareCategories.map((cat) => {
            const Icon = cat.icon;
            const count = products.filter((p) => p.category === cat.name).length;

            return (
              <div key={cat.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{cat.name}</h4>
                      <p className="text-xs text-slate-400">{cat.nameBn}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {count} {lang === 'bn' ? 'টি' : 'items'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {lang === 'bn' ? 'সাবক্যাটাগরি:' : 'Subcategories:'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.subcategories.map((sub) => (
                      <span key={sub} className="rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Brands View */}
      {activeTab === 'brands' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {brandsList.map((brand) => {
            const count = products.filter((p) => p.brand.toLowerCase() === brand.name.toLowerCase()).length;

            return (
              <div key={brand.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-slate-100 text-slate-800 font-bold text-sm mb-2">
                  {brand.name.slice(0, 2).toUpperCase()}
                </div>
                <h4 className="font-bold text-sm text-slate-900">{brand.name}</h4>
                <p className="text-[10px] text-slate-400">{brand.country} • {brand.segment}</p>
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {count} {lang === 'bn' ? 'টি পণ্য সক্রিয়' : 'active products'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
