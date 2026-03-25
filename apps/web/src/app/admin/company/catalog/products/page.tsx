/**
 * Creado y diseñado por XO
 * XLayout System — Catálogo de Productos (unificado con Assets 3D)
 *
 * Página unificada: productos + gestión inline de assets 3D.
 * Cada producto tiene una fila expandible para ver/subir/borrar/previsualizar modelos 3D.
 */

"use client";

import React, { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { useAdminCatalogStore, Product, ProductAsset } from '@/store/admin-catalog-store';

// Carga lazy del visor 3D
const ModelViewer = lazy(() => import('@/components/3d/ModelViewer'));

// ─── Utilidad para formatear bytes ───────────────────────────────────────────
const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Formatos aceptados para upload
const ACCEPTED_FORMATS = '.glb,.gltf,.obj,.dae,.fbx,.3ds,.dxf,.kmz,.stl,.ply,.ifc,.wrl,.xsi';

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

// ─── Badge de pipeline 3D ────────────────────────────────────────────────────
const PipelineBadge: React.FC<{ status: string; error?: string }> = ({ status, error }) => {
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    pending:    { label: 'Pendiente',  cls: 'bg-slate-100 text-slate-500',    icon: '⏳' },
    uploaded:   { label: 'Subido',     cls: 'bg-blue-100 text-blue-700',      icon: '📤' },
    processing: { label: 'Procesando', cls: 'bg-amber-100 text-amber-700',    icon: '⚙️' },
    converted:  { label: 'Convertido', cls: 'bg-cyan-100 text-cyan-700',      icon: '🔄' },
    validated:  { label: 'Validado',   cls: 'bg-emerald-100 text-emerald-700',icon: '✅' },
    failed:     { label: 'Error',      cls: 'bg-red-100 text-red-700',        icon: '❌' },
    error:      { label: 'Error',      cls: 'bg-red-100 text-red-700',        icon: '❌' },
    url_only:   { label: 'URL',        cls: 'bg-purple-100 text-purple-700',  icon: '🔗' },
  };
  const cfg = map[status] ?? map['pending'];
  return (
    <div className="flex flex-col">
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.cls}`}>
        {cfg.icon} {cfg.label}
      </span>
      {error && <span className="text-[9px] text-red-500 mt-0.5 max-w-[150px] truncate" title={error}>{error}</span>}
    </div>
  );
};

// ─── Mini-badges de propiedades ──────────────────────────────────────────────
const AssetMiniProps: React.FC<{ meta: any }> = ({ meta }) => {
  if (!meta) return null;
  const items: { label: string; cls: string }[] = [];
  if (meta.dracoEnabled) items.push({ label: '🗜️ Draco', cls: 'bg-violet-100 text-violet-700' });
  if (meta.orientation?.floorAligned) items.push({ label: '⬇ Piso', cls: 'bg-sky-100 text-sky-700' });
  if (meta.orientation?.centered) items.push({ label: '⊕ Centro', cls: 'bg-sky-100 text-sky-700' });
  if (items.length === 0) return null;
  return (
    <div className="flex gap-0.5 flex-wrap mt-0.5">
      {items.map((b, i) => <span key={i} className={`px-1 py-0 rounded text-[8px] font-semibold ${b.cls}`}>{b.label}</span>)}
    </div>
  );
};

// ─── Indicador 3D en la tabla principal ──────────────────────────────────────
const Asset3DIndicator: React.FC<{ assets: any[]; onClick: () => void }> = ({ assets, onClick }) => {
  const model3d = assets?.filter((a: any) => a.assetType === 'model_3d') || [];
  const hasValidated = model3d.some((a: any) => a.conversionStatus === 'validated');
  const hasProcessing = model3d.some((a: any) => ['processing', 'uploaded'].includes(a.conversionStatus));
  const hasError = model3d.some((a: any) => ['error', 'failed'].includes(a.conversionStatus));

  return (
    <button onClick={onClick} className="flex items-center gap-1 group cursor-pointer">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all group-hover:ring-2 group-hover:ring-blue-300 ${
        hasValidated ? 'bg-purple-100 text-purple-800' :
        hasProcessing ? 'bg-amber-100 text-amber-700 animate-pulse' :
        hasError ? 'bg-red-100 text-red-700' :
        model3d.length > 0 ? 'bg-blue-100 text-blue-700' :
        'bg-slate-100 text-slate-400'
      }`}>
        {hasValidated ? '✓' : hasProcessing ? '⚙' : hasError ? '✗' : model3d.length > 0 ? '↑' : '—'}
        {' '}3D ({model3d.length})
      </span>
    </button>
  );
};

