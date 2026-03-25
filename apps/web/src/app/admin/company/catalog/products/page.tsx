/**
 * Creado y diseñado por XO
 * XLayout System — Catálogo de Productos
 *
 * Página de negocio: gestión de productos, líneas, precios.
 * V2: Integración profesional de Assets 3D con soporte CRUD completo y biblioteca enriquecida.
 */

"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, Product, ProductAsset } from '@/store/admin-catalog-store';

// ─── Badge de estado del producto ────────────────────────────────────────────
const ProductStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PUBLISHED: { label: 'Publicado', cls: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' },
    DRAFT:     { label: 'Borrador',  cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200' },
    ARCHIVED:  { label: 'Archivado', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  };
  const { label, cls } = map[status] ?? map['DRAFT'];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cls}`}>{label}</span>;
};

// ─── Indicador ligero de asset 3D ─────────────────────────────────────────────
const Asset3DIndicator: React.FC<{ assets: any[]; onNavigate: () => void }> = ({ assets, onNavigate }) => {
  const model3d = assets?.filter((a: any) => a.assetType === 'model_3d') || [];
  const hasValidated = model3d.some((a: any) => a.conversionStatus === 'validated');
  const hasProcessing = model3d.some((a: any) => ['processing', 'uploaded'].includes(a.conversionStatus));
  const hasError = model3d.some((a: any) => ['error', 'failed'].includes(a.conversionStatus));

  return (
    <button onClick={onNavigate} className="flex items-center gap-1 group cursor-pointer" title="Gestionar modelo 3D">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all group-hover:ring-2 group-hover:ring-blue-300 ${
        hasValidated ? 'bg-purple-100 text-purple-800' :
        hasProcessing ? 'bg-amber-100 text-amber-700 animate-pulse' :
        hasError ? 'bg-red-100 text-red-700' :
        model3d.length > 0 ? 'bg-blue-100 text-blue-700' :
        'bg-slate-100 text-slate-400'
      }`}>
        {hasValidated ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
        ) : hasProcessing ? (
          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        ) : hasError ? '✗' : model3d.length > 0 ? '↑' : '—'}
        {' '}3D ({model3d.length})
      </span>
    </button>
  );
};

// ─── Zona de Upload Directo (Compacta para modal) ─────────────────────────────
const CompactUploadZone: React.FC<{
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  uploading: boolean;
}> = ({ onFileSelect, selectedFile, uploading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
      } ${selectedFile ? 'border-emerald-300 bg-emerald-50' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) onFileSelect(e.dataTransfer.files[0]); }}
    >
      <input 
        ref={inputRef} type="file" className="hidden" 
        accept=".glb,.gltf,.obj,.fbx"
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)} 
      />
      {selectedFile ? (
        <div className="flex flex-col items-center">
          <span className="text-xl">📄</span>
          <p className="text-[11px] font-bold text-emerald-800 mt-1 truncate max-w-full px-2">{selectedFile.name}</p>
          <button 
            type="button" onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
            className="text-[10px] text-red-500 hover:underline mt-1"
          >
            Quitar
          </button>
        </div>
      ) : (
        <>
          <span className="text-xl">📤</span>
          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Subir nuevo modelo</p>
          <p className="text-[9px] text-slate-400">GLB, OBJ, FBX (Máx 50MB)</p>
        </>
      )}
    </div>
  );
};

// ─── Formulario ──────────────────────────────────────────────────────────────
const defaultForm = (initial?: Partial<Product>) => ({
  id: initial?.id || '',
  name: initial?.name || '',
  sku: initial?.sku || '',
  description: initial?.description || '',
  lineId: initial?.lineId || '',
  categoryId: initial?.categoryId || '',
  width: initial?.width ?? 1.2,
  depth: initial?.depth ?? 0.8,
  height: initial?.height ?? 0.75,
  priceA: initial?.prices?.find(p => p.priceType === 'A')?.basePrice || '',
  priceB: initial?.prices?.find(p => p.priceType === 'B')?.basePrice || '',
  priceC: initial?.prices?.find(p => p.priceType === 'C')?.basePrice || '',
  priceD: initial?.prices?.find(p => p.priceType === 'D')?.basePrice || '',
  priceE: initial?.prices?.find(p => p.priceType === 'E')?.basePrice || '',
  currency: initial?.prices?.[0]?.currency || 'MXN',
});

