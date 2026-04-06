/**
 * Creado y diseñado por XO
 * 
 * Generador de cotizaciones PDF profesionales con soporte de plantillas.
 * Usa jsPDF + jspdf-autotable para generar PDFs con:
 * - Encabezado con logo, datos de empresa y colores personalizados
 * - Datos del proyecto y cliente
 * - Tabla de partidas agrupadas con subtotales
 * - Desglose de IVA y totales
 * - Pie de página con condiciones comerciales
 */

"use client";

// Importaciones dinámicas para compatibilidad con Next.js SSR
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

// ─── Tipos ──────────────────────────────────────────────────────────────────

/** Plantilla de cotización (viene del API o sistema por defecto) */
export interface QuoteTemplateData {
  id: string;
  ownerType: string;
  name: string;
  logoUrl?: string | null;
  companyName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  rfc?: string | null;
  website?: string | null;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  headerText?: string | null;
  footerText?: string | null;
  validityDays: number;
  showIva: boolean;
  ivaRate: number;
  currency: string;
}

/** Partida de la cotización */
export interface QuoteLineItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number | null;
  subtotal: number | null;
  hasPrice: boolean;
  brandName?: string;
}

/** Datos del proyecto para el encabezado */
export interface QuoteProjectData {
  projectName: string;
  projectCode?: string;
  clientName?: string;
  clientCompany?: string;
  contactEmail?: string;
  contactPhone?: string;
}

/** Opciones completas para generar la cotización PDF */
export interface GenerateQuotePDFOptions {
  template: QuoteTemplateData;
  items: QuoteLineItem[];
  project: QuoteProjectData;
  sceneSnapshot?: string;   // Data URL del render 3D
  quoteNumber?: string;      // Número consecutivo de cotización
  brandName?: string;        // Nombre de la marca (en modo por-marca)
}

// ─── Utilidades de color ────────────────────────────────────────────────────

/** Convierte hex a RGB */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [79, 70, 229]; // fallback: índigo
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

/** Formatea un número como moneda */
function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Genera un número de cotización con formato */
function generateQuoteNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `COT-${year}${month}${day}-${seq}`;
}

// ─── Cargar imagen como base64 ──────────────────────────────────────────────

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Generador principal ────────────────────────────────────────────────────