// ─── Panel expandible de Assets 3D para un producto ─────────────────────────
const ProductAssetsPanel: React.FC<{
  product: Product;
  assets: any[];
  onUpload: (file: File, productId: string) => Promise<void>;
  onDelete: (assetId: string) => Promise<void>;
  onRetry: (assetId: string) => Promise<void>;
  onPreview: (url: string, name: string) => void;
  uploading: boolean;
}> = ({ product, assets, onUpload, onDelete, onRetry, onPreview, uploading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const productAssets = assets.filter((a: any) => a.productId === product.id && a.assetType === 'model_3d');

  const handleFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert(`Archivo excede 50MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile, product.id);
    setSelectedFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este asset 3D? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try { await onDelete(id); } finally { setDeletingId(null); }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try { await onRetry(id); } finally { setRetryingId(null); }
  };

  return (
    <div className="bg-slate-50 border-t border-b border-slate-200 px-8 py-4 -mx-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎲</span>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Modelos 3D — {product.name}
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">({productAssets.length} archivo{productAssets.length !== 1 ? 's' : ''})</span>
        </div>
      </div>

      {/* ── Lista de assets existentes ── */}
      {productAssets.length > 0 && (
        <div className="space-y-2 mb-4">
          {productAssets.map((asset: any) => {
            const meta = asset.metadata || {};
            return (
              <div key={asset.id} className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-2.5 group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Formato */}
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-10 text-center shrink-0">
                    {asset.originalFormat || '—'}
                  </span>
                  {/* Estado pipeline */}
                  <PipelineBadge status={asset.conversionStatus || 'pending'} error={asset.conversionError} />
                  {/* Info técnica */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      {meta.triangles !== undefined && <span>△ {meta.triangles.toLocaleString()}</span>}
                      {meta.materials !== undefined && <span>🎨 {meta.materials}</span>}
                      {meta.optimizedSizeBytes && <span>{formatBytes(meta.optimizedSizeBytes)}</span>}
                      {meta.compressionRatio && meta.compressionRatio !== 0 && (
                        <span className={meta.compressionRatio > 0 ? 'text-emerald-600' : 'text-amber-600'}>
                          {meta.compressionRatio > 0 ? `↓${meta.compressionRatio}%` : `↑${Math.abs(meta.compressionRatio)}%`}
                        </span>
                      )}
                    </div>
                    <AssetMiniProps meta={meta} />
                    {meta.boundingBox?.width !== undefined && (
                      <span className="text-[9px] text-slate-400 font-mono">
                        {meta.boundingBox.width.toFixed(2)} × {meta.boundingBox.height.toFixed(2)} × {meta.boundingBox.depth.toFixed(2)} m
                      </span>
                    )}
                  </div>
                </div>
                {/* Acciones */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {asset.model3dUrl && ['validated', 'converted', 'url_only'].includes(asset.conversionStatus) && (
                    <AdminButton variant="outline" size="sm"
                      onClick={() => onPreview(asset.model3dUrl, product.name)}>
                      Ver 3D
                    </AdminButton>
                  )}
                  {['error', 'failed', 'uploaded'].includes(asset.conversionStatus) && (
                    <AdminButton variant="outline" size="sm"
                      loading={retryingId === asset.id}
                      onClick={() => handleRetry(asset.id)}>
                      Reintentar
                    </AdminButton>
                  )}
                  <button
                    onClick={() => handleDelete(asset.id)}
                    disabled={deletingId === asset.id}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Eliminar asset"
                  >
                    {deletingId === asset.id
                      ? <span className="animate-spin text-xs">⟳</span>
                      : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Zona de upload compacta ── */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-white'
        }`}
      >
        <span className="text-xl">📎</span>
        <p className="text-xs font-semibold text-slate-600 mt-1">
          {selectedFile ? selectedFile.name : 'Arrastra un modelo 3D o haz clic para seleccionar'}
        </p>
        <p className="text-[10px] text-slate-400">GLB, OBJ, FBX, DAE, STL, 3DS, DXF, KMZ, IFC, WRL, XSI · Máx 50MB</p>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED_FORMATS} className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {selectedFile && (
        <div className="flex items-center justify-between mt-2 p-2.5 bg-white rounded-lg border border-slate-200">
          <div>
            <p className="text-xs font-semibold text-slate-800">{selectedFile.name}</p>
            <p className="text-[10px] text-slate-400">{formatBytes(selectedFile.size)}</p>
          </div>
          <AdminButton onClick={handleSubmit} loading={uploading} size="sm">
            Subir y Convertir
          </AdminButton>
        </div>
      )}
    </div>
  );
};