type FormData = ReturnType<typeof defaultForm>;

export default function CompanyProductsPage() {
  const {
    products, lines, assets,
    fetchProducts, fetchLines, fetchAssets,
    createProduct, updateProduct, uploadAsset, linkAsset, unlinkAsset,
    publishProduct, unpublishProduct,
    isLoading
  } = useAdminCatalogStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  const load = useCallback(() => {
    fetchProducts();
    fetchLines();
  }, [fetchProducts, fetchLines]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.lineId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const pricesPayload = ['A','B','C','D','E'].map(type => {
        const val = formData[`price${type}` as keyof FormData];
        if (val === '') return null;
        return { priceType: type, basePrice: parseFloat(val as string), currency: formData.currency };
      }).filter(Boolean);

      const productPayload = {
        name: formData.name, sku: formData.sku,
        description: formData.description || undefined,
        lineId: formData.lineId, categoryId: formData.categoryId || undefined,
        width: formData.width, depth: formData.depth, height: formData.height,
        prices: pricesPayload
      };

      let productResult: Product;
      if (isEdit && formData.id) {
        productResult = await updateProduct(formData.id, productPayload as any);
      } else {
        productResult = await createProduct(productPayload as any);
      }

      // ── Subida Directa ──
      if (selectedFile && productResult.id) {
        await uploadAsset(selectedFile, productResult.id);
      }

      setIsModalOpen(false);
      setFormData(defaultForm());
      setSelectedFile(null);
      // No hace falta load() completo por la reactividad del store, 
      // pero para asegurar consistencia tras uploads asíncronos:
      if (selectedFile) setTimeout(load, 1000);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (p: Product) => {
    setIsEdit(true);
    setFormData(defaultForm(p));
    setIsModalOpen(true);
    setError(null);
    setSelectedFile(null);
  };

  const openLibrary = async () => {
    setIsLibraryOpen(true);
    fetchAssets(); // Cargar todos los assets para ver vinculaciones
  };

  const handleLinkAsset = async (assetId: string) => {
    if (!formData.id) return;
    setLinkingId(assetId);
    try {
      await linkAsset(formData.id, assetId);
      setIsLibraryOpen(false);
      // El store actualiza el producto localmente, solo refrescamos el form
      const updated = useAdminCatalogStore.getState().products.find(p => p.id === formData.id);
      if (updated) setFormData(defaultForm(updated));
    } catch (err) {
      alert('Error al vincular asset');
    } finally {
      setLinkingId(null);
    }
  };

  const handleUnlink = async (assetId: string) => {
    if (!formData.id) return;
    if (!confirm('¿Deseas desvincular este modelo?')) return;
    try {
      await unlinkAsset(formData.id, assetId);
      const updated = useAdminCatalogStore.getState().products.find(p => p.id === formData.id);
      if (updated) setFormData(defaultForm(updated));
    } catch (err) {
      alert('Error al desvincular asset');
    }
  };

  const handlePublishToggle = async (product: Product) => {
    setPublishingId(product.id);
    try {
      if (product.status === 'PUBLISHED') await unpublishProduct(product.id);
      else await publishProduct(product.id);
    } catch { alert('Error al cambiar estado'); }
    finally { setPublishingId(null); }
  };

  const set = (field: keyof FormData) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({
        ...prev,
        [field]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
      }))
  );

  const columns = [
    {
      header: 'Producto',
      accessor: (p: Product) => (
        <div className="group">
          <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
          <div className="text-[10px] font-mono text-slate-400">{p.sku}</div>
        </div>
      )
    },
    {
      header: 'Línea',
      accessor: (p: Product) => <span className="text-xs text-slate-600">{p.line?.name || '—'}</span>
    },
    {
      header: '3D',
      accessor: (p: Product) => (
        <Asset3DIndicator 
          assets={p.assets || []} 
          onNavigate={() => openEdit(p)} 
        />
      )
    },
    {
      header: 'Estado',
      accessor: (p: Product) => <ProductStatusBadge status={p.status} />
    },
    {
      header: 'Acciones',
      accessor: (p: Product) => (
        <div className="flex gap-2 items-center">
          <AdminButton variant="outline" size="sm" onClick={() => openEdit(p)}>
            Editar
          </AdminButton>
          <AdminButton 
            variant={p.status === 'PUBLISHED' ? 'outline' : 'primary'} size="sm"
            loading={publishingId === p.id}
            onClick={() => handlePublishToggle(p)}
          >
            {p.status === 'PUBLISHED' ? 'Retirar' : 'Publicar'}
          </AdminButton>
        </div>
      )
    },
  ];

  const currentProduct = products.find(p => p.id === formData.id);
  const model3d = currentProduct?.assets?.find(a => a.assetType === 'model_3d');

  return (
    <AdminLayout type="company" title="Catálogo de Productos">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 text-premium">Gestión de Catálogo</h2>
          <p className="text-sm text-slate-500">Administra tus productos y sus modelos 3D en un solo flujo.</p>
        </div>
        <AdminButton 
          onClick={() => { setIsEdit(false); setFormData(defaultForm()); setIsModalOpen(true); }}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
        >
          Nuevo Producto
        </AdminButton>
      </div>

      <AdminTable columns={columns as any} data={products} loading={isLoading} />

      {/* ─── Modal Crear / Editar ─── */}
      <AdminModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
        title={isEdit ? `Propiedades: ${formData.name}` : "Crear Nuevo Producto"}
        width="max-w-4xl"
        footer={<>
          <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
          <AdminButton onClick={handleSave} loading={isSubmitting}>
            {isEdit ? 'Actualizar Ficha Técnica' : 'Crear Producto'}
          </AdminButton>
        </>}
      >
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Comercial</label>
                <input type="text" className="premium-input w-full" value={formData.name} onChange={set('name')} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SKU / Modelo</label>
                <input type="text" className="premium-input w-full" value={formData.sku} onChange={set('sku')} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Línea de Producto</label>
                <select className="premium-input w-full" value={formData.lineId} onChange={set('lineId')}>
                  <option value="">Seleccionar...</option>
                  {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            {/* Matriz de Precios */}
            <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100">
               <p className="text-[10px] font-black text-indigo-400 uppercase mb-3 tracking-widest text-center">Matriz de Precios ({formData.currency})</p>
               <div className="grid grid-cols-5 gap-2">
                 {['A','B','C','D','E'].map(type => (
                   <div key={type} className="flex flex-col gap-1">
                     <span className="text-[9px] font-bold text-center text-slate-400 bg-white rounded border border-slate-100 py-0.5">{type}</span>
                     <input 
                       type="number" step="0.01" placeholder="0.00"
                       className="premium-input w-full text-center text-xs py-1.5"
                       value={formData[`price${type}` as keyof FormData] as string} 
                       onChange={set(`price${type}` as any)} 
                     />
                   </div>
                 ))}
               </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Dimensiones Físicas (m)</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'width', label: 'Ancho' },
                  { id: 'depth', label: 'Fondo' },
                  { id: 'height', label: 'Alto' }
                ].map(f => (
                  <div key={f.id}>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">{f.label}</label>
                    <input type="number" step="0.01" className="premium-input w-full bg-white" 
                      value={formData[f.id as keyof FormData] as number} onChange={set(f.id as any)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-50/50 -my-6 p-6 border-l border-slate-100 space-y-6">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
               <span className="w-2 h-2 bg-blue-500 rounded-full" />
               Asset 3D
            </h3>
            
            {model3d ? (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase rounded-bl-lg border-l border-b ${
                    model3d.conversionStatus === 'validated' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    ['processing', 'uploaded'].includes(model3d.conversionStatus || '') ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                    'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    {model3d.conversionStatus}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-xl">📦</div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-800 truncate" title={model3d.originalFileUrl}>
                        {model3d.originalFileUrl?.split('/').pop() || 'Modelo vinculado'}
                      </p>
                      <p className="text-[9px] text-slate-400 uppercase font-mono">{model3d.originalFormat}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                    <button 
                      type="button" onClick={() => handleUnlink(model3d.id)}
                      className="text-[10px] text-slate-400 hover:text-rose-500 font-bold transition-colors"
                    >
                      ELIMINAR VÍNCULO
                    </button>
                    <button 
                      type="button" onClick={openLibrary}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-black uppercase tracking-tight"
                    >
                      REEMPLAZAR
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                  Este producto no tiene un modelo asociado. Sube uno nuevo o elige de la biblioteca.
                </p>
                <div className="space-y-3">
                  <CompactUploadZone 
                    selectedFile={selectedFile} 
                    onFileSelect={setSelectedFile} 
                    uploading={isSubmitting} 
                  />
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center text-[9px] uppercase"><span className="bg-slate-50 px-2 text-slate-400 font-black tracking-widest">o</span></div>
                  </div>
                  <AdminButton variant="outline" size="sm" className="w-full text-[11px] font-bold" onClick={openLibrary}>
                    BIBLIOTECA EXISTENTE
                  </AdminButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminModal>

      {/* ─── Selector de Biblioteca Pro ─── */}
      <AdminModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} title="Biblioteca de Assets 3D" width="max-w-3xl">
        <p className="text-xs text-slate-500 mb-4">Selecciona un modelo técnico para vincularlo a este producto.</p>
        <div className="grid grid-cols-2 gap-4 max-h-[450px] overflow-y-auto p-1">
          {assets.filter(a => a.assetType === 'model_3d').length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-400">
              <span className="text-4xl block mb-2">🎈</span>
              <p className="text-sm font-semibold text-slate-500">No se detectan activos 3D</p>
            </div>
          ) : (
            assets.filter(a => a.assetType === 'model_3d').map(asset => {
              const currentOwner = asset.productId && products.find(p => p.id === asset.productId);
              const isSame = asset.productId === formData.id;

              return (
                <div 
                  key={asset.id} 
                  className={`p-4 bg-white border-2 rounded-2xl transition-all group relative ${
                    isSame ? 'border-blue-500 bg-blue-50/30' : 
                    linkingId === asset.id ? 'opacity-50 cursor-not-allowed border-slate-200' :
                    'border-slate-100 hover:border-blue-400 hover:shadow-xl cursor-pointer'
                  }`}
                  onClick={() => !isSame && !linkingId && handleLinkAsset(asset.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isSame ? 'bg-blue-100' : 'bg-slate-50 group-hover:bg-blue-50'}`}>
                      {asset.originalFormat === 'fbx' ? '🎮' : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate mb-0.5">{asset.originalFileUrl?.split('/').pop() || 'Asset'}</p>
                      <div className="flex items-center gap-1.5">
                         <span className="text-[9px] font-mono text-slate-400 uppercase">{asset.originalFormat}</span>
                         <span className={`w-1 h-1 rounded-full ${asset.conversionStatus === 'validated' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                         <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">{asset.conversionStatus}</span>
                      </div>
                      
                      {currentOwner && (
                        <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-1">
                          <span className="text-[8px] font-black text-slate-300 uppercase leading-none">VINCULADO A:</span>
                          <span className="text-[9px] font-bold text-slate-500 truncate italic">{isSame ? 'Este producto' : currentOwner.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isSame && (
                    <div className="absolute top-3 right-3 text-blue-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </AdminModal>

      <style jsx>{`
        .premium-input {
          @apply px-3 py-2 border border-slate-200 rounded-lg text-sm transition-all focus:ring-4 focus:ring-blue-50 focus:border-blue-400 focus:outline-none;
        }
        .text-premium {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </AdminLayout>
  );
}