export async function generateQuotePDF(options: GenerateQuotePDFOptions): Promise<void> {
  console.log('[PDF-GEN] Iniciando generateQuotePDF...');
  const { template, items, project, sceneSnapshot, brandName } = options;
  const quoteNumber = options.quoteNumber || generateQuoteNumber();

  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as any;
  console.log('[PDF-GEN] jsPDF instanciado, autoTable disponible:', typeof doc.autoTable === 'function' || typeof autoTable === 'function');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const primaryRgb = hexToRgb(template.primaryColor);
  const accentRgb = hexToRgb(template.accentColor);
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const validUntil = new Date(now.getTime() + template.validityDays * 86400000);
  const validStr = validUntil.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  let y = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // ENCABEZADO — Barra de color con logo y datos
  // ═══════════════════════════════════════════════════════════════════════════

  const headerHeight = 38;
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Logo (si existe)
  let logoX = margin;
  if (template.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(template.logoUrl);
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, 5, 28, 28);
        logoX = margin + 32;
      }
    } catch { /* sin logo */ }
  }

  // Nombre de empresa
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(template.fontFamily || 'helvetica', 'bold');
  doc.text(template.companyName || brandName || 'COTIZACIÓN', logoX, 16);

  // Datos de contacto en el encabezado
  doc.setFontSize(7);
  doc.setFont(template.fontFamily || 'helvetica', 'normal');
  const contactLines = [];
  if (template.address) contactLines.push(template.address);
  if (template.phone) contactLines.push(`Tel: ${template.phone}`);
  if (template.email) contactLines.push(template.email);
  if (template.website) contactLines.push(template.website);
  contactLines.forEach((line, i) => {
    doc.text(line, logoX, 21 + i * 3.5);
  });

  // RFC y cotización info (lado derecho)
  doc.setFontSize(8);
  doc.setFont(template.fontFamily || 'helvetica', 'bold');
  doc.text('COTIZACIÓN', pageWidth - margin, 10, { align: 'right' });
  doc.setFontSize(10);
  doc.text(quoteNumber, pageWidth - margin, 16, { align: 'right' });
  doc.setFontSize(7);
  doc.setFont(template.fontFamily || 'helvetica', 'normal');
  doc.text(`Fecha: ${dateStr}`, pageWidth - margin, 22, { align: 'right' });
  doc.text(`Vigencia: ${validStr}`, pageWidth - margin, 26, { align: 'right' });
  if (template.rfc) {
    doc.text(`RFC: ${template.rfc}`, pageWidth - margin, 30, { align: 'right' });
  }

  y = headerHeight + 8;

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS DEL PROYECTO / CLIENTE
  // ═══════════════════════════════════════════════════════════════════════════

  // Línea decorativa de acento
  doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.setLineWidth(0.8);
  doc.line(margin, y - 2, margin + contentWidth, y - 2);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont(template.fontFamily || 'helvetica', 'bold');
  doc.text('DATOS DEL PROYECTO', margin, y + 4);
  y += 9;

  // Tabla de datos del proyecto (2 columnas)
  doc.setFontSize(8);
  doc.setFont(template.fontFamily || 'helvetica', 'normal');

  const projectFields = [
    ['Proyecto', project.projectName || 'Sin nombre'],
    ['Código', project.projectCode || '—'],
    ['Cliente', project.clientName || '—'],
    ['Empresa', project.clientCompany || '—'],
    ['Email', project.contactEmail || '—'],
    ['Teléfono', project.contactPhone || '—'],
  ].filter(f => f[1] !== '—'); // Solo mostrar campos con valor

  const colWidth = contentWidth / 2;
  for (let i = 0; i < projectFields.length; i += 2) {
    const leftField = projectFields[i];
    const rightField = projectFields[i + 1];

    doc.setFont(template.fontFamily || 'helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(`${leftField[0]}:`, margin, y);
    doc.setFont(template.fontFamily || 'helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(leftField[1], margin + 22, y);

    if (rightField) {
      doc.setFont(template.fontFamily || 'helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(`${rightField[0]}:`, margin + colWidth, y);
      doc.setFont(template.fontFamily || 'helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(rightField[1], margin + colWidth + 22, y);
    }
    y += 5;
  }

  y += 3;

  // ═══════════════════════════════════════════════════════════════════════════
  // MARCA (si es modo por-marca)
  // ═══════════════════════════════════════════════════════════════════════════

  if (brandName) {
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(template.fontFamily || 'helvetica', 'bold');
    doc.text(`MARCA: ${brandName.toUpperCase()}`, margin + 4, y + 5.5);
    y += 12;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SNAPSHOT 3D (si se proporciona)
  // ═══════════════════════════════════════════════════════════════════════════

  if (sceneSnapshot) {
    const imgHeight = 55;
    // Marco sutil
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, imgHeight);
    try {
      doc.addImage(sceneSnapshot, 'JPEG', margin + 0.5, y + 0.5, contentWidth - 1, imgHeight - 1);
    } catch { /* Sin render */ }
    y += imgHeight + 5;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXTO DE ENCABEZADO (opcional)
  // ═══════════════════════════════════════════════════════════════════════════

  if (template.headerText) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont(template.fontFamily || 'helvetica', 'italic');
    const splitHeader = doc.splitTextToSize(template.headerText, contentWidth);
    doc.text(splitHeader, margin, y);
    y += splitHeader.length * 4 + 3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLA DE PARTIDAS
  // ═══════════════════════════════════════════════════════════════════════════

  const tableBody = items.map((item, idx) => [
    String(idx + 1),
    item.sku || '—',
    item.name.toUpperCase(),
    String(item.quantity),
    item.hasPrice && item.unitPrice != null ? formatCurrency(item.unitPrice, template.currency) : '—',
    item.hasPrice && item.subtotal != null ? formatCurrency(item.subtotal, template.currency) : '—',
  ]);

  // Usar autoTable — intentar ambas formas de invocación
  const autoTableOptions = {
    startY: y,
    head: [['#', 'SKU', 'DESCRIPCIÓN', 'CANT.', 'P. UNITARIO', 'SUBTOTAL']],
    body: tableBody,
    theme: 'grid' as const,
    headStyles: {
      fillColor: primaryRgb,
      fontSize: 7.5,
      fontStyle: 'bold' as const,
      halign: 'center' as const,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      font: template.fontFamily || 'helvetica',
    },
    columnStyles: {
      0: { halign: 'center' as const, cellWidth: 8 },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' as const },
      3: { halign: 'center' as const, cellWidth: 12 },
      4: { halign: 'right' as const, cellWidth: 28 },
      5: { halign: 'right' as const, cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [248, 248, 252] as [number, number, number] },
    margin: { left: margin, right: margin },
    didDrawPage: (data: any) => {
      doc.setFontSize(6);
      doc.setTextColor(180, 180, 180);
      doc.text(
        `${quoteNumber} | ${template.companyName || 'XLayout'} | Página ${doc.internal.getCurrentPageInfo().pageNumber}`,
        pageWidth / 2,
        290,
        { align: 'center' }
      );
    },
  };

  // Compatibilidad: autoTable puede estar como método del doc o como función importada
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(autoTableOptions);
  } else if (typeof autoTable === 'function') {
    autoTable(doc, autoTableOptions);
  } else {
    console.error('[PDF-GEN] ❌ autoTable no disponible — generando PDF sin tabla');
    doc.setFontSize(8);
    doc.text('(Tabla de partidas no disponible — instale jspdf-autotable)', margin, y + 5);
    y += 10;
  }

  y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : y + 30;

  // ═══════════════════════════════════════════════════════════════════════════
  // TOTALES CON IVA
  // ═══════════════════════════════════════════════════════════════════════════

  // Verificar si cabe en la página (necesitamos ~40mm para totales + footer)
  if (y > 240) {
    doc.addPage();
    y = 15;
  }

  const subtotal = items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
  const ivaAmount = template.showIva ? Math.round(subtotal * template.ivaRate * 100) / 100 : 0;
  const total = subtotal + ivaAmount;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsWithoutPrice = items.filter(item => !item.hasPrice).length;

  // Caja de totales
  const totalsX = pageWidth - margin - 75;
  const totalsWidth = 75;

  // Número total de piezas
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont(template.fontFamily || 'helvetica', 'normal');
  doc.text(`Total de piezas: ${totalItems}`, margin, y);
  if (itemsWithoutPrice > 0) {
    doc.setTextColor(200, 100, 50);
    doc.text(`(${itemsWithoutPrice} partida${itemsWithoutPrice > 1 ? 's' : ''} sin precio)`, margin + 32, y);
  }

  // Subtotal
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(totalsX, y - 2, totalsX + totalsWidth, y - 2);

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.setFont(template.fontFamily || 'helvetica', 'normal');
  doc.text('Subtotal:', totalsX, y + 2);
  doc.text(formatCurrency(subtotal, template.currency), totalsX + totalsWidth, y + 2, { align: 'right' });

  // IVA
  if (template.showIva) {
    y += 5;
    doc.text(`IVA (${Math.round(template.ivaRate * 100)}%):`, totalsX, y + 2);
    doc.text(formatCurrency(ivaAmount, template.currency), totalsX + totalsWidth, y + 2, { align: 'right' });
  }

  // Total
  y += 7;
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.roundedRect(totalsX - 2, y - 3, totalsWidth + 4, 10, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(template.fontFamily || 'helvetica', 'bold');
  doc.text('TOTAL:', totalsX + 2, y + 4);
  doc.text(formatCurrency(total, template.currency), totalsX + totalsWidth, y + 4, { align: 'right' });

  y += 16;

  // ═══════════════════════════════════════════════════════════════════════════
  // PIE DE PÁGINA — Condiciones comerciales
  // ═══════════════════════════════════════════════════════════════════════════

  if (template.footerText) {
    if (y > 255) {
      doc.addPage();
      y = 15;
    }

    // Línea separadora
    doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 4;

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(6.5);
    doc.setFont(template.fontFamily || 'helvetica', 'normal');
    const splitFooter = doc.splitTextToSize(template.footerText, contentWidth);
    doc.text(splitFooter, margin, y);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GUARDAR
  // ═══════════════════════════════════════════════════════════════════════════

  const sanitizedName = (project.projectName || 'Cotizacion').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
  const brandSuffix = brandName ? `_${brandName.replace(/\s+/g, '_')}` : '';
  const filename = `${sanitizedName}${brandSuffix}_${quoteNumber}.pdf`;
  console.log('[PDF-GEN] Guardando PDF como:', filename);
  doc.save(filename);
  console.log('[PDF-GEN] ✅ doc.save() completado');
}

// ─── Plantilla por defecto del sistema ──────────────────────────────────────

export const SYSTEM_DEFAULT_TEMPLATE: QuoteTemplateData = {
  id: 'system-default',
  ownerType: 'system',
  name: 'Cotización XLayout',
  logoUrl: null,
  companyName: 'XLayout',
  address: null,
  phone: null,
  email: null,
  rfc: null,
  website: null,
  primaryColor: '#4F46E5',
  accentColor: '#10B981',
  fontFamily: 'helvetica',
  headerText: null,
  footerText: 'Esta cotización tiene carácter informativo y no constituye un compromiso comercial vinculante. Los precios están sujetos a confirmación.',
  validityDays: 30,
  showIva: true,
  ivaRate: 0.16,
  currency: 'MXN',
};
