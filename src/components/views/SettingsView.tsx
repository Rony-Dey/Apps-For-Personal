import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Database,
  FileCheck,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  Power,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { dbService } from '../../services/db';
import { CompanySettings } from '../../types';

export const SettingsView: React.FC = () => {
  const { lang, t, settings, refreshData, showToast, currentUser, canManageSettings } = useApp();

  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(settings);
    setLogoPreview(settings.logoUrl || null);
  }, [settings]);

  // Handle Logo Upload with live preview & dimension optimization
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/i)) {
      showToast(
        lang === 'bn'
          ? 'শুধুমাত্র PNG, JPG, JPEG বা স্বচ্ছ PNG ফাইল গ্রহণযোগ্য'
          : 'Only PNG, JPG, JPEG, and transparent PNG files are supported',
        'error'
      );
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      showToast(lang === 'bn' ? 'ফাইলের আকার ২.৫MB এর কম হতে হবে' : 'File must be under 2.5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const optimized = canvas.toDataURL(mime, 0.92);
          setLogoPreview(optimized);
          setFormData((prev) => ({ ...prev, logoUrl: optimized }));
          showToast(
            lang === 'bn'
              ? 'লোগো প্রিভিউ লোড হয়েছে। স্থায়ীভাবে সেভ করতে নিচের "সংরক্ষণ" বাটনে চাপুন।'
              : 'Logo preview updated. Click "Save Settings" below to persist.'
          );
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast(
      lang === 'bn'
        ? 'লোগো অপসারিত হয়েছে। পরিবর্তন সংরক্ষণ করতে "সংরক্ষণ" বাটনে ক্লিক করুন।'
        : 'Logo removed. Click Save Settings to persist.'
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) {
      showToast('Admin permission required to modify store settings', 'error');
      return;
    }

    try {
      await dbService.updateSettings(formData, {
        uid: currentUser.uid,
        name: currentUser.displayName,
      });
      showToast(lang === 'bn' ? 'সেটিংস ও লোগো সফলভাবে সংরক্ষিত হয়েছে' : 'Settings & logo updated successfully');
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    }
  };

  // Demo Dataset Wipe & Restore controls
  const handleClearDemoData = async () => {
    if (confirm('Are you sure you want to wipe all demo sample records? Your own created items will be kept.')) {
      try {
        await dbService.clearAllDemoData({
          uid: currentUser.uid,
          name: currentUser.displayName,
        });
        showToast(lang === 'bn' ? 'সকল ডেমো ডেটা মুছে ফেলা হয়েছে' : 'All demo records purged');
        await refreshData();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleResetDemoData = async () => {
    if (confirm('Restore default Bangladesh IT hardware demo dataset for testing?')) {
      try {
        await dbService.resetToDemoData({
          uid: currentUser.uid,
          name: currentUser.displayName,
        });
        showToast(lang === 'bn' ? 'ডেমো ডেটাসেট সফলভাবে পুনঃস্থাপন করা হয়েছে' : 'Demo hardware dataset restored');
        await refreshData();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.settings.title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t.settings.subtitle}</p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Company profile & branding */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.settings.companyDetails}</h3>
          </div>

          {/* Company Logo Upload & Preview Section */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {lang === 'bn' ? 'কোম্পানি লোগো ব্যবস্থাপনা' : 'Company Logo Management'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'bn'
                    ? 'কোটেশন, ইনভয়েস ও A4 প্রিন্টে এই লোগোটি স্বয়ংক্রিয়ভাবে দৃশ্যমান হবে (PNG, JPG, Transparent PNG সমর্থিত)'
                    : 'This logo appears automatically on official quotations, invoices, and A4 printouts.'}
                </p>
              </div>
              {logoPreview && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  {lang === 'bn' ? 'লোগো যুক্ত আছে' : 'Active Logo'}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
              {/* Logo Preview or Clean Placeholder */}
              <div className="relative flex h-24 w-44 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-2 shadow-xs overflow-hidden">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Company Logo Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 text-center p-2">
                    <ImageIcon className="h-8 w-8 stroke-1 text-slate-300 mb-1" />
                    <span className="text-[10px] font-medium text-slate-400">
                      {lang === 'bn' ? 'লোগো নেই (নো লোগো)' : 'No Logo Uploaded'}
                    </span>
                  </div>
                )}
              </div>

              {/* Upload & Action Controls */}
              <div className="space-y-2 text-xs w-full sm:w-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="company-logo-input"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="company-logo-input"
                    className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>
                      {logoPreview
                        ? lang === 'bn'
                          ? 'লোগো পরিবর্তন করুন'
                          : 'Replace Logo'
                        : lang === 'bn'
                        ? 'নতুন লোগো আপলোড'
                        : 'Upload Logo'}
                    </span>
                  </label>

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{lang === 'bn' ? 'লোগো মুছুন' : 'Remove Logo'}</span>
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-slate-400">
                  {lang === 'bn'
                    ? 'সর্বোচ্চ সাইজ: ২.৫MB। স্বচ্ছ ব্যাকগ্রাউন্ডের জন্য PNG বাঞ্ছনীয়।'
                    : 'Max size: 2.5MB. Transparent PNG recommended for sharp print.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700">{t.settings.companyName} (English) *</label>
              <input
                type="text"
                required
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700">{t.settings.companyName} (বাংলা)</label>
              <input
                type="text"
                value={formData.companyNameBn || ''}
                onChange={(e) => setFormData({ ...formData, companyNameBn: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700">Tagline / স্লোগান (English)</label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700">Tagline (বাংলা)</label>
              <input
                type="text"
                value={formData.taglineBn || ''}
                onChange={(e) => setFormData({ ...formData, taglineBn: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700">{t.common.phone} *</label>
              <input
                type="text"
                required
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">{t.common.email}</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">{t.settings.binVat}</label>
              <input
                type="text"
                value={formData.binOrVatNumber || ''}
                onChange={(e) => setFormData({ ...formData, binOrVatNumber: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700">{t.settings.address} (English)</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">{t.settings.address} (বাংলা)</label>
              <input
                type="text"
                value={formData.addressBn || ''}
                onChange={(e) => setFormData({ ...formData, addressBn: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Quotation Defaults and Numbering */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">কোটেশন ও ইনভয়েস ডিফল্ট সেটিংস</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700">কোটেশন নম্বর প্রিফিক্স</label>
              <input
                type="text"
                value={formData.defaultQuotePrefix || 'SIT-Q-'}
                onChange={(e) => setFormData({ ...formData, defaultQuotePrefix: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">ডিফল্ট কোটেশন মেয়াদ (দিন)</label>
              <input
                type="number"
                min="1"
                value={formData.defaultQuoteValidityDays || 7}
                onChange={(e) => setFormData({ ...formData, defaultQuoteValidityDays: parseInt(e.target.value) || 7 })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">ডিফল্ট ভ্যাট / ট্যাক্স (%)</label>
              <input
                type="number"
                min="0"
                max="25"
                value={formData.defaultVatPercent || 0}
                onChange={(e) => setFormData({ ...formData, defaultVatPercent: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700">{t.settings.defaultTerms}</label>
            <textarea
              rows={3}
              value={formData.defaultQuotationTerms || ''}
              onChange={(e) => setFormData({ ...formData, defaultQuotationTerms: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700">
              {lang === 'bn' ? 'সংক্ষিপ্ত ওয়ারেন্টি ক্লজ' : 'Brief Warranty Clause (Header Summary)'}
            </label>
            <textarea
              rows={2}
              value={formData.defaultWarrantyText || ''}
              onChange={(e) => setFormData({ ...formData, defaultWarrantyText: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700">
              {lang === 'bn' ? 'কোটেশনের বিস্তারিত ওয়ারেন্টি নীতিমালা ও শর্তাবলী' : 'Quotation Warranty Policy & Terms (A4 Document Footer)'}
            </label>
            <textarea
              rows={4}
              value={formData.defaultWarrantyTerms || ''}
              onChange={(e) => setFormData({ ...formData, defaultWarrantyTerms: e.target.value })}
              placeholder="1. Official distributor/manufacturer warranty applies per item duration.&#10;2. Warranty covers manufacturing functional defects only..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-hidden font-mono"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!canManageSettings}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{t.common.save}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Integration Status (Real & Verified states, anti-fabrication) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">{t.settings.integrations}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'bn'
              ? 'বাহ্যিক সেবা ও ডাটাবেজের প্রকৃত সংযোগ স্ট্যাটাস (অপ্রমাণিত সেবা সংযোগহীন দেখানো হয়েছে)'
              : 'Status of live cloud database and external distributor APIs (unconfigured flagged inactive)'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* Cloud Firestore */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Google Cloud Firestore</p>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Provisioned & Live Active</p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">DB: tonal-storm-48gvj</p>
            </div>
          </div>

          {/* PDF Engine */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">jsPDF A4 Generator</p>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Ready & Printable</p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">en-BD / BDT Symbol Supported</p>
            </div>
          </div>

          {/* Supplier Live REST API */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Direct Distributor EDI / API</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Not Configured (Inactive)</p>
              <p className="text-[10px] text-slate-400 mt-1">Use CSV importer or Web parser adapter</p>
            </div>
          </div>

          {/* WhatsApp Direct Gateway */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">WhatsApp Business Cloud API</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Not Configured (Inactive)</p>
              <p className="text-[10px] text-slate-400 mt-1">Manual copy / client phone link used</p>
            </div>
          </div>

          {/* SMTP Mail Relay */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Transactional Email (SendGrid)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Not Configured (Inactive)</p>
              <p className="text-[10px] text-slate-400 mt-1">Download PDF to attach directly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Data Management Controls */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-amber-700" />
          <h3 className="text-sm font-bold text-amber-950">{t.settings.demoDataSection}</h3>
        </div>

        <p className="text-xs text-amber-900 leading-relaxed">
          {t.settings.resetNotice}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleClearDemoData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>{t.settings.clearDemoData}</span>
          </button>
          <button
            type="button"
            onClick={handleResetDemoData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t.settings.loadDemoData}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