// ─── Modal de Preview 3D ──────────────────────────────────────────────────────
const Preview3DModal: React.FC<{
  url: string; assetName: string; onClose: () => void;
}> = ({ url, assetName, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎲</span>
          <h3 className="text-sm font-bold text-slate-800">Preview 3D: {assetName}</h3>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors">✕</button>
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center h-[400px] bg-slate-800 text-slate-400">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm">Cargando modelo 3D...</p>
          </div>
        </div>
      }>
        <ModelViewer url={url} height={400} />
      </Suspense>
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <p className="text-[10px] text-slate-400 font-mono">Arrastrar = Rotar · Scroll = Zoom · Shift+Drag = Pan</p>
        <AdminButton onClick={onClose} variant="outline" size="sm">Cerrar</AdminButton>
      </div>
    </div>
  </div>
);

// ─── Default form state ─────────────────────────────────────────────────────
const defaultForm = () => ({
  name: '', sku: '', description: '', lineId: '', categoryId: '',
  width: 1.2, depth: 0.8, height: 0.75,
  priceA: '', priceB: '', priceC: '', priceD: '', priceE: '', currency: 'MXN',
  model3dUrl: '', floorAnchor: 0, scaleFactor: 1, resizable: true,
});
type FormData = ReturnType<typeof defaultForm>;

