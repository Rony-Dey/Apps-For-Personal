import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Boxes,
  Check,
  CheckCircle2,
  Cpu,
  DollarSign,
  FileText,
  FolderHeart,
  HardDrive,
  Info,
  Layers,
  Monitor,
  Mouse,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT, formatDate } from '../../i18n/translations';
import { checkPCCompatibility } from '../../services/compatibility';
import { dbService } from '../../services/db';
import {
  BuildPurpose,
  PCBuildComponentSelection,
  Product,
  SavedPCBuild,
} from '../../types';

export const PCBuilderView: React.FC = () => {
  const {
    lang,
    t,
    products,
    locations,
    setActiveTab,
    setPrefilledPCBuildQuote,
    showToast,
    canViewCost,
    currentUser,
  } = useApp();

  const [customerName, setCustomerName] = useState('Md. Sazzad Hossain');
  const [budget, setBudget] = useState<number>(75000);
  const [purpose, setPurpose] = useState<BuildPurpose>('gaming');
  const [targetLocation, setTargetLocation] = useState('loc_sylhet');

  // Selected components
  const [selection, setSelection] = useState<PCBuildComponentSelection>({
    cpu: products.find((p) => p.id === 'prod_cpu_13400'),
    motherboard: products.find((p) => p.id === 'prod_mb_msi_b760m'),
    ram: products.find((p) => p.id === 'prod_ram_corsair_d5_16gb'),
    ramQuantity: 1,
    storage: products.find((p) => p.id === 'prod_ssd_samsung_980pro'),
    gpu: products.find((p) => p.id === 'prod_gpu_gigabyte_rtx4060'),
    psu: products.find((p) => p.id === 'prod_psu_deepcool_pk650d'),
    case: products.find((p) => p.id === 'prod_case_montech_air100'),
    cooler: products.find((p) => p.id === 'prod_clr_deepcool_ak400'),
    monitor: products.find((p) => p.id === 'prod_mon_lg_24mr400'),
  });

  // Saved builds state
  const [savedBuilds, setSavedBuilds] = useState<SavedPCBuild[]>([]);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [buildSaveName, setBuildSaveName] = useState('');
  const [buildSaveNotes, setBuildSaveNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadSavedBuilds = async () => {
    try {
      const list = await dbService.getPCBuilds();
      setSavedBuilds(list);
    } catch (err) {
      console.error('Failed to load saved builds', err);
    }
  };

  useEffect(() => {
    loadSavedBuilds();
  }, []);

  // Modal selector state
  const [selectorSlot, setSelectorSlot] = useState<keyof PCBuildComponentSelection | null>(null);

  // Run Rule-Based Compatibility Engine
  const compatibility = useMemo(() => {
    return checkPCCompatibility(selection, lang);
  }, [selection, lang]);

  // Calculate total build cost & price
  const totalPrice = useMemo(() => {
    let sum = 0;
    if (selection.cpu) sum += selection.cpu.sellingPrice;
    if (selection.motherboard) sum += selection.motherboard.sellingPrice;
    if (selection.ram) sum += selection.ram.sellingPrice * (selection.ramQuantity || 1);
    if (selection.storage) sum += selection.storage.sellingPrice;
    if (selection.gpu) sum += selection.gpu.sellingPrice;
    if (selection.psu) sum += selection.psu.sellingPrice;
    if (selection.case) sum += selection.case.sellingPrice;
    if (selection.cooler) sum += selection.cooler.sellingPrice;
    if (selection.monitor) sum += selection.monitor.sellingPrice;
    return sum;
  }, [selection]);

  const totalCost = useMemo(() => {
    let sum = 0;
    if (selection.cpu) sum += selection.cpu.purchaseCost;
    if (selection.motherboard) sum += selection.motherboard.purchaseCost;
    if (selection.ram) sum += selection.ram.purchaseCost * (selection.ramQuantity || 1);
    if (selection.storage) sum += selection.storage.purchaseCost;
    if (selection.gpu) sum += selection.gpu.purchaseCost;
    if (selection.psu) sum += selection.psu.purchaseCost;
    if (selection.case) sum += selection.case.purchaseCost;
    if (selection.cooler) sum += selection.cooler.purchaseCost;
    if (selection.monitor) sum += selection.monitor.purchaseCost;
    return sum;
  }, [selection]);

  const estimatedMargin = totalPrice - totalCost;
  const marginPercent = totalPrice > 0 ? Math.round((estimatedMargin / totalPrice) * 100) : 0;
  const budgetDifference = budget - totalPrice;

  // Component slot definitions
  const componentSlots: {
    key: keyof PCBuildComponentSelection;
    label: string;
    labelBn: string;
    category: string;
    icon: React.FC<{ className?: string }>;
    required: boolean;
  }[] = [
    { key: 'cpu', label: 'Processor (CPU)', labelBn: 'প্রসেসর', category: 'Processor', icon: Cpu, required: true },
    { key: 'motherboard', label: 'Motherboard', labelBn: 'মাদারবোর্ড', category: 'Motherboard', icon: Server, required: true },
    { key: 'ram', label: 'Memory (RAM)', labelBn: 'র‌্যাম মেমরি', category: 'RAM', icon: Zap, required: true },
    { key: 'storage', label: 'Solid State Drive (SSD)', labelBn: 'এসএসডি / স্টোরেজ', category: 'Storage', icon: HardDrive, required: true },
    { key: 'gpu', label: 'Graphics Card (GPU)', labelBn: 'গ্রাফিক্স কার্ড', category: 'Graphics Card', icon: Monitor, required: false },
    { key: 'psu', label: 'Power Supply Unit (PSU)', labelBn: 'পাওয়ার সাপ্লাই', category: 'Power Supply', icon: Zap, required: true },
    { key: 'case', label: 'Casing / Cabinet', labelBn: 'কেসিং', category: 'Casing', icon: Boxes, required: true },
    { key: 'cooler', label: 'CPU Cooler', labelBn: 'কুলার', category: 'CPU Cooler', icon: Server, required: false },
    { key: 'monitor', label: 'Display Monitor', labelBn: 'মনিটর', category: 'Monitor', icon: Monitor, required: false },
  ];

  // Component selection action
  const handleSelectProduct = (product: Product) => {
    if (!selectorSlot) return;
    setSelection((prev) => ({
      ...prev,
      [selectorSlot]: product,
    }));
    setSelectorSlot(null);
  };

  const handleRemoveProduct = (key: keyof PCBuildComponentSelection) => {
    setSelection((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Convert to Quotation
  const handleConvertToQuotation = () => {
    const items = [];
    if (selection.cpu) items.push(selection.cpu);
    if (selection.motherboard) items.push(selection.motherboard);
    if (selection.ram) items.push({ ...selection.ram, quantity: selection.ramQuantity || 1 });
    if (selection.storage) items.push(selection.storage);
    if (selection.gpu) items.push(selection.gpu);
    if (selection.psu) items.push(selection.psu);
    if (selection.case) items.push(selection.case);
    if (selection.cooler) items.push(selection.cooler);
    if (selection.monitor) items.push(selection.monitor);

    if (items.length === 0) {
      showToast(lang === 'bn' ? 'অনুগ্রহ করে অন্তত একটি পণ্য নির্বাচন করুন' : 'Select at least one component', 'error');
      return;
    }

    setPrefilledPCBuildQuote({
      customerName,
      purpose,
      items,
      totalPrice,
    });

    setActiveTab('quotations');
    showToast(lang === 'bn' ? 'পিসি বিল্ড কোটেশনে অন্তর্ভুক্ত করা হয়েছে' : 'PC build transferred to Quotation builder');
  };

  // Open save modal
  const handleOpenSaveModal = () => {
    const defaultName = `${customerName ? customerName + ' - ' : ''}${purpose.toUpperCase()} PC Setup (${formatBDT(totalPrice, 'en')})`;
    setBuildSaveName(defaultName);
    setBuildSaveNotes('');
    setIsSaveModalOpen(true);
  };

  // Confirm save build
  const handleConfirmSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildSaveName.trim()) {
      showToast(lang === 'bn' ? 'বিল্ডের নাম দিন' : 'Please provide a build name', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await dbService.savePCBuild(
        {
          name: buildSaveName.trim(),
          customerName,
          budget,
          purpose,
          targetLocationId: targetLocation,
          components: selection,
          totalPrice,
          totalEstimatedCost: totalCost,
          compatibilityResult: compatibility,
          notes: buildSaveNotes,
        },
        { uid: currentUser.uid, name: currentUser.displayName }
      );
      showToast(lang === 'bn' ? 'পিসি বিল্ড সফলভাবে ডাটাবেসে সংরক্ষিত হয়েছে' : 'PC build saved successfully to database');
      setIsSaveModalOpen(false);
      await loadSavedBuilds();
    } catch (err: any) {
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Load a saved build into active configuration
  const handleLoadSavedBuild = (build: SavedPCBuild) => {
    setSelection(build.components || {});
    if (build.customerName) setCustomerName(build.customerName);
    if (build.budget) setBudget(build.budget);
    if (build.purpose) setPurpose(build.purpose);
    if (build.targetLocationId) setTargetLocation(build.targetLocationId);
    setIsSavedDrawerOpen(false);
    showToast(lang === 'bn' ? `"${build.name}" লোড করা হয়েছে!` : `Loaded "${build.name}"!`);
  };

  // Delete saved build
  const handleDeleteSavedBuild = async (buildId: string, name: string) => {
    if (confirm(lang === 'bn' ? `আপনি কি "${name}" বিল্ডটি মুছে ফেলতে চান?` : `Delete saved build "${name}"?`)) {
      try {
        await dbService.deletePCBuild(buildId, { uid: currentUser.uid, name: currentUser.displayName });
        showToast(lang === 'bn' ? 'বিল্ড মুছে ফেলা হয়েছে' : 'Saved build deleted');
        await loadSavedBuilds();
      } catch (err: any) {
        showToast('Delete failed: ' + err.message, 'error');
      }
    }
  };

  // Convert saved build directly to quotation
  const handleSavedBuildToQuotation = (build: SavedPCBuild) => {
    const items = [];
    const b = build.components;
    if (b.cpu) items.push(b.cpu);
    if (b.motherboard) items.push(b.motherboard);
    if (b.ram) items.push({ ...b.ram, quantity: b.ramQuantity || 1 });
    if (b.storage) items.push(b.storage);
    if (b.gpu) items.push(b.gpu);
    if (b.psu) items.push(b.psu);
    if (b.case) items.push(b.case);
    if (b.cooler) items.push(b.cooler);
    if (b.monitor) items.push(b.monitor);

    setPrefilledPCBuildQuote({
      customerName: build.customerName || 'PC Build Customer',
      purpose: build.purpose,
      items,
      totalPrice: build.totalPrice,
    });

    setIsSavedDrawerOpen(false);
    setActiveTab('quotations');
    showToast(lang === 'bn' ? 'সংরক্ষিত বিল্ড কোটেশনে পাঠানো হয়েছে' : 'Saved build transferred to Quotations');
  };

  // Reset build
  const handleClearBuild = () => {
    setSelection({});
    showToast(lang === 'bn' ? 'বিল্ড পরিষ্কার করা হয়েছে' : 'PC build cleared');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.pcBuilder.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.pcBuilder.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSavedDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Bookmark className="h-4 w-4 text-blue-600" />
            <span>{lang === 'bn' ? 'সংরক্ষিত বিল্ডসমূহ' : 'Saved Builds'}</span>
            <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
              {savedBuilds.length}
            </span>
          </button>
          <button
            onClick={handleOpenSaveModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-100 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{lang === 'bn' ? 'বিল্ড সংরক্ষণ' : 'Save Build'}</span>
          </button>
          <button
            onClick={handleClearBuild}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t.pcBuilder.clearBuild}</span>
          </button>
          <button
            onClick={handleConvertToQuotation}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>{t.pcBuilder.convertToQuote}</span>
          </button>
        </div>
      </div>

      {/* Configuration Header Controls: Customer, Budget, Purpose, Location */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.pcBuilder.customerName}</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              placeholder="e.g. Tanvir Ahmed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.pcBuilder.budget}</label>
            <input
              type="number"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.pcBuilder.purpose}</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
            >
              <option value="gaming">{t.pcBuilder.purposes.gaming}</option>
              <option value="office">{t.pcBuilder.purposes.office}</option>
              <option value="programming">{t.pcBuilder.purposes.programming}</option>
              <option value="editing">{t.pcBuilder.purposes.editing}</option>
              <option value="graphics">{t.pcBuilder.purposes.graphics}</option>
              <option value="workstation">{t.pcBuilder.purposes.workstation}</option>
              <option value="education">{t.pcBuilder.purposes.education}</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">স্টক যাচাই লোকেশন</label>
            <select
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compatibility Banner & Budget Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compatibility Status Card */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">{t.pcBuilder.compatibilityStatus}:</span>
              {compatibility.status === 'compatible' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{t.pcBuilder.compatible}</span>
                </span>
              )}
              {compatibility.status === 'incompatible' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>{t.pcBuilder.incompatible}</span>
                </span>
              )}
              {compatibility.status === 'needs_verification' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>{t.pcBuilder.needsVerification}</span>
                </span>
              )}
            </div>

            {/* Estimated Power Meter */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>
                {t.pcBuilder.estimatedPower}: <strong>{compatibility.estimatedWattage}W</strong> (PSU Recom: {compatibility.recommendedPsuWattage}W)
              </span>
            </div>
          </div>

          {/* Issues / Notes list */}
          <div className="mt-3 space-y-1.5 text-xs">
            {compatibility.errors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-rose-50 p-2 text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{err}</span>
              </div>
            ))}
            {compatibility.warnings.map((warn, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{warn}</span>
              </div>
            ))}
            {compatibility.notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2 text-slate-600 px-1 py-0.5 text-[11px]">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget & Price Tracker Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">{t.pcBuilder.totalBuildPrice}</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatBDT(totalPrice, lang)}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t.pcBuilder.budget}:</span>
                <span className="font-semibold text-slate-900">{formatBDT(budget, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span>{budgetDifference >= 0 ? t.pcBuilder.budgetRemaining : t.pcBuilder.budgetExceeded}:</span>
                <span className={`font-bold ${budgetDifference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatBDT(Math.abs(budgetDifference), lang)} {budgetDifference < 0 ? '(Over)' : ''}
                </span>
              </div>

              {canViewCost && (
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Gross Profit Margin:</span>
                  <span className="font-semibold text-slate-700">
                    {formatBDT(estimatedMargin, lang)} ({marginPercent}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleConvertToQuotation}
            className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>{t.pcBuilder.convertToQuote}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Component Selection Rows */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {lang === 'bn' ? 'নির্বাচিত যন্ত্রাংশসমূহ' : 'Selected Components'}
          </h3>
          <span className="text-xs text-slate-500">
            {Object.values(selection).filter(Boolean).length} / {componentSlots.length} {lang === 'bn' ? 'নির্বাচিত' : 'selected'}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {componentSlots.map((slot) => {
            const Icon = slot.icon;
            const selectedItem: Product | undefined = (selection as any)[slot.key];

            return (
              <div
                key={slot.key}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                {/* Left: Slot details & selected product */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        {lang === 'bn' ? slot.labelBn : slot.label}
                      </span>
                      {slot.required && <span className="text-[10px] text-rose-500 font-bold">*</span>}
                    </div>

                    {selectedItem ? (
                      <div className="mt-1">
                        <p className="text-xs font-bold text-blue-700">{selectedItem.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                          <span>SKU: {selectedItem.sku}</span>
                          <span>•</span>
                          <span>{selectedItem.warranty}</span>
                          {selectedItem.specs.socket && <span>• Socket: {selectedItem.specs.socket}</span>}
                          {selectedItem.specs.ramType && <span>• {selectedItem.specs.ramType}</span>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-0.5">
                        {lang === 'bn' ? 'কোনো পণ্য নির্বাচিত হয়নি' : 'No component selected'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Price & Selection Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {selectedItem && (
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatBDT(selectedItem.sellingPrice, lang)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">
                        {selectedItem.totalStock > 0 ? `${selectedItem.totalStock} in stock` : 'Out of stock'}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    {selectedItem ? (
                      <>
                        <button
                          onClick={() => setSelectorSlot(slot.key)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {lang === 'bn' ? 'বদলান' : 'Change'}
                        </button>
                        <button
                          onClick={() => handleRemoveProduct(slot.key)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectorSlot(slot.key)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t.pcBuilder.selectComponent}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product Selection Modal */}
      {selectorSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'bn' ? 'যন্ত্রাংশ নির্বাচন করুন' : 'Select Hardware Component'}
                </h3>
                <p className="text-xs text-slate-400">
                  Category:{' '}
                  {componentSlots.find((s) => s.key === selectorSlot)?.category}
                </p>
              </div>
              <button
                onClick={() => setSelectorSlot(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {products
                .filter((p) => {
                  const targetCat = componentSlots.find((s) => s.key === selectorSlot)?.category;
                  return p.category === targetCat;
                })
                .map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="p-3 hover:bg-blue-50/70 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{product.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{product.brand}</span>
                        {product.specs.socket && <span>• Socket: {product.specs.socket}</span>}
                        {product.specs.ramType && <span>• RAM: {product.specs.ramType}</span>}
                        <span>• Warranty: {product.warranty}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span className="text-sm font-bold text-slate-900 block">
                        {formatBDT(product.sellingPrice, lang)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium">
                        {product.totalStock} in stock
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Build Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {lang === 'bn' ? 'পিসি বিল্ড কনফিগারেশন সংরক্ষণ করুন' : 'Save PC Build Configuration'}
                </h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'বিল্ডের নাম *' : 'Build Name / Label *'}
                </label>
                <input
                  type="text"
                  required
                  value={buildSaveName}
                  onChange={(e) => setBuildSaveName(e.target.value)}
                  placeholder="e.g. Ryzen 5 7600 Gaming Setup"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'গ্রাহকের নাম' : 'Customer Name'}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'উদ্দেশ্য' : 'Purpose'}
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as BuildPurpose)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="gaming">Gaming</option>
                    <option value="office">Office / Corporate</option>
                    <option value="editing">Video Editing & 3D</option>
                    <option value="workstation">Data & AI Workstation</option>
                    <option value="custom">Custom Build</option>
                  </select>
                </div>
              </div>

              {/* Build Summary Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{lang === 'bn' ? 'মোট বিক্রয় মূল্য:' : 'Total Price:'}</span>
                  <span className="font-bold text-slate-900 font-mono">{formatBDT(totalPrice, 'en')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{lang === 'bn' ? 'আনুমানিক পাওয়ার ব্যবহার:' : 'Estimated Power:'}</span>
                  <span className="font-mono text-slate-700">{compatibility.estimatedWattage}W (Rec. {compatibility.recommendedPsuWattage}W)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{lang === 'bn' ? 'কম্প্যাটিবিলিটি স্ট্যাটাস:' : 'Compatibility:'}</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      compatibility.status === 'compatible'
                        ? 'bg-emerald-100 text-emerald-800'
                        : compatibility.status === 'incompatible'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {compatibility.status.toUpperCase().replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'মন্তব্য বা কাস্টম রিকোয়ারমেন্ট' : 'Internal Notes / Requirements'}
                </label>
                <textarea
                  rows={2}
                  value={buildSaveNotes}
                  onChange={(e) => setBuildSaveNotes(e.target.value)}
                  placeholder="e.g. Needs ARGB sync cable, client will pickup on Friday..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : lang === 'bn' ? 'সংরক্ষণ সম্পন্ন করুন' : 'Confirm Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Builds Drawer / Modal */}
      {isSavedDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {lang === 'bn' ? 'সংরক্ষিত কাস্টম পিসি বিল্ডসমূহ' : 'Saved Custom PC Builds'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {savedBuilds.length} {lang === 'bn' ? 'টি বিল্ড ডাটাবেসে সংরক্ষিত আছে' : 'configurations stored in database'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSavedDrawerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
              {savedBuilds.length === 0 ? (
                <div className="py-12 text-center">
                  <Bookmark className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">
                    {lang === 'bn' ? 'কোনো সংরক্ষিত বিল্ড নেই' : 'No saved builds found'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'bn'
                      ? 'যন্ত্রাংশ নির্বাচন করে উপরে "বিল্ড সংরক্ষণ" বাটনে ক্লিক করুন।'
                      : 'Select hardware components and click "Save Build" to store.'}
                  </p>
                </div>
              ) : (
                savedBuilds.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-2.5 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{b.name}</h4>
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                            {b.purpose}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              b.compatibilityResult?.status === 'compatible'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.compatibilityResult?.status === 'incompatible'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {b.compatibilityResult?.status?.toUpperCase() || 'CHECK'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {b.customerName ? `Client: ${b.customerName} • ` : ''}Saved: {formatDate(b.createdAt, lang)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900 font-mono block">
                            {formatBDT(b.totalPrice, 'en')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ~{b.compatibilityResult?.estimatedWattage || 350}W
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-2">
                          <button
                            onClick={() => handleLoadSavedBuild(b)}
                            className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                            title="Load into workspace"
                          >
                            {lang === 'bn' ? 'বিল্ডারে খুলুন' : 'Load Build'}
                          </button>
                          <button
                            onClick={() => handleSavedBuildToQuotation(b)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100"
                            title="Direct to Quotations"
                          >
                            {lang === 'bn' ? 'কোটেশন বানান' : 'Quote'}
                          </button>
                          <button
                            onClick={() => handleDeleteSavedBuild(b.id, b.name)}
                            className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Component Chips */}
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {b.components?.cpu && (
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                          CPU: {b.components.cpu.name}
                        </span>
                      )}
                      {b.components?.motherboard && (
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                          MB: {b.components.motherboard.name}
                        </span>
                      )}
                      {b.components?.ram && (
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                          RAM: {b.components.ram.name}
                        </span>
                      )}
                      {b.components?.gpu && (
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                          GPU: {b.components.gpu.name}
                        </span>
                      )}
                      {b.components?.storage && (
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                          Storage: {b.components.storage.name}
                        </span>
                      )}
                      {b.components?.psu && (
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                          PSU: {b.components.psu.name}
                        </span>
                      )}
                      {b.components?.case && (
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                          Case: {b.components.case.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

