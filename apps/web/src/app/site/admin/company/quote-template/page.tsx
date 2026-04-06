/**
 * Creado y diseñado por XO
 * 
 * Página de administración para configurar la plantilla de cotización del fabricante.
 * Permite editar logo, datos de empresa, colores, condiciones comerciales y preview en vivo.
 */

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';

// Tipo de plantilla sincronizado con el backend
interface QuoteTemplate {
  id?: string;
  name: string;
  logoUrl: string | null;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  rfc: string;
  website: string;
  primaryColor: string;
  accentColor: string;
  headerText: string;
  footerText: string;
  validityDays: number;
  showIva: boolean;
  ivaRate: number;
  currency: string;
}

const DEFAULT_TEMPLATE: QuoteTemplate = {
  name: 'Cotización estándar',
  logoUrl: null,
  companyName: '',
  address: '',
  phone: '',
  email: '',
  rfc: '',
  website: '',
  primaryColor: '#4F46E5',
  accentColor: '#10B981',
  headerText: '',
  footerText: 'Esta cotización tiene carácter informativo y no constituye un compromiso comercial vinculante. Los precios están sujetos a confirmación.',
  validityDays: 30,
  showIva: true,
  ivaRate: 0.16,
  currency: 'MXN',
};

export default function QuoteTemplatePage() {
  const [template, setTemplate] = useState<QuoteTemplate>(DEFAULT_TEMPLATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Cargar plantilla existente
  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await api.get('/quotes/templates');
        const templates = Array.isArray(res) ? res : (res?.data ? res.data : []);
        if (templates.length > 0) {
          const t = templates[0];
          setTemplate({
            id: t.id,
            name: t.name || DEFAULT_TEMPLATE.name,
            logoUrl: t.logoUrl || null,
            companyName: t.companyName || '',
            address: t.address || '',
            phone: t.phone || '',
            email: t.email || '',
            rfc: t.rfc || '',
            website: t.website || '',
            primaryColor: t.primaryColor || '#4F46E5',
            accentColor: t.accentColor || '#10B981',
            headerText: t.headerText || '',
            footerText: t.footerText || DEFAULT_TEMPLATE.footerText,
            validityDays: t.validityDays ?? 30,
            showIva: t.showIva ?? true,
            ivaRate: t.ivaRate ?? 0.16,
            currency: t.currency || 'MXN',
          });
        }
      } catch (err) {
        console.error('Error al cargar plantilla:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Guardar plantilla
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await api.post('/quotes/templates', template);
      setSaveMessage('✅ Plantilla guardada exitosamente');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage('❌ Error al guardar la plantilla');
    } finally {
      setIsSaving(false);
    }
  }, [template]);

  // Actualizar campo del formulario
  const updateField = (field: keyof QuoteTemplate, value: any) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  // Convertir hex a RGB para el preview
  const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!r) return { r: 79, g: 70, b: 229 };
    return { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) };
  };

  if (isLoading) {
    return (
      <AdminLayout type="company" title="Plantilla de Cotización">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const primaryRgb = hexToRgb(template.primaryColor);
  const accentRgb = hexToRgb(template.accentColor);

  return (
    <AdminLayout type="company" title="Plantilla de Cotización">
      <div className="max-w-[1400px] mx-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Plantilla de Cotización</h1>
            <p className="text-sm text-slate-500 mt-1">
              Configura el diseño de tus cotizaciones PDF. Los distribuidores y clientes recibirán cotizaciones con este formato.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className="text-sm font-medium animate-pulse">{saveMessage}</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSaving ? 'Guardando...' : '💾 Guardar Plantilla'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* ═══ FORMULARIO ═══ */}
          <div className="xl:col-span-2 space-y-5">
            
            {/* ── Datos de Empresa ── */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                🏢 Datos de Empresa
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de la empresa</label>
                  <input
                    type="text"
                    value={template.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="Ej: PM La Piedad S.A. de C.V."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">RFC</label>
                  <input
                    type="text"
                    value={template.rfc}
                    onChange={(e) => updateField('rfc', e.target.value)}
                    placeholder="Ej: PLP001231AB1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={template.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Ej: Av. Industrial 1234, Col. Centro, Cd. de México"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={template.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="(55) 1234-5678"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={template.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="ventas@empresa.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sitio web</label>
                  <input
                    type="text"
                    value={template.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="www.empresa.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">URL del Logo</label>
                  <input
                    type="text"
                    value={template.logoUrl || ''}
                    onChange={(e) => updateField('logoUrl', e.target.value || null)}
                    placeholder="https://... o /storage/logos/mi-logo.png"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                  />
                  {template.logoUrl && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <img src={template.logoUrl} alt="Logo" className="max-h-12 object-contain" onError={(e: any) => e.target.style.display = 'none'} />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Diseño Visual ── */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                🎨 Diseño Visual
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Color primario</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={template.primaryColor}
                        onChange={(e) => updateField('primaryColor', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={template.primaryColor}
                        onChange={(e) => updateField('primaryColor', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Color de acento</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={template.accentColor}
                        onChange={(e) => updateField('accentColor', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={template.accentColor}
                        onChange={(e) => updateField('accentColor', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Configuración Financiera ── */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                💰 Configuración Financiera
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Moneda</label>
                    <select
                      value={template.currency}
                      onChange={(e) => updateField('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="MXN">MXN ($)</option>
                      <option value="USD">USD (US$)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tasa IVA (%)</label>
                    <input
                      type="number"
                      value={Math.round(template.ivaRate * 100)}
                      onChange={(e) => updateField('ivaRate', parseInt(e.target.value || '16') / 100)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      min="0"
                      max="30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Vigencia (días)</label>
                    <input
                      type="number"
                      value={template.validityDays}
                      onChange={(e) => updateField('validityDays', parseInt(e.target.value || '30'))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      min="1"
                      max="365"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showIva"
                    checked={template.showIva}
                    onChange={(e) => updateField('showIva', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                  />
                  <label htmlFor="showIva" className="text-sm text-slate-700">Mostrar desglose de IVA en la cotización</label>
                </div>
              </div>
            </section>

            {/* ── Textos ── */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                📝 Textos de la cotización
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Texto de encabezado (opcional)</label>
                  <textarea
                    value={template.headerText}
                    onChange={(e) => updateField('headerText', e.target.value)}
                    placeholder="Texto descriptivo que aparece antes de la tabla de productos..."
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Condiciones comerciales (pie de página)</label>
                  <textarea
                    value={template.footerText}
                    onChange={(e) => updateField('footerText', e.target.value)}
                    placeholder="Condiciones de pago, tiempos de entrega, garantías..."
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* ═══ PREVIEW EN VIVO ═══ */}
          <div className="xl:col-span-3">
            <div className="sticky top-4">
              <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                👁️ Vista Previa del PDF
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden" style={{ minHeight: '800px' }}>
                {/* Simulación tamaño A4 (210×297mm → escalado a ~595×842px) */}
                <div
                  className="mx-auto relative overflow-hidden"
                  style={{
                    width: '100%',
                    maxWidth: '595px',
                    aspectRatio: '210 / 297',
                    background: 'white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    fontSize: '9px',
                    fontFamily: 'Helvetica, Arial, sans-serif',
                  }}
                >
                  {/* ── Header ── */}
                  <div
                    className="flex items-start justify-between px-8 py-5"
                    style={{ backgroundColor: template.primaryColor, color: 'white' }}
                  >
                    <div className="flex items-start gap-4">
                      {template.logoUrl && (
                        <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden">
                          <img src={template.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" onError={(e: any) => e.target.style.display = 'none'} />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-lg tracking-tight">{template.companyName || 'NOMBRE DE EMPRESA'}</div>
                        <div className="text-[8px] opacity-80 mt-1 space-y-0.5">
                          {template.address && <div>{template.address}</div>}
                          {template.phone && <div>Tel: {template.phone}</div>}
                          {template.email && <div>{template.email}</div>}
                          {template.website && <div>{template.website}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-bold tracking-wider">COTIZACIÓN</div>
                      <div className="font-bold text-sm">COT-20260331-0001</div>
                      <div className="text-[8px] opacity-80 mt-1">
                        <div>Fecha: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div>Vigencia: {template.validityDays} días</div>
                        {template.rfc && <div>RFC: {template.rfc}</div>}
                      </div>
                    </div>
                  </div>

                  {/* ── Línea de acento ── */}
                  <div className="h-1" style={{ backgroundColor: template.accentColor }}></div>

                  {/* ── Datos del proyecto ── */}
                  <div className="px-8 py-4">
                    <div className="font-bold text-[10px] text-slate-800 mb-2">DATOS DEL PROYECTO</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[8px]">
                      <div><span className="text-slate-400 font-bold">Proyecto:</span> <span className="text-slate-700">Oficinas Corporativas Torre Norte</span></div>
                      <div><span className="text-slate-400 font-bold">Cliente:</span> <span className="text-slate-700">Arq. María González</span></div>
                      <div><span className="text-slate-400 font-bold">Empresa:</span> <span className="text-slate-700">Constructora MG S.A.</span></div>
                      <div><span className="text-slate-400 font-bold">Email:</span> <span className="text-slate-700">maria@constructoramg.com</span></div>
                    </div>
                  </div>

                  {/* ── Texto de encabezado ── */}
                  {template.headerText && (
                    <div className="px-8 pb-3 text-[8px] text-slate-500 italic">
                      {template.headerText}
                    </div>
                  )}

                  {/* ── Snapshot 3D simulado ── */}
                  <div className="px-8 pb-4">
                    <div className="w-full h-28 rounded-lg border border-slate-200 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                      <div className="text-center text-slate-400">
                        <svg className="w-8 h-8 mx-auto mb-1 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                        <span className="text-[7px]">Vista 3D del proyecto</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Tabla de productos ── */}
                  <div className="px-8 pb-4">
                    <table className="w-full border-collapse text-[8px]">
                      <thead>
                        <tr style={{ backgroundColor: template.primaryColor, color: 'white' }}>
                          <th className="px-2 py-1.5 text-center font-bold" style={{ width: '5%' }}>#</th>
                          <th className="px-2 py-1.5 text-left font-bold" style={{ width: '15%' }}>SKU</th>
                          <th className="px-2 py-1.5 text-left font-bold" style={{ width: '40%' }}>DESCRIPCIÓN</th>
                          <th className="px-2 py-1.5 text-center font-bold" style={{ width: '8%' }}>CANT.</th>
                          <th className="px-2 py-1.5 text-right font-bold" style={{ width: '16%' }}>P. UNITARIO</th>
                          <th className="px-2 py-1.5 text-right font-bold" style={{ width: '16%' }}>SUBTOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { n: 1, sku: 'PM-0038', name: 'LATERAL MESA BENCH 0.75×1.20', qty: 4, price: 5839.26 },
                          { n: 2, sku: 'PM-0042', name: 'EXTENSION ESCRITORIO 106', qty: 2, price: 3200.00 },
                          { n: 3, sku: 'SL-001', name: 'SILLA EJECUTIVA ISABELA', qty: 6, price: 2323.00 },
                          { n: 4, sku: 'GD-001', name: 'GONDOLA EXHIBICIÓN', qty: 1, price: 8500.00 },
                        ].map((item) => (
                          <tr key={item.n} className={item.n % 2 === 0 ? 'bg-slate-50' : ''}>
                            <td className="px-2 py-1.5 text-center border-b border-slate-100">{item.n}</td>
                            <td className="px-2 py-1.5 border-b border-slate-100 font-mono text-slate-500">{item.sku}</td>
                            <td className="px-2 py-1.5 border-b border-slate-100 font-bold text-slate-700">{item.name}</td>
                            <td className="px-2 py-1.5 text-center border-b border-slate-100">{item.qty}</td>
                            <td className="px-2 py-1.5 text-right border-b border-slate-100">${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td className="px-2 py-1.5 text-right border-b border-slate-100 font-bold">${(item.price * item.qty).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Totales ── */}
                  <div className="px-8 pb-4 flex justify-between items-start">
                    <div className="text-[8px] text-slate-400">
                      Total de piezas: 13
                    </div>
                    <div className="w-48">
                      <div className="flex justify-between py-1 text-[8px] border-t border-slate-200">
                        <span className="text-slate-500">Subtotal:</span>
                        <span className="font-bold">$60,049.04</span>
                      </div>
                      {template.showIva && (
                        <div className="flex justify-between py-1 text-[8px]">
                          <span className="text-slate-500">IVA ({Math.round(template.ivaRate * 100)}%):</span>
                          <span className="font-bold">${(60049.04 * template.ivaRate).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div
                        className="flex justify-between py-2 px-3 rounded-lg mt-1 text-white font-bold text-[10px]"
                        style={{ backgroundColor: template.primaryColor }}
                      >
                        <span>TOTAL:</span>
                        <span>${(60049.04 * (1 + (template.showIva ? template.ivaRate : 0))).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Footer / Condiciones ── */}
                  {template.footerText && (
                    <div className="absolute bottom-0 left-0 right-0 px-8 pb-5 pt-3">
                      <div className="h-px mb-3" style={{ backgroundColor: template.accentColor }}></div>
                      <div className="text-[7px] text-slate-400 leading-relaxed">
                        {template.footerText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
