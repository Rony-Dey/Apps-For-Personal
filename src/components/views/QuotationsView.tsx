import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Edit,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT, formatDate } from '../../i18n/translations';
import { dbService } from '../../services/db';
import { generateQuotationPDF, exportQuotationA4PDF } from '../../services/pdfGenerator';
import { Quotation, QuotationItem, QuotationStatus } from '../../types';

export const QuotationsView: React.FC = () => {
  const {
    lang,
    t,
    quotations,
    customers,
    products,
    settings,
    refreshData,
    showToast,
    currentUser,
    setActiveTab,
    targetQuoteId,
    setTargetQuoteId,
    prefilledPCBuildQuote,
    setPrefilledPCBuildQuote,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [activeQuoteForPdf, setActiveQuoteForPdf] = useState<Quotation | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printableRef = React.useRef<HTMLDivElement>(null);

  // Form State
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [status, setStatus] = useState<QuotationStatus>('draft');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);
  const [terms, setTerms] = useState(settings.defaultQuotationTerms || '');
  const [warrantyNotes, setWarrantyNotes] = useState(settings.defaultWarrantyText || '');
  const [customerNotes, setCustomerNotes] = useState('');

  // Handle prefilled PC Build quotation conversion
  useEffect(() => {
    if (prefilledPCBuildQuote) {
      setEditingQuoteId(null);
      const qNum = `SIT-Q-${new Date().getFullYear()}-${String(quotations.length + 1).padStart(3, '0')}`;
      setQuoteNumber(qNum);
      setCustomerName(prefilledPCBuildQuote.customerName || 'Retail Customer');
      setCustomerPhone('+880 1711-000000');
      setStatus('draft');

      const date7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      setValidUntil(date7Days);

      const quoteItems: QuotationItem[] = prefilledPCBuildQuote.items.map((prod: any) => ({
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        brand: prod.brand,
        model: prod.model,
        category: prod.category,
        warranty: prod.warranty || '3 Years Replacement Warranty',
        quantity: prod.quantity || 1,
        unitPrice: prod.sellingPrice,
        purchaseCost: prod.purchaseCost,
        lineDiscount: 0,
        total: prod.sellingPrice * (prod.quantity || 1),
      }));

      setItems(quoteItems);
      setOverallDiscount(0);
      setDeliveryCharge(0);
      setVatPercent(0);
      setIsBuilderModalOpen(true);
      setPrefilledPCBuildQuote(null);
    }
  }, [prefilledPCBuildQuote]);

  // Handle direct navigation to target quote from Dashboard
  useEffect(() => {
    if (targetQuoteId) {
      const q = quotations.find((item) => item.id === targetQuoteId);
      if (q) {
        handleOpenPdfPreview(q);
      }
      setTargetQuoteId(null);
    }
  }, [targetQuoteId, quotations]);

  // Decimal-safe calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const vatAmount = useMemo(() => {
    const afterDiscount = Math.max(0, subtotal - overallDiscount);
    return Math.round((afterDiscount * (vatPercent || 0)) / 100);
  }, [subtotal, overallDiscount, vatPercent]);

  const grandTotal = useMemo(() => {
    const base = Math.max(0, subtotal - overallDiscount);
    return base + (deliveryCharge || 0) + vatAmount;
  }, [subtotal, overallDiscount, deliveryCharge, vatAmount]);

  // Open Create Quote modal
  const handleOpenCreate = () => {
    setEditingQuoteId(null);
    const qNum = `SIT-Q-${new Date().getFullYear()}-${String(quotations.length + 1).padStart(3, '0')}`;
    setQuoteNumber(qNum);
    setCustomerId(customers[0]?.id || '');
    setCustomerName(customers[0]?.name || '');
    setCustomerPhone(customers[0]?.phone || '');
    setCustomerEmail(customers[0]?.email || '');
    setCustomerCompany(customers[0]?.company || '');
    setCustomerAddress(customers[0]?.address || '');
    setStatus('draft');
    setValidUntil(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setItems([]);
    setOverallDiscount(0);
    setDeliveryCharge(0);
    setVatPercent(0);
    setTerms(settings.defaultQuotationTerms || '1. Price valid for 7 days.\n2. Genuine manufacturer warranty.');
    setWarrantyNotes(settings.defaultWarrantyText || 'Standard parts replacement warranty.');
    setCustomerNotes('');
    setIsBuilderModalOpen(true);
  };

  // Add line item with warranty parsing
  const handleAddItem = (product: any) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total =
        updated[existingIndex].quantity * updated[existingIndex].unitPrice - updated[existingIndex].lineDiscount;
      setItems(updated);
    } else {
      let initialDuration = '1 Year';
      let initialCondition: 'official' | 'replacement' | 'service' | 'none' | 'unspecified' = 'official';
      const wLower = (product.warranty || '').toLowerCase();
      if (!product.warranty || wLower.includes('not specified') || wLower.includes('unknown')) {
        initialDuration = 'Warranty not specified';
        initialCondition = 'unspecified';
      } else {
        if (wLower.includes('replacement')) initialCondition = 'replacement';
        else if (wLower.includes('service')) initialCondition = 'service';
        else if (wLower.includes('no warranty')) initialCondition = 'none';

        if (wLower.includes('3 year') || wLower.includes('36 month')) initialDuration = '3 Years';
        else if (wLower.includes('2 year') || wLower.includes('24 month')) initialDuration = '2 Years';
        else if (wLower.includes('5 year') || wLower.includes('60 month')) initialDuration = '5 Years';
        else if (wLower.includes('1 year') || wLower.includes('12 month')) initialDuration = '1 Year';
        else if (wLower.includes('7 day')) initialDuration = '7 Days';
        else if (wLower.includes('1 month')) initialDuration = '1 Month';
        else if (wLower.includes('lifetime')) initialDuration = 'Lifetime';
        else initialDuration = product.warranty;
      }

      const newItem: QuotationItem = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        model: product.model,
        category: product.category,
        warranty: product.warranty || 'Warranty not specified',
        warrantyDuration: initialDuration,
        warrantyCondition: initialCondition,
        quantity: 1,
        unitPrice: product.sellingPrice,
        purchaseCost: product.purchaseCost,
        lineDiscount: 0,
        total: product.sellingPrice,
      };
      setItems([...items, newItem]);
    }
  };

  // Helper to update line item warranty duration and condition
  const handleUpdateItemWarranty = (
    index: number,
    duration: string,
    condition?: 'official' | 'replacement' | 'service' | 'none' | 'unspecified'
  ) => {
    const updated = [...items];
    const item = { ...updated[index] };
    if (duration !== undefined) item.warrantyDuration = duration;
    if (condition !== undefined) item.warrantyCondition = condition;

    const dur = item.warrantyDuration || '1 Year';
    const cond = item.warrantyCondition || 'official';

    if (dur === 'Warranty not specified' || cond === 'unspecified') {
      item.warranty = 'Warranty not specified';
    } else if (cond === 'none') {
      item.warranty = 'No Warranty';
    } else {
      const condLabel =
        cond === 'replacement'
          ? 'Replacement Warranty'
          : cond === 'service'
          ? 'Service Warranty'
          : 'Official Warranty';
      item.warranty = `${dur} ${condLabel}`;
    }
    updated[index] = item;
    setItems(updated);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    item.quantity = Math.max(1, item.quantity);
    item.unitPrice = Math.max(0, item.unitPrice);
    item.lineDiscount = Math.max(0, item.lineDiscount);
    item.total = item.quantity * item.unitPrice - item.lineDiscount;
    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Save Quotation
  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || items.length === 0) {
      showToast('Please specify customer and add at least one line item', 'error');
      return;
    }

    try {
      if (editingQuoteId) {
        await dbService.updateQuotation(
          editingQuoteId,
          {
            quoteNumber,
            customerId,
            customerName,
            customerPhone,
            customerEmail,
            customerCompany,
            customerAddress,
            status,
            validUntil,
            items,
            subtotal,
            overallDiscount,
            deliveryCharge,
            vatPercent,
            vatAmount,
            grandTotal,
            terms,
            warrantyNotes,
            customerNotes,
          },
          { uid: currentUser.uid, name: currentUser.displayName }
        );
        showToast(lang === 'bn' ? 'কোটেশন সফলভাবে আপডেট করা হয়েছে' : 'Quotation updated successfully');
      } else {
        await dbService.addQuotation(
          {
            quoteNumber,
            customerId: customerId || 'cust_guest',
            customerName,
            customerPhone,
            customerEmail,
            customerCompany,
            customerAddress,
            salespersonId: currentUser.uid,
            salespersonName: currentUser.displayName,
            status,
            revision: 1,
            validUntil,
            items,
            subtotal,
            overallDiscount,
            deliveryCharge,
            vatPercent,
            vatAmount,
            grandTotal,
            terms,
            warrantyNotes,
            customerNotes,
          },
          { uid: currentUser.uid, name: currentUser.displayName }
        );
        showToast(lang === 'bn' ? 'নতুন কোটেশন তৈরি করা হয়েছে' : 'New quotation generated successfully');
      }

      setIsBuilderModalOpen(false);
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  // Convert Quotation directly into Sales Order
  const handleConvertToOrder = async (quote: Quotation) => {
    if (confirm(`Convert quotation ${quote.quoteNumber} for ${quote.customerName} into confirmed Sales Order?`)) {
      try {
        const order = await dbService.convertQuoteToOrder(quote, {
          uid: currentUser.uid,
          name: currentUser.displayName,
        });
        showToast(
          lang === 'bn'
            ? `কোটেশন সফলভাবে সেলস অর্ডার #${order.orderNumber} এ রূপান্তরিত হয়েছে!`
            : `Converted to Sales Order #${order.orderNumber}!`
        );
        await refreshData();
        setActiveTab('salesOrders');
      } catch (err: any) {
        showToast(err.message || 'Conversion failed', 'error');
      }
    }
  };

  // Open PDF Preview Modal
  const handleOpenPdfPreview = (quote: Quotation) => {
    setActiveQuoteForPdf(quote);
    setIsPdfPreviewOpen(true);
  };

  // Download PDF (Vector fallback)
  const handleDownloadPDF = (quote: Quotation) => {
    try {
      const doc = generateQuotationPDF(quote, settings);
      doc.save(`${quote.quoteNumber}_${quote.customerName.replace(/\s+/g, '_')}.pdf`);
      showToast(lang === 'bn' ? 'পিডিএফ সফলভাবে ডাউনলোড হয়েছে' : 'PDF downloaded successfully');
    } catch (err: any) {
      showToast('PDF generation failed: ' + err.message, 'error');
    }
  };

  // High-Fidelity A4 Bengali PDF Export
  const handleDownloadModalPDF = async () => {
    if (!activeQuoteForPdf) return;
    setIsGeneratingPdf(true);
    try {
      if (printableRef.current) {
        await exportQuotationA4PDF(printableRef.current, activeQuoteForPdf);
        showToast(
          lang === 'bn'
            ? 'বাংলা ফন্ট ও ফরম্যাট সহ নিখুঁত এ৪ কোটেশন পিডিএফ ডাউনলোড হয়েছে!'
            : 'High-resolution Bengali A4 Quotation PDF downloaded successfully!'
        );
      } else {
        handleDownloadPDF(activeQuoteForPdf);
      }
    } catch (err: any) {
      console.warn('A4 capture fallback triggered:', err);
      handleDownloadPDF(activeQuoteForPdf);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !q.quoteNumber.toLowerCase().includes(s) &&
          !q.customerName.toLowerCase().includes(s) &&
          !q.customerPhone.includes(s)
        ) {
          return false;
        }
      }
      if (selectedStatus !== 'all' && q.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [quotations, search, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{t.quotations.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.quotations.subtitle}</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{t.quotations.newQuote}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'bn' ? 'কোটেশন নং বা গ্রাহকের নাম দিয়ে খুঁজুন...' : 'Search quote # or customer...'}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:border-blue-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-hidden"
        >
          <option value="all">{lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
          <option value="draft">{t.quotations.statuses.draft}</option>
          <option value="sent">{t.quotations.statuses.sent}</option>
          <option value="accepted">{t.quotations.statuses.accepted}</option>
          <option value="ordered">{t.quotations.statuses.ordered}</option>
          <option value="rejected">{t.quotations.statuses.rejected}</option>
        </select>
      </div>

      {/* Quotations List Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">{t.quotations.quoteNo}</th>
                <th className="px-4 py-3">{t.quotations.customer}</th>
                <th className="px-4 py-3">{t.common.date}</th>
                <th className="px-4 py-3">{t.quotations.validUntil}</th>
                <th className="px-4 py-3 text-right">{t.quotations.grandTotal}</th>
                <th className="px-4 py-3 text-center">{t.common.status}</th>
                <th className="px-4 py-3 text-center">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.map((quote) => (
                <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-bold text-blue-700 font-mono">{quote.quoteNumber}</span>
                    <span className="block text-[10px] text-slate-400">Rev {quote.revision}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{quote.customerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {quote.customerPhone} {quote.customerCompany ? `• ${quote.customerCompany}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{formatDate(quote.createdAt, lang)}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{quote.validUntil || '7 Days'}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatBDT(quote.grandTotal, lang)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        quote.status === 'accepted' || quote.status === 'ordered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : quote.status === 'sent'
                          ? 'bg-blue-100 text-blue-800'
                          : quote.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.quotations.statuses[quote.status] || quote.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenPdfPreview(quote)}
                        className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        title="Interactive PDF Preview & Print"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(quote)}
                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                        title="Download A4 PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {quote.status !== 'ordered' && (
                        <button
                          onClick={() => handleConvertToOrder(quote)}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                          title="Convert to Sales Order"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuotations.length === 0 && (
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

      {/* Quotation Builder Modal */}
      {isBuilderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{t.quotations.newQuote}</h3>
                <p className="text-xs text-slate-400 font-mono">Quotation Reference: {quoteNumber}</p>
              </div>
              <button
                onClick={() => setIsBuilderModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Customer selection / input */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">গ্রাহকের তথ্য ও ডেলিভারি ঠিকানা</span>
                  {customers.length > 0 && (
                    <select
                      onChange={(e) => {
                        const cust = customers.find((c) => c.id === e.target.value);
                        if (cust) {
                          setCustomerId(cust.id);
                          setCustomerName(cust.name);
                          setCustomerPhone(cust.phone);
                          setCustomerEmail(cust.email || '');
                          setCustomerCompany(cust.company || '');
                          setCustomerAddress(cust.address || '');
                        }
                      }}
                      className="rounded-md border border-slate-300 bg-white py-1 px-2 text-xs text-slate-700"
                    >
                      <option value="">{lang === 'bn' ? 'সংরক্ষিত গ্রাহক নির্বাচন...' : 'Select existing customer...'}</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700">{t.customers.name} *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700">{t.customers.phone} *</label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700">{t.customers.company}</label>
                    <input
                      type="text"
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700">{t.customers.address}</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700">{t.quotations.validUntil}</label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Quick Selector */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {lang === 'bn' ? 'কোটেশনের লাইন আইটেম সমূহ' : 'Quotation Line Items'}
                  </h4>
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        const p = products.find((prod) => prod.id === e.target.value);
                        if (p) handleAddItem(p);
                        e.target.value = '';
                      }}
                      className="rounded-lg border border-blue-300 bg-blue-50 py-1.5 px-3 text-xs font-semibold text-blue-700 focus:outline-hidden"
                    >
                      <option value="">+ {lang === 'bn' ? 'পণ্য ক্যাটালগ থেকে যোগ করুন' : 'Add Product from Catalog'}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ৳{p.sellingPrice.toLocaleString('en-BD')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Item Description</th>
                        <th className="px-3 py-2 w-48">Warranty Period & Type</th>
                        <th className="px-3 py-2 w-16 text-center">Qty</th>
                        <th className="px-3 py-2 w-24 text-right">Unit Price</th>
                        <th className="px-3 py-2 w-20 text-right">Discount</th>
                        <th className="px-3 py-2 w-24 text-right">Line Total</th>
                        <th className="px-3 py-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 align-top">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                              className="w-full rounded border border-slate-200 p-1 text-xs focus:border-blue-600 focus:outline-hidden font-medium"
                            />
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                              <span>SKU: {item.sku}</span>
                              {item.model && <span>• Model: {item.model}</span>}
                            </div>
                          </td>

                          {/* Warranty Duration & Condition Selector */}
                          <td className="px-3 py-2 space-y-1">
                            <div className="grid grid-cols-2 gap-1">
                              <select
                                value={item.warrantyDuration || '1 Year'}
                                onChange={(e) => handleUpdateItemWarranty(idx, e.target.value, item.warrantyCondition)}
                                className="rounded border border-slate-200 bg-white p-1 text-[11px] text-slate-700 focus:border-blue-600 focus:outline-hidden"
                              >
                                <option value="7 Days">7 Days</option>
                                <option value="1 Month">1 Month</option>
                                <option value="3 Months">3 Months</option>
                                <option value="6 Months">6 Months</option>
                                <option value="1 Year">1 Year</option>
                                <option value="2 Years">2 Years</option>
                                <option value="3 Years">3 Years</option>
                                <option value="5 Years">5 Years</option>
                                <option value="Lifetime">Lifetime</option>
                                <option value="Warranty not specified">Not Specified</option>
                                <option value="Custom">Custom...</option>
                              </select>

                              <select
                                value={item.warrantyCondition || 'official'}
                                onChange={(e) =>
                                  handleUpdateItemWarranty(idx, item.warrantyDuration || '1 Year', e.target.value as any)
                                }
                                className="rounded border border-slate-200 bg-white p-1 text-[11px] text-slate-700 focus:border-blue-600 focus:outline-hidden"
                              >
                                <option value="official">Official Mfr.</option>
                                <option value="replacement">Replacement</option>
                                <option value="service">Service Only</option>
                                <option value="none">No Warranty</option>
                                <option value="unspecified">Unspecified</option>
                              </select>
                            </div>

                            {item.warrantyDuration === 'Custom' ? (
                              <input
                                type="text"
                                placeholder="e.g. 10 Days Replacement"
                                value={item.warranty}
                                onChange={(e) => handleUpdateItem(idx, 'warranty', e.target.value)}
                                className="w-full rounded border border-slate-200 p-1 text-[11px] text-slate-700 focus:border-blue-600 focus:outline-hidden font-medium"
                              />
                            ) : (
                              <div className="text-[10px] text-blue-700 font-semibold truncate">
                                {item.warranty}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full rounded border border-slate-200 p-1 text-xs text-center font-bold focus:border-blue-600 focus:outline-hidden"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-slate-200 p-1 text-xs text-right font-semibold focus:border-blue-600 focus:outline-hidden"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.lineDiscount}
                              onChange={(e) => handleUpdateItem(idx, 'lineDiscount', parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-slate-200 p-1 text-xs text-right text-rose-600 focus:border-blue-600 focus:outline-hidden"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {formatBDT(item.total, lang)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-xs text-slate-400">
                            {lang === 'bn' ? 'কোনো পণ্য যোগ করা হয়নি। ড্রপডাউন থেকে পণ্য নির্বাচন করুন।' : 'No line items. Add products above.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Financial Box */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 border-t border-slate-100">
                  <div className="space-y-2 flex-1 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">{t.quotations.terms}</label>
                      <textarea
                        rows={2}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="w-full sm:w-72 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>{t.quotations.subtotal}:</span>
                      <span className="font-semibold">{formatBDT(subtotal, lang)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>{t.quotations.discount}:</span>
                      <input
                        type="number"
                        min="0"
                        value={overallDiscount}
                        onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                        className="w-24 rounded border border-slate-300 bg-white p-1 text-right text-xs text-rose-600 font-semibold focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span>{t.quotations.deliveryCharge}:</span>
                      <input
                        type="number"
                        min="0"
                        value={deliveryCharge}
                        onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                        className="w-24 rounded border border-slate-300 bg-white p-1 text-right text-xs focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span>{t.quotations.vat}:</span>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={vatPercent}
                        onChange={(e) => setVatPercent(parseFloat(e.target.value) || 0)}
                        className="w-24 rounded border border-slate-300 bg-white p-1 text-right text-xs focus:outline-hidden"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900 text-sm">{t.quotations.grandTotal}:</span>
                      <span className="font-extrabold text-blue-700 text-base">
                        {formatBDT(grandTotal, lang)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Save buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">{t.common.status}:</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="rounded-lg border border-slate-300 bg-white py-1 px-2.5 text-xs text-slate-700"
                  >
                    <option value="draft">{t.quotations.statuses.draft}</option>
                    <option value="sent">{t.quotations.statuses.sent}</option>
                    <option value="accepted">{t.quotations.statuses.accepted}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBuilderModalOpen(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                  >
                    {t.common.save}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Quotation PDF Preview Modal */}
      {isPdfPreviewOpen && activeQuoteForPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl my-6 flex flex-col max-h-[95vh]">
            {/* Modal Header (Hidden during window.print) */}
            <div className="no-print flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3.5 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {lang === 'bn' ? 'কোটেশন এ৪ প্রিন্ট ও প্রিভিউ' : 'Official Quotation A4 Document Preview'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>{t.quotations.printQuote}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadModalPDF}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Download className={`h-4 w-4 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
                  <span>
                    {isGeneratingPdf
                      ? lang === 'bn'
                        ? 'পিডিএফ তৈরি হচ্ছে...'
                        : 'Generating...'
                      : t.quotations.downloadPdf}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPdfPreviewOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable A4 Styled Sheet */}
            <div
              ref={printableRef}
              className="printable-a4-sheet p-8 overflow-y-auto flex-1 font-sans text-xs bg-white text-slate-800 space-y-6"
            >
              {/* Company Banner & Logo */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-start gap-3.5">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={settings.companyName || 'Logo'}
                      className="h-16 w-auto max-w-[160px] object-contain shrink-0"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xl tracking-wider">
                      {(settings.companyName || 'SIT').substring(0, 3).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      {settings.companyName || 'SmartIT Pro Computer & Systems'}
                    </h1>
                    {settings.companyNameBn && (
                      <p className="text-slate-700 font-semibold text-xs mt-0.5">{settings.companyNameBn}</p>
                    )}
                    <p className="text-slate-500 text-[11px] mt-0.5">{settings.tagline}</p>
                    <p className="text-slate-600 text-[11px] mt-1">
                      {settings.address} • Tel: {settings.phone}
                    </p>
                    <p className="text-slate-500 text-[10px] font-mono">
                      BIN/VAT No: {settings.binOrVatNumber || 'N/A'} • Email: {settings.email}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block rounded-md bg-slate-900 text-white px-3 py-1 text-xs font-bold tracking-wider uppercase">
                    PRICE QUOTATION
                  </span>
                  <div className="mt-2 text-xs font-mono">
                    <p className="font-bold text-blue-700">{activeQuoteForPdf.quoteNumber}</p>
                    <p className="text-slate-500">Date: {formatDate(activeQuoteForPdf.createdAt, 'en')}</p>
                    <p className="text-slate-500">Valid Until: {activeQuoteForPdf.validUntil}</p>
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Quotation Issued To:
                </span>
                <h4 className="font-bold text-sm text-slate-900">{activeQuoteForPdf.customerName}</h4>
                {activeQuoteForPdf.customerCompany && (
                  <p className="font-semibold text-slate-700 text-xs mt-0.5">{activeQuoteForPdf.customerCompany}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 mt-1">
                  <span>Phone: {activeQuoteForPdf.customerPhone}</span>
                  {activeQuoteForPdf.customerEmail && <span>Email: {activeQuoteForPdf.customerEmail}</span>}
                </div>
                {activeQuoteForPdf.customerAddress && (
                  <p className="text-slate-600 mt-0.5">Address: {activeQuoteForPdf.customerAddress}</p>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-800 text-[11px] font-bold">
                  <tr>
                    <th className="p-2.5 border-b border-slate-200 w-8 text-center">#</th>
                    <th className="p-2.5 border-b border-slate-200">Product / Specifications</th>
                    <th className="p-2.5 border-b border-slate-200 w-36">Warranty</th>
                    <th className="p-2.5 border-b border-slate-200 text-center w-14">Qty</th>
                    <th className="p-2.5 border-b border-slate-200 text-right w-24">Unit Price</th>
                    <th className="p-2.5 border-b border-slate-200 text-right w-28">Total (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeQuoteForPdf.items.map((it, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                      <td className="p-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{it.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>SKU: {it.sku}</span>
                          {it.model && <span>• Model: {it.model}</span>}
                        </div>
                      </td>
                      <td className="p-2.5 text-slate-700">
                        <span className="font-semibold">{it.warranty || 'Warranty not specified'}</span>
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-800">{it.quantity}</td>
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        {it.unitPrice.toLocaleString('en-BD')}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900 font-mono">
                        {it.total.toLocaleString('en-BD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Summary & Terms */}
              <div className="print-avoid-break flex flex-col md:flex-row justify-between items-start gap-5 pt-1">
                <div className="flex-1 space-y-3 w-full">
                  {/* Terms of Sale */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <p className="font-bold text-slate-900 text-xs mb-1">
                      Terms of Sale / বিক্রয় ও কোটেশনের শর্তাবলী:
                    </p>
                    <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed font-sans">
                      {activeQuoteForPdf.terms || settings.defaultQuotationTerms}
                    </p>
                  </div>

                  {/* Warranty Terms Policy */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                    <p className="font-bold text-blue-950 text-xs mb-1">
                      Warranty Policy & RMA Conditions / ওয়ারেন্টি নীতিমালা ও শর্তাবলী:
                    </p>
                    <p className="text-[10.5px] text-slate-600 whitespace-pre-line leading-relaxed font-sans">
                      {settings.defaultWarrantyTerms || activeQuoteForPdf.warrantyNotes || settings.defaultWarrantyText}
                    </p>
                  </div>
                </div>

                {/* Subtotal & Grand Total Box */}
                <div className="w-full md:w-64 space-y-1.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 shrink-0">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">{formatBDT(activeQuoteForPdf.subtotal, 'en')}</span>
                  </div>
                  {activeQuoteForPdf.overallDiscount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold">- {formatBDT(activeQuoteForPdf.overallDiscount, 'en')}</span>
                    </div>
                  )}
                  {activeQuoteForPdf.deliveryCharge > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Charge:</span>
                      <span className="font-mono font-semibold">{formatBDT(activeQuoteForPdf.deliveryCharge, 'en')}</span>
                    </div>
                  )}
                  {activeQuoteForPdf.vatAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>VAT ({activeQuoteForPdf.vatPercent}%):</span>
                      <span className="font-mono font-semibold">{formatBDT(activeQuoteForPdf.vatAmount, 'en')}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-blue-700 font-mono text-base">{formatBDT(activeQuoteForPdf.grandTotal, 'en')}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="print-avoid-break pt-10 flex justify-between text-xs text-slate-500">
                <div className="text-center w-48 border-t border-slate-300 pt-1.5 font-medium">
                  Customer Acceptance Signature
                </div>
                <div className="text-center w-52 border-t border-slate-300 pt-1.5 font-medium">
                  Authorized Sign & Stamp (SmartIT Pro)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