// ─── Página principal unificada ─────────────────────────────────────────────
export default function CompanyProductsPage() {
  const {
    products, lines, categories, assets,
    fetchProducts, fetchLines, fetchCategories, fetchAssets,
    createProduct, createAsset, createProductPrice,
    publishProduct, unpublishProduct,
    uploadAsset, deleteAsset, retryConversion,
    isLoading
  } = useAdminCatalogStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 3D expandido
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<{ url: string; name: string } | null>(null);
  const [pollingActive, setPollingActive] = useState(false);

  const load = useCallback(() => {
    fetchProducts();
    fetchLines();
    fetchCategories();
    fetchAssets();
  }, [fetchProducts, fetchLines, fetchCategories, fetchAssets]);

  useEffect(() => { load(); }, [load]);

  // Auto-poll mientras hay assets en procesamiento
  useEffect(() => {
    const hasProcessing = assets.some((a: any) =>
      ['processing', 'uploaded'].includes(a.conversionStatus || '')
    );
    if (hasProcessing && !pollingActive) {
      setPollingActive(true);
      const id = setInterval(() => { fetchAssets(); fetchProducts(); }, 4000);
      return () => { clearInterval(id); setPollingActive(false); };
    }
  }, [assets, pollingActive, fetchAssets, fetchProducts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.lineId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const pricesPayload = ['A','B','C','D','E'].map(type => {
        const val = formData[`price${type}` as keyof FormData];
        if (!val) return null;
        return { priceType: type, basePrice: parseFloat(val as string), currency: formData.currency };
      }).filter(Boolean);

      const newProduct = await createProduct({
        name: formData.name, sku: formData.sku,
        description: formData.description || undefined,
        lineId: formData.lineId, categoryId: formData.categoryId || undefined,
        width: formData.width, depth: formData.depth, height: formData.height,
        prices: pricesPayload
      } as any);

      if (formData.model3dUrl) {
        await createAsset({
          productId: newProduct.id, assetType: 'model_3d',
          model3dUrl: formData.model3dUrl,
          metadata: { floorAnchor: formData.floorAnchor, scaleFactor: formData.scaleFactor, resizable: formData.resizable },
        });
      }

      setIsModalOpen(false);
      setFormData(defaultForm());
      load();
    } catch (err: any) {
      setError(err?.message || 'Error al crear el producto');
    } finally {
      setIsSubmitting(false);
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

  const handleUpload = async (file: File, productId: string) => {
    setUploadingProductId(productId);
    try {
      await uploadAsset(file, productId);
      load();
    } catch (err: any) {
      alert('Error al subir: ' + (err?.message || 'Error'));
    } finally {
      setUploadingProductId(null);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await deleteAsset(assetId);
      load();
    } catch (err: any) {
      alert('Error al eliminar: ' + (err?.message || 'Error'));
    }
  };

  const handleRetryConversion = async (assetId: string) => {
    try {
      await retryConversion(assetId);
      load();
    } catch (err: any) {
      alert('Error al reintentar: ' + (err?.message || 'Error'));
    }
  };

  const set = (field: keyof FormData) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({
        ...prev,
        [field]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked
          : e.target.type === 'number' ? parseFloat(e.target.value) || 0
          : e.target.value,
      }))
  );

  const columns = [
    {
      header: 'Producto',
      accessor: (p: Product) => (
        <div>
          <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
          <div className="text-xs font-mono text-slate-400">{p.sku}</div>
        </div>
      )
    },
    {
      header: 'Línea',
      accessor: (p: Product) => (
        <span className="text-xs text-slate-600 font-medium">
          {p.line?.name || lines.find(l => l.id === p.lineId)?.name || '—'}
        </span>
      )
    },
    {
      header: 'Dimensiones',
      accessor: (p: Product) => (
        <span className="text-xs font-mono text-slate-500">{p.width}×{p.depth}×{p.height}m</span>
      )
    },
    {
      header: 'Precios',
      accessor: (p: Product) => {
        if (!p.prices || p.prices.length === 0) return <span className="text-xs text-slate-400">Sin precios</span>;
        return (
          <div className="flex gap-1 flex-wrap max-w-[120px]">
            {p.prices.map((price: any) => (
              <span key={price.id} className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 uppercase">
                {price.priceType}: ${Number(price.basePrice).toLocaleString()}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      header: '3D',
      accessor: (p: Product) => (
        <Asset3DIndicator
          assets={p.assets || []}
          onClick={() => setExpandedProductId(expandedProductId === p.id ? null : p.id)}
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

  // Renderizar la tabla con filas expandibles
  const renderProducts = () => {
    if (isLoading) {
      return <AdminTable columns={columns as any} data={[]} loading={true} emptyMessage="" />;
    }
    if (products.length === 0) {
      return <AdminTable columns={columns as any} data={[]} loading={false} emptyMessage="No hay productos. Crea tu primer producto para comenzar." />;
    }

    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1.2fr_1.2fr_1fr_1fr_1.2fr] gap-0 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          {columns.map(c => (
            <div key={c.header} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{c.header}</div>
          ))}
        </div>
        {/* Rows */}
        {products.map((p: Product) => (
          <React.Fragment key={p.id}>
            <div className={`grid grid-cols-[2fr_1fr_1.2fr_1.2fr_1fr_1fr_1.2fr] gap-0 px-4 py-3 items-center border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
              expandedProductId === p.id ? 'bg-blue-50/30' : ''
            }`}>
              {columns.map((c, i) => (
                <div key={i}>{(c.accessor as any)(p)}</div>
              ))}
            </div>
            {/* Panel expandible de assets 3D */}
            {expandedProductId === p.id && (
              <ProductAssetsPanel
                product={p}
                assets={assets as any}
                onUpload={handleUpload}
                onDelete={handleDeleteAsset}
                onRetry={handleRetryConversion}
                onPreview={(url, name) => setPreviewAsset({ url, name })}
                uploading={uploadingProductId === p.id}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout type="company" title="Catálogo de Productos">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Inventario de Productos</h2>
          <p className="text-sm text-slate-500">
            Gestiona productos y modelos 3D. Clic en el badge 3D para expandir y gestionar assets.
            {pollingActive && <span className="ml-2 text-amber-600 font-bold animate-pulse">● Conversión en progreso...</span>}
          </p>
        </div>
        <AdminButton
          onClick={() => { setIsModalOpen(true); setFormData(defaultForm()); setError(null); }}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
        >
          Nuevo Producto
        </AdminButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: products.length, color: 'text-slate-700' },
          { label: 'Publicados', value: products.filter(p => p.status === 'PUBLISHED').length, color: 'text-emerald-600' },
          { label: 'Borradores', value: products.filter(p => p.status === 'DRAFT').length, color: 'text-amber-600' },
          { label: 'Con 3D', value: products.filter(p => p.assets && p.assets.length > 0).length, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla unificada con filas expandibles */}
      {renderProducts()}

      {/* ─── Create Modal ── */}
      <AdminModal
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Producto"
        footer={<>
          <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
          <AdminButton onClick={handleCreate} loading={isSubmitting}>Guardar Producto</AdminButton>
        </>}
      >
        <form onSubmit={handleCreate} className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre *</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                value={formData.name} onChange={set('name')} placeholder="Escritorio Ejecutivo Pro" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">SKU *</label>
              <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                value={formData.sku} onChange={set('sku')} placeholder="DK-001" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Línea *</label>
              <select required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                value={formData.lineId} onChange={set('lineId')}>
                <option value="">Seleccionar línea...</option>
                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descripción</label>
              <textarea className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                rows={2} value={formData.description} onChange={set('description')} placeholder="Descripción del producto..." />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dimensiones (metros)</p>
            <div className="grid grid-cols-3 gap-3">
              {(['width', 'depth', 'height'] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs text-slate-600 mb-1 capitalize">{field === 'width' ? 'Ancho' : field === 'depth' ? 'Fondo' : 'Alto'}</label>
                  <input type="number" step="0.01" min="0.01" required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                    value={formData[field]} onChange={set(field)} />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 bg-slate-50/50 -mx-6 px-6 pb-2">
            <div className="flex justify-between items-end mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Matriz de Precios</p>
              <div className="w-24">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Moneda Base</label>
                <select className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:border-blue-500 focus:outline-none bg-white font-bold"
                  value={formData.currency} onChange={set('currency')}>
                  <option value="MXN">MXN</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {['A','B','C','D','E'].map(type => (
                <div key={type} className="bg-white p-2 rounded-md border border-slate-200 shadow-sm">
                  <label className="block text-[10px] font-black text-slate-500 mb-1 text-center bg-slate-100 py-0.5 rounded">TIPO {type}</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    className="w-full px-2 py-1 border border-transparent hover:border-slate-200 rounded text-sm text-center font-mono focus:border-blue-500 focus:outline-none"
                    value={formData[`price${type}` as keyof FormData] as string | number} onChange={set(`price${type}` as keyof FormData)} />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Modelo 3D (opcional)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">URL del modelo GLB</label>
                <input type="url" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono focus:border-blue-500 focus:outline-none"
                  value={formData.model3dUrl} onChange={set('model3dUrl')} placeholder="https://storage.xlayout.io/models/escritorio.glb" />
                <p className="text-[10px] text-slate-400 mt-1">URL pública a un archivo .glb o .gltf. También puedes subir archivos desde la tabla.</p>
              </div>
            </div>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>

      {/* Preview 3D Modal */}
      {previewAsset && (
        <Preview3DModal url={previewAsset.url} assetName={previewAsset.name} onClose={() => setPreviewAsset(null)} />
      )}
    </AdminLayout>
  );
}
