import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Check,
  Download,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../i18n/translations';
import { dbService } from '../../services/db';
import { HardwareSpecs, Product } from '../../types';

export const ProductsView: React.FC = () => {
  const {
    lang,
    t,
    products,
    locations,
    suppliers,
    refreshData,
    showToast,
    canViewCost,
    currentUser,
    searchQuery: globalSearch,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    brand: '',
    model: '',
    category: 'Processor',
    subcategory: '',
    barcode: '',
    imageUrl: '',
    purchaseCost: 0,
    sellingPrice: 0,
    minPrice: 0,
    reorderLevel: 5,
    warranty: '3 Years Replacement Warranty',
    supplierId: '',
    description: '',
    // Hardware Specs
    socket: '',
    ramType: 'DDR5' as 'DDR4' | 'DDR5' | 'DDR3',
    formFactor: 'Micro-ATX' as 'ATX' | 'Micro-ATX' | 'Mini-ITX' | 'E-ATX',
    storageInterface: 'M.2 NVMe PCIe 4.0' as any,
    powerWattage: 65,
    coolerTdpRating: 65,
    gpuWattage: 0,
    gpuLengthMm: 0,
    psuWattage: 0,
    caseMaxGpuLengthMm: 330,
    // Stock inputs for default locations
    stockSylhet: 5,
    stockDhaka: 10,
  });

  // Unique categories & brands for filters
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [products]);

  // Duplicate warning detection
  const duplicateWarning = useMemo(() => {
    if (!formData.sku && !formData.model) return null;
    return products.find(
      (p) =>
        p.id !== editingProduct?.id &&
        ((formData.sku && p.sku.toLowerCase() === formData.sku.trim().toLowerCase()) ||
          (formData.model && p.model.toLowerCase() === formData.model.trim().toLowerCase()))
    );
  }, [formData.sku, formData.model, products, editingProduct]);

  // Filtered products list
  const effectiveSearch = search || globalSearch;
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (effectiveSearch) {
        const q = effectiveSearch.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchModel = p.model.toLowerCase().includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchModel && !matchBrand) return false;
      }

      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;

      if (stockFilter === 'in_stock' && p.totalStock <= 0) return false;
      if (stockFilter === 'low_stock' && (p.totalStock > p.reorderLevel || p.totalStock === 0)) return false;
      if (stockFilter === 'out_of_stock' && p.totalStock > 0) return false;

      return true;
    });
  }, [products, effectiveSearch, selectedCategory, selectedBrand, stockFilter]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: 'SKU-' + Date.now().toString().slice(-6),
      name: '',
      brand: '',
      model: '',
      category: 'Processor',
      subcategory: '',
      barcode: '',
      imageUrl: '',
      purchaseCost: 0,
      sellingPrice: 0,
      minPrice: 0,
      reorderLevel: 5,
      warranty: '3 Years Replacement Warranty',
      supplierId: suppliers[0]?.id || '',
      description: '',
      socket: 'LGA1700',
      ramType: 'DDR5',
      formFactor: 'Micro-ATX',
      storageInterface: 'M.2 NVMe PCIe 4.0',
      powerWattage: 65,
      coolerTdpRating: 65,
      gpuWattage: 0,
      gpuLengthMm: 0,
      psuWattage: 0,
      caseMaxGpuLengthMm: 330,
      stockSylhet: 5,
      stockDhaka: 10,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      model: p.model,
      category: p.category,
      subcategory: p.subcategory || '',
      barcode: p.barcode || '',
      imageUrl: p.imageUrl || '',
      purchaseCost: p.purchaseCost,
      sellingPrice: p.sellingPrice,
      minPrice: p.minPrice || p.sellingPrice,
      reorderLevel: p.reorderLevel,
      warranty: p.warranty,
      supplierId: p.supplierId || '',
      description: p.description || '',
      socket: p.specs.socket || '',
      ramType: p.specs.ramType || 'DDR5',
      formFactor: p.specs.formFactor || 'Micro-ATX',
      storageInterface: p.specs.storageInterface || 'M.2 NVMe PCIe 4.0',
      powerWattage: p.specs.powerWattage || 65,
      coolerTdpRating: p.specs.coolerTdpRating || 65,
      gpuWattage: p.specs.gpuWattage || 0,
      gpuLengthMm: p.specs.gpuLengthMm || 0,
      psuWattage: p.specs.psuWattage || 0,
      caseMaxGpuLengthMm: p.specs.caseMaxGpuLengthMm || 330,
      stockSylhet: p.stockByLocation['loc_sylhet'] || 0,
      stockDhaka: p.stockByLocation['loc_dhaka'] || 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.sellingPrice) {
      showToast('Please fill in required fields (Name, SKU, Selling Price)', 'error');
      return;
    }

    const stockByLocation: { [key: string]: number } = {
      loc_sylhet: Number(formData.stockSylhet) || 0,
      loc_dhaka: Number(formData.stockDhaka) || 0,
    };
    const totalStock = Object.values(stockByLocation).reduce((a, b) => a + b, 0);

    const specs: HardwareSpecs = {
      socket: formData.socket || undefined,
      ramType: formData.ramType,
      formFactor: formData.formFactor,
      storageInterface: formData.storageInterface,
      powerWattage: Number(formData.powerWattage) || undefined,
      coolerTdpRating: Number(formData.coolerTdpRating) || undefined,
      gpuWattage: Number(formData.gpuWattage) || undefined,
      gpuLengthMm: Number(formData.gpuLengthMm) || undefined,
      psuWattage: Number(formData.psuWattage) || undefined,
      caseMaxGpuLengthMm: Number(formData.caseMaxGpuLengthMm) || undefined,
      caseSupportedMotherboards: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    };

    const supplier = suppliers.find((s) => s.id === formData.supplierId);

    try {
      if (editingProduct) {
        await dbService.updateProduct(
          editingProduct.id,
          {
            sku: formData.sku,
            name: formData.name,
            brand: formData.brand,
            model: formData.model,
            category: formData.category,
            subcategory: formData.subcategory,
            barcode: formData.barcode,
            imageUrl: formData.imageUrl,
            purchaseCost: Number(formData.purchaseCost),
            sellingPrice: Number(formData.sellingPrice),
            minPrice: Number(formData.minPrice) || Number(formData.sellingPrice),
            reorderLevel: Number(formData.reorderLevel),
            warranty: formData.warranty,
            supplierId: formData.supplierId,
            supplierName: supplier?.name,
            description: formData.description,
            specs,
            stockByLocation,
            totalStock,
            status: totalStock > 0 ? 'active' : 'out_of_stock',
          },
          { uid: currentUser.uid, name: currentUser.displayName }
        );
        showToast(lang === 'bn' ? 'পণ্য সফলভাবে আপডেট করা হয়েছে' : 'Product updated successfully');
      } else {
        await dbService.addProduct(
          {
            sku: formData.sku,
            name: formData.name,
            brand: formData.brand,
            model: formData.model,
            category: formData.category,
            subcategory: formData.subcategory,
            barcode: formData.barcode,
            imageUrl: formData.imageUrl,
            purchaseCost: Number(formData.purchaseCost),
            sellingPrice: Number(formData.sellingPrice),
            minPrice: Number(formData.minPrice) || Number(formData.sellingPrice),
            reorderLevel: Number(formData.reorderLevel),
            warranty: formData.warranty,
            supplierId: formData.supplierId,
            supplierName: supplier?.name,
            description: formData.description,
            specs,
            stockByLocation,
            totalStock,
            status: totalStock > 0 ? 'active' : 'out_of_stock',
          },
          { uid: currentUser.uid, name: currentUser.displayName }
        );
        showToast(lang === 'bn' ? 'নতুন পণ্য ক্যাটালগে যোগ করা হয়েছে' : 'New product added to catalog');
      }

      setIsModalOpen(false);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (p: Product) => {
    if (confirm(`${t.products.confirmDelete}\n${p.name}`)) {
      try {
        await dbService.deleteProduct(p.id, { uid: currentUser.uid, name: currentUser.displayName });
        showToast(lang === 'bn' ? 'পণ্য মুছে ফেলা হয়েছে' : 'Product deleted successfully');
        await refreshData();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['SKU', 'Name', 'Brand', 'Model', 'Category', 'Selling Price', 'Cost', 'Stock', 'Warranty'];
    const rows = filteredProducts.map((p) => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.brand}"`,
      `"${p.model}"`,
      `"${p.category}"`,
      p.sellingPrice,
      canViewCost ? p.purchaseCost : 0,
      p.totalStock,
      `"${p.warranty}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smartit_products_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.products.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.products.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>{t.common.exportCsv}</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t.products.newProduct}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'bn' ? 'মডেল, নাম অথবা SKU দিয়ে ফিল্টার করুন...' : 'Search model, name or SKU...'}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-hidden"
        >
          <option value="all">{lang === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Brand filter */}
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-hidden"
        >
          <option value="all">{lang === 'bn' ? 'সকল ব্র্যান্ড' : 'All Brands'}</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Stock status filter */}
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as any)}
          className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-hidden"
        >
          <option value="all">{lang === 'bn' ? 'সকল স্টক অবস্থা' : 'All Stock Status'}</option>
          <option value="in_stock">{lang === 'bn' ? 'স্টকে আছে' : 'In Stock'}</option>
          <option value="low_stock">{lang === 'bn' ? 'কম স্টক (Low)' : 'Low Stock Alert'}</option>
          <option value="out_of_stock">{lang === 'bn' ? 'স্টক শেষ (Out)' : 'Out of Stock'}</option>
        </select>
      </div>

      {/* Product Catalog Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">{t.products.productName}</th>
                <th className="px-4 py-3">{t.products.category}</th>
                <th className="px-4 py-3">{t.products.specifications}</th>
                <th className="px-4 py-3">{t.products.stock}</th>
                <th className="px-4 py-3 text-right">{t.products.sellingPrice}</th>
                {canViewCost && <th className="px-4 py-3 text-right">{t.products.purchaseCost}</th>}
                <th className="px-4 py-3 text-center">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLow = p.totalStock <= p.reorderLevel && p.totalStock > 0;
                const isOut = p.totalStock === 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                        <span>SKU: {p.sku}</span>
                        <span>•</span>
                        <span>{p.brand}</span>
                        {p.warranty && <span>• {p.warranty.replace(' Replacement Warranty', '')}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[11px] text-slate-600">
                        {p.specs.socket && <span className="mr-1.5 font-semibold text-blue-700">{p.specs.socket}</span>}
                        {p.specs.ramType && <span className="mr-1.5 text-indigo-700">{p.specs.ramType}</span>}
                        {p.specs.formFactor && <span className="mr-1.5 text-slate-600">{p.specs.formFactor}</span>}
                        {p.specs.psuWattage ? `${p.specs.psuWattage}W` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.totalStock} {lang === 'bn' ? 'টি' : 'units'}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        Syl: {p.stockByLocation['loc_sylhet'] || 0} • Dhk: {p.stockByLocation['loc_dhaka'] || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatBDT(p.sellingPrice, lang)}
                    </td>
                    {canViewCost && (
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        {formatBDT(p.purchaseCost, lang)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingProduct(p)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="rounded p-1 text-rose-600 hover:bg-rose-50"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={canViewCost ? 7 : 6} className="py-8 text-center text-xs text-slate-400">
                    {t.common.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? (lang === 'bn' ? 'পণ্য সম্পাদনা' : 'Edit Product') : t.products.newProduct}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Duplicate warning */}
            {duplicateWarning && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {t.products.duplicateWarning}: <strong>{duplicateWarning.name}</strong> (SKU: {duplicateWarning.sku})
                </span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Product Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t.products.sku} *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t.products.productName} *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                    placeholder="e.g. Intel Core i5-13400 13th Gen Processor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t.products.brand} *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                    placeholder="e.g. Intel, MSI, Corsair"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t.products.model} *</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                    placeholder="e.g. Core i5-13400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t.products.category} *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  >
                    {[
                      'Processor',
                      'Motherboard',
                      'RAM',
                      'Graphics Card',
                      'Storage',
                      'Power Supply',
                      'Casing',
                      'CPU Cooler',
                      'Monitor',
                      'Accessories',
                    ].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Warranty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t.products.sellingPrice} (BDT) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                {canViewCost && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">{t.products.purchaseCost} (BDT)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.purchaseCost}
                      onChange={(e) => setFormData({ ...formData, purchaseCost: parseFloat(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono text-slate-600 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{t.common.warranty}</label>
                  <input
                    type="text"
                    value={formData.warranty}
                    onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                    placeholder="3 Years Replacement Warranty"
                  />
                </div>
              </div>

              {/* Multi-Location Stock Input */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-800 mb-2">{t.products.stockLocations}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Sylhet Showroom & Hub</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockSylhet}
                      onChange={(e) => setFormData({ ...formData, stockSylhet: parseInt(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Dhaka Central Warehouse</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stockDhaka}
                      onChange={(e) => setFormData({ ...formData, stockDhaka: parseInt(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Hardware Specifications (For Compatibility Engine) */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-3">
                <p className="text-xs font-bold text-blue-900">{t.products.specifications} (Compatibility Engine)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">{t.products.socket}</label>
                    <input
                      type="text"
                      value={formData.socket}
                      onChange={(e) => setFormData({ ...formData, socket: e.target.value })}
                      placeholder="e.g. LGA1700, AM5, AM4"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">{t.products.ramType}</label>
                    <select
                      value={formData.ramType}
                      onChange={(e) => setFormData({ ...formData, ramType: e.target.value as any })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                    >
                      <option value="DDR5">DDR5</option>
                      <option value="DDR4">DDR4</option>
                      <option value="DDR3">DDR3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">{t.products.formFactor}</label>
                    <select
                      value={formData.formFactor}
                      onChange={(e) => setFormData({ ...formData, formFactor: e.target.value as any })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                    >
                      <option value="Micro-ATX">Micro-ATX</option>
                      <option value="ATX">ATX</option>
                      <option value="Mini-ITX">Mini-ITX</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Power / TDP (Watts)</label>
                    <input
                      type="number"
                      value={formData.powerWattage}
                      onChange={(e) => setFormData({ ...formData, powerWattage: parseInt(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">PSU Wattage (If PSU)</label>
                    <input
                      type="number"
                      value={formData.psuWattage}
                      onChange={(e) => setFormData({ ...formData, psuWattage: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 650"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">GPU Length (mm)</label>
                    <input
                      type="number"
                      value={formData.gpuLengthMm}
                      onChange={(e) => setFormData({ ...formData, gpuLengthMm: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 242"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.products.supplier}</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="">{lang === 'bn' ? 'সাপ্লায়ার নির্বাচন করুন' : 'Select Supplier'}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">{t.common.notes} / বিবরণ</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  placeholder="Key features and specifications notes..."
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Product Details Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{viewingProduct.name}</h3>
              <button
                onClick={() => setViewingProduct(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block">{t.products.sku}:</span>
                  <span className="font-semibold text-slate-800 font-mono">{viewingProduct.sku}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t.products.brand}:</span>
                  <span className="font-semibold text-slate-800">{viewingProduct.brand} ({viewingProduct.model})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t.products.category}:</span>
                  <span className="font-semibold text-slate-800">{viewingProduct.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t.common.warranty}:</span>
                  <span className="font-semibold text-slate-800">{viewingProduct.warranty}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">{t.products.sellingPrice}:</span>
                <span className="text-base font-bold text-blue-600">{formatBDT(viewingProduct.sellingPrice, lang)}</span>
              </div>

              {canViewCost && (
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{t.products.purchaseCost}:</span>
                  <span className="font-mono text-slate-700">{formatBDT(viewingProduct.purchaseCost, lang)}</span>
                </div>
              )}

              <div>
                <span className="font-bold text-slate-800 block mb-1.5">{t.products.stockLocations}:</span>
                <div className="grid grid-cols-2 gap-2">
                  {locations.map((loc) => (
                    <div key={loc.id} className="border border-slate-200 rounded-lg p-2 bg-white">
                      <p className="text-[10px] text-slate-400">{loc.name}</p>
                      <p className="font-bold text-slate-800 text-sm">
                        {viewingProduct.stockByLocation[loc.id] || 0} {lang === 'bn' ? 'টি' : 'units'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {viewingProduct.description && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">{t.common.notes}:</span>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg leading-relaxed">
                    {viewingProduct.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewingProduct(null)}
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
