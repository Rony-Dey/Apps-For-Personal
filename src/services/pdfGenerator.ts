import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { CompanySettings, Quotation } from '../types';

// High-fidelity A4 PDF export using HTML2Canvas for 100% accurate Bengali Unicode typography
export async function exportQuotationA4PDF(element: HTMLElement, quote: Quotation): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2, // High resolution for print
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 210; // A4 mm
  const pageHeight = 297; // A4 mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 5) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const safeCustomerName = (quote.customerName || 'Customer').replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
  pdf.save(`${quote.quoteNumber}_${safeCustomerName}.pdf`);
}

// Standard vector jsPDF generator (bilingual clean English & numeric layout)
export function generateQuotationPDF(quote: Quotation, settings: CompanySettings): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // --- Header: Company Branding ---
  doc.setFillColor(15, 23, 42); // Navy slate
  doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');

  let textStartX = margin + 6;
  if (settings.logoUrl && settings.logoUrl.startsWith('data:image/')) {
    try {
      const format = settings.logoUrl.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(settings.logoUrl, format, margin + 4, y + 2, 20, 20);
      textStartX = margin + 27;
    } catch {
      // Fallback to text only
      textStartX = margin + 6;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.companyName || 'SmartIT Pro Computer & Systems', textStartX, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(settings.tagline || 'Hardware, Custom PC & IT Solutions in Bangladesh', textStartX, y + 15);
  doc.text(
    `Tel: ${settings.phone} | Email: ${settings.email} | BIN/VAT: ${settings.binOrVatNumber || 'N/A'}`,
    textStartX,
    y + 20
  );

  y += 30;

  // --- Document Title & Reference Banner ---
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICIAL PRICE QUOTATION', margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Status: ${quote.status.toUpperCase()} | Rev ${quote.revision || 1}`, pageWidth - margin - 50, y);

  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;

  // --- Two Column Info: Customer & Quote Details ---
  const col2X = pageWidth / 2 + 6;

  // Left column: Customer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('QUOTATION ISSUED TO:', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(quote.customerName, margin, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  let custY = y + 10;
  if (quote.customerCompany) {
    doc.text(`Company: ${quote.customerCompany}`, margin, custY);
    custY += 4.5;
  }
  doc.text(`Phone: ${quote.customerPhone}`, margin, custY);
  custY += 4.5;
  if (quote.customerEmail) {
    doc.text(`Email: ${quote.customerEmail}`, margin, custY);
    custY += 4.5;
  }
  if (quote.customerAddress) {
    doc.text(`Address: ${quote.customerAddress}`, margin, custY);
    custY += 4.5;
  }

  // Right column: Quotation metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('QUOTATION DETAILS:', col2X, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Quotation No:`, col2X, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(quote.quoteNumber, col2X + 28, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Issue Date:`, col2X, y + 9.5);
  doc.text(new Date(quote.createdAt).toLocaleDateString('en-GB'), col2X + 28, y + 9.5);

  doc.text(`Valid Until:`, col2X, y + 14);
  doc.text(quote.validUntil || '7 Days', col2X + 28, y + 14);

  doc.text(`Salesperson:`, col2X, y + 18.5);
  doc.text(quote.salespersonName || 'Sales Desk', col2X + 28, y + 18.5);

  y = Math.max(custY, y + 24) + 4;

  // --- Table Header ---
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - margin * 2, 7.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text('#', margin + 3, y + 5);
  doc.text('Description / Specifications', margin + 12, y + 5);
  doc.text('Warranty', margin + 98, y + 5);
  doc.text('Qty', margin + 130, y + 5);
  doc.text('Unit Price (BDT)', margin + 142, y + 5);
  doc.text('Total (BDT)', pageWidth - margin - 22, y + 5);

  y += 7.5;

  // --- Table Items ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  quote.items.forEach((item, index) => {
    if (y > pageHeight - 65) {
      doc.addPage();
      y = 16;
    }

    const rowHeight = 7.5;
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    doc.setTextColor(51, 65, 85);
    doc.text(String(index + 1), margin + 3, y + 5);

    const maxLen = 48;
    const displayName = item.name.length > maxLen ? item.name.substring(0, maxLen) + '...' : item.name;
    doc.text(displayName, margin + 12, y + 5);

    doc.text(
      item.warranty ? item.warranty.replace(' Replacement Warranty', '').replace(' Official Warranty', '') : '1 Year',
      margin + 98,
      y + 5
    );
    doc.text(String(item.quantity), margin + 133, y + 5);
    doc.text(item.unitPrice.toLocaleString('en-BD'), margin + 146, y + 5);
    doc.text(item.total.toLocaleString('en-BD'), pageWidth - margin - 20, y + 5);

    y += rowHeight;
  });

  y += 3;

  // --- Financial Summary Box ---
  const summaryBoxWidth = 75;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(248, 250, 252);
  doc.rect(summaryX, y, summaryBoxWidth, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(summaryX, y, summaryBoxWidth, 32, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  let sumY = y + 5.5;
  doc.text('Subtotal:', summaryX + 4, sumY);
  doc.text(`BDT ${quote.subtotal.toLocaleString('en-BD')}`, summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });

  sumY += 5;
  doc.text('Discount:', summaryX + 4, sumY);
  doc.text(`- BDT ${quote.overallDiscount.toLocaleString('en-BD')}`, summaryX + summaryBoxWidth - 4, sumY, {
    align: 'right',
  });

  sumY += 5;
  doc.text('Delivery Charge:', summaryX + 4, sumY);
  doc.text(`BDT ${quote.deliveryCharge.toLocaleString('en-BD')}`, summaryX + summaryBoxWidth - 4, sumY, {
    align: 'right',
  });

  sumY += 5;
  doc.text(`VAT (${quote.vatPercent}%):`, summaryX + 4, sumY);
  doc.text(`BDT ${quote.vatAmount.toLocaleString('en-BD')}`, summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });

  sumY += 2;
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 3, sumY, summaryX + summaryBoxWidth - 3, sumY);

  sumY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', summaryX + 4, sumY);
  doc.text(`BDT ${quote.grandTotal.toLocaleString('en-BD')}`, summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });

  // Terms & Warranty Policy on Left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('TERMS OF SALE & WARRANTY POLICY:', margin, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);

  const rawTerms = settings.defaultWarrantyTerms || quote.warrantyNotes || quote.terms || settings.defaultQuotationTerms;
  const termLines = rawTerms
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(0, 5)
    .map((l) => (l.startsWith('•') || l.match(/^\d+\./) ? l : `• ${l}`));

  let termY = y + 10;
  termLines.forEach((tl) => {
    const wrapped = doc.splitTextToSize(tl, summaryX - margin - 4);
    doc.text(wrapped, margin, termY);
    termY += wrapped.length * 3.8;
  });

  y = Math.max(y + 36, termY + 6);

  // Signatures Area
  if (y > pageHeight - 32) {
    doc.addPage();
    y = pageHeight - 35;
  } else {
    y = pageHeight - 32;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);

  // Customer line
  doc.line(margin + 10, y + 12, margin + 55, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Customer Acceptance Sign', margin + 14, y + 16);

  // Authorized line
  doc.line(pageWidth - margin - 55, y + 12, pageWidth - margin - 10, y + 12);
  doc.text('Authorized Signature & Seal', pageWidth - margin - 52, y + 16);

  return doc;
}
