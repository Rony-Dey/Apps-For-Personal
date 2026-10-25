import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  DownloadCloud,
  FileSpreadsheet,
  Globe,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../i18n/translations';
import { dbService } from '../../services/db';
import {
  fetchDiscoveredProducts,
  getSampleCSVTemplate,
  parseDistributorCSV,
  SUPPORTED_ADAPTERS,
  validateSafeUrl,
} from '../../services/importerService';
import { DiscoveredProductPreview, Product } from '../../types';

export const ProductImporterView: React.FC = () => {
  const { lang, t, products, refreshData, showToast, currentUser } = useApp();

  const [inputUrl, setInputUrl] = useState('https://www.startech.com.bd/component/processor');
  const [selectedAdapter, setSelectedAdapter] = useState('startech');
  const [targetCategory, setTargetCategory] = useState('Processor');
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredItems, setDiscoveredItems] = useState<DiscoveredProductPreview[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [scanResultNotice, setScanResultNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'url_scan' | 'csv_upload'>('url_scan');

  // When adapter changes, suggest default URL
  const handleAdapterChange = (adapterId: string) => {
    setSelectedAdapter(adapterId);
    const adapter = SUPPORTED_ADAPTERS.find((a) => a.id === adapterId);
    if (adapter && adapter.baseUrl) {
      setInputUrl(adapter.baseUrl);
    }
  };

  // Handle URL Scan
  const handleScanUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatusMessage(null);
    setScanResultNotice(null);

    const validation = validateSafeUrl(inputUrl);
    if (!validation.isValid) {
      showToast(validation.error || 'Invalid URL', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchDiscoveredProducts(inputUrl, selectedAdapter, targetCategory, products);
      const items = res.items || [];
      setDiscoveredItems(items);

      if (items.length === 0) {
        setScanResultNotice(
          res.message ||
            (lang === 'bn'
              ? 'এই URL থেকে কোনো পণ্য পাওয়া যায়নি। নিশ্চিত করুন এটি কোনো পণ্য বা ক্যাটালগ পেজ, অথবা নিচের CSV ইম্পোর্টার ব্যবহার করুন।'
              : 'No products found at this URL. Please verify the URL points to a product page/catalog, or use the CSV importer.')
        );
        showToast(
          lang === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No products found at this URL',
          'info'
        );
      } else {
        // Pre-select new items (non-duplicates)
        const newIndices = items
          .map((item, idx) => (!item.duplicateCandidate ? idx : -1))
          .filter((idx) => idx !== -1);
        setSelectedIndices(newIndices);
        showToast(
          lang === 'bn'
            ? `${items.length} টি পণ্য সফলভাবে স্ক্যান করা হয়েছে`
            : `Discovered ${items.length} products`
        );
      }
    } catch (err: any) {
      setScanResultNotice(err.message || 'Scrape failed');
      showToast(err.message || 'Failed to scan catalog', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CSV file upload
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const items = await parseDistributorCSV(text, products);
      setDiscoveredItems(items);
      const newIndices = items
        .map((item, idx) => (!item.duplicateCandidate ? idx : -1))
        .filter((idx) => idx !== -1);
      setSelectedIndices(newIndices);
      showToast(lang === 'bn' ? `CSV থেকে ${items.length} টি পণ্য প্রস্তুত করা হয়েছে` : `Parsed ${items.length} items from CSV`);
    } catch (err: any) {
      showToast(err.message || 'CSV parse failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection
  const toggleSelect = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIndices.length === discoveredItems.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(discoveredItems.map((_, i) => i));
    }
  };

  // Perform batch import
  const handleImportSelected = async () => {
    if (selectedIndices.length === 0) {
      showToast(lang === 'bn' ? 'অনুগ্রহ করে অন্তত একটি পণ্য নির্বাচন করুন' : 'Select at least one product', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const itemsToImport = selectedIndices.map((i) => discoveredItems[i]);

      const newProductList: Product[] = itemsToImport.map((item, index) => {
        const sku = 'IMP-' + item.brand.slice(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-4) + index;
        return {
          id: 'prod_' + Date.now() + '_' + index,
          sku,
          name: item.name,
          brand: item.brand,
          model: item.model,
          category: item.category || targetCategory,
          sellingPrice: item.price,
          purchaseCost: Math.round(item.price * 0.9), // Sensible wholesale estimate
          minPrice: Math.round(item.price * 0.95),
          reorderLevel: 3,
          warranty: item.specs.warrantyMonths ? `${item.specs.warrantyMonths / 12} Years Official Warranty` : '1 Year Warranty',
          status: item.inStock ? 'active' : 'out_of_stock',
          sourceName: item.sourceWebsite,
          supplierUrl: item.sourceUrl,
          totalStock: item.inStock ? 5 : 0,
          stockByLocation: {
            loc_sylhet: item.inStock ? 2 : 0,
            loc_dhaka: item.inStock ? 3 : 0,
          },
          specs: item.specs,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      const count = await dbService.batchAddProducts(newProductList, {
        uid: currentUser.uid,
        name: currentUser.displayName,
      });

      await refreshData();
      setImportStatusMessage(
        lang === 'bn'
          ? `সফলভাবে ${count} টি নতুন পণ্য ইনভেন্টরি ডাটাবেজে অন্তর্ভুক্ত করা হয়েছে!`
          : `Successfully imported ${count} new products to inventory!`
      );
      showToast(lang === 'bn' ? `${count} টি পণ্য ইম্পোর্ট সম্পন্ন` : `Imported ${count} products`);
      setDiscoveredItems([]);
      setSelectedIndices([]);
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Download Sample CSV template
  const handleDownloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(getSampleCSVTemplate());
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'smartit_distributor_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.importer.title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t.importer.subtitle}</p>
      </div>

      {/* Security notice & source integrity */}
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
        <ShieldAlert className="h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <p className="font-semibold">{t.importer.securityNotice}</p>
          <p className="text-blue-700 mt-0.5 text-[11px]">
            {lang === 'bn'
              ? 'নিরাপত্তা নিশ্চিত করতে লোকালহোস্ট, অভ্যন্তরীণ IP ও ক্লাউড মেটাডেটা রিকোয়েস্ট সম্পূর্ণ ব্লক করা আছে।'
              : 'Outbound HTTP requests restrict private ranges, cloud metadata, and validate public origins.'}
          </p>
        </div>
      </div>

      {/* Source Method Tabs (Web Scanner vs CSV File) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('url_scan')}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'url_scan' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>{lang === 'bn' ? 'ওয়েব ক্যাটালগ স্ক্যানার' : 'Web Catalog Scanner'}</span>
        </button>
        <button
          onClick={() => setActiveTab('csv_upload')}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'csv_upload' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>{lang === 'bn' ? 'ডিস্ট্রিবিউটর CSV / Excel ফাইল' : 'Distributor CSV / Sheet'}</span>
        </button>
      </div>

      {/* Tab 1: Web URL Scanner */}
      {activeTab === 'url_scan' && (
        <form onSubmit={handleScanUrl} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.importer.urlInputLabel}</label>
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://www.startech.com.bd/component/processor"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t.importer.selectAdapter}</label>
              <select
                value={selectedAdapter}
                onChange={(e) => handleAdapterChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
              >
                {SUPPORTED_ADAPTERS.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick preset URLs for fast testing */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-slate-500">
              {lang === 'bn' ? 'দ্রুত টেস্ট লিংক:' : 'Quick Test URLs:'}
            </span>
            <button
              type="button"
              onClick={() => {
                setInputUrl('https://www.startech.com.bd/component/processor');
                setSelectedAdapter('startech');
                setTargetCategory('Processor');
              }}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-100"
            >
              Star Tech (Catalog)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputUrl('https://www.startech.com.bd/amd-athlon-pro-300ge-processor');
                setSelectedAdapter('startech');
                setTargetCategory('Processor');
              }}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-blue-700 hover:bg-blue-50"
            >
              Star Tech (Single Product Page)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputUrl('https://www.ryans.com/category/desktop-component-processor');
                setSelectedAdapter('ryans');
                setTargetCategory('Processor');
              }}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-100"
            >
              Ryans (Catalog)
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{lang === 'bn' ? 'টার্গেট ক্যাটাগরি:' : 'Target Category:'}</span>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 py-1 px-2 text-xs text-slate-700"
              >
                {['Processor', 'Motherboard', 'RAM', 'Graphics Card', 'Storage', 'Power Supply', 'Casing', 'Monitor'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{lang === 'bn' ? 'স্ক্যান হচ্ছে...' : 'Scanning Catalog...'}</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="h-4 w-4" />
                  <span>{t.importer.fetchButton}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Honest diagnostic banner when scan yielded zero products */}
      {scanResultNotice && discoveredItems.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs space-y-2">
          <div className="flex items-start gap-2.5 text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">{lang === 'bn' ? 'স্ক্যান ফলাফল ও নির্দেশনা' : 'Scan Diagnostic & Next Step'}</p>
              <p className="text-amber-800 mt-1 leading-relaxed">{scanResultNotice}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 pl-7">
            <button
              type="button"
              onClick={() => setActiveTab('csv_upload')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{lang === 'bn' ? 'CSV / Excel ফাইল দিয়ে আপলোড করুন' : 'Switch to CSV / Excel Import'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputUrl('https://www.startech.com.bd/amd-athlon-pro-300ge-processor');
                setSelectedAdapter('startech');
              }}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              {lang === 'bn' ? 'প্রোডাক্ট পেজ ট্রাই করুন' : 'Try Direct Product Page'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Distributor CSV Upload */}
      {activeTab === 'csv_upload' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">{t.importer.csvUploadOption}</h3>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{lang === 'bn' ? 'নমুনা CSV টেমপ্লেট ডাউনলোড' : 'Download Sample CSV'}</span>
            </button>
          </div>

          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 hover:bg-slate-50 cursor-pointer transition-colors">
            <Upload className="h-8 w-8 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-700">{t.importer.dropCsvHere}</span>
            <span className="text-[11px] text-slate-400 mt-1">Supports UTF-8 CSV with headers (Name, Brand, Model, Price, Stock)</span>
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
          </label>
        </div>
      )}

      {/* Success banner */}
      {importStatusMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{importStatusMessage}</span>
        </div>
      )}

      {/* Discovered Products Preview Table */}
      {discoveredItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 p-4 gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.importer.previewTitle}</h3>
              <p className="text-xs text-slate-500">
                {discoveredItems.length} {lang === 'bn' ? 'টি পণ্য পাওয়া গেছে' : 'items discovered'} • {selectedIndices.length} {lang === 'bn' ? 'টি নির্বাচিত' : 'selected for import'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {selectedIndices.length === discoveredItems.length
                  ? (lang === 'bn' ? 'সকল আনচেক' : 'Deselect All')
                  : (lang === 'bn' ? 'সকল নির্বাচন' : 'Select All')}
              </button>
              <button
                type="button"
                onClick={handleImportSelected}
                disabled={selectedIndices.length === 0 || isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Check className="h-4 w-4" />
                <span>{t.importer.importSelected} ({selectedIndices.length})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIndices.length === discoveredItems.length && discoveredItems.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600"
                    />
                  </th>
                  <th className="px-4 py-3">{t.products.productName}</th>
                  <th className="px-4 py-3">{t.products.category}</th>
                  <th className="px-4 py-3 text-right">{t.products.sellingPrice}</th>
                  <th className="px-4 py-3">{t.common.status}</th>
                  <th className="px-4 py-3">উৎস ও ডুপ্লিকেট স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discoveredItems.map((item, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  const isDuplicate = !!item.duplicateCandidate;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDuplicate ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(idx)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Brand: {item.brand} • Model: {item.model}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatBDT(item.price, lang)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.stockText}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isDuplicate ? (
                          <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>{t.importer.duplicateFound}: {item.duplicateCandidate?.sku}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>{t.importer.newProductReady}</span>
                          </div>
                        )}
                        <span className="text-[9px] text-slate-400 block mt-0.5">{item.sourceWebsite}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
