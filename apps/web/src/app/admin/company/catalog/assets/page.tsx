"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { useAdminCatalogStore, ProductAsset } from '@/store/admin-catalog-store';

// ─── Status badge for conversion pipeline ────────────────────────────────────
const ConversionBadge: React.FC<{ status: string; error?: string }> = ({ status, error }) => {
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    pending:     { label: 'Pendiente',    cls: 'bg-slate-100 text-slate-500',   icon: '⏳' },
    uploaded:    { label: 'Subido',       cls: 'bg-blue-100 text-blue-700',     icon: '📤' },
    processing:  { label: 'Procesando',   cls: 'bg-amber-100 text-amber-700',   icon: '⚙️' },
    converted:   { label: 'Convertido',   cls: 'bg-emerald-100 text-emerald-700', icon: '✓' },
    validated:   { label: 'Validado',     cls: 'bg-emerald-100 text-emerald-700', icon: '✅' },
    failed:      { label: 'Error',        cls: 'bg-red-100 text-red-700',       icon: '❌' },
    url_only:    { label: 'URL directa',  cls: 'bg-purple-100 text-purple-700', icon: '🔗' },
  };
  const cfg = map[status] ?? map['pending'];
  return (
    <div className="flex flex-col">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${cfg.cls}`}>
        <span>{cfg.icon}</span> {cfg.label}
      </span>
      {error && <span className="text-[10px] text-red-500 mt-0.5 max-w-[180px] truncate" title={error}>{error}</span>}
    </div>
  );
};

// ─── Validation badge ─────────────────────────────────────────────────────────
const ValidationBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return <span className="text-xs text-slate-300">—</span>;
  const map: Record<string, string> = {
    valid:   'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    invalid: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>;
};

// ─── Upload drop zone ─────────────────────────────────────────────────────────
const ACCEPTED_FORMATS = '.glb,.gltf,.obj,.dae,.fbx,.3ds,.dxf,.kmz,.stl,.ply';
const FORMAT_INFO = 'GLB, GLTF, OBJ, DAE, FBX, 3DS, DXF, KMZ, STL, PLY';

const UploadZone: React.FC<{
  productId: string;
  onUpload: (file: File, productId: string) => Promise<void>;
  uploading: boolean;
}> = ({ productId, onUpload, uploading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = (file: File) => setSelectedFile(file);

  const handleSubmit = async () => {
    if (!selectedFile || !productId) return;
    await onUpload(selectedFile, productId);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <span className="text-3xl">🎲</span>
        <p className="text-sm font-semibold text-slate-700 mt-2">
          {selectedFile ? selectedFile.name : 'Arrastrar aquí o clic para seleccionar'}
        </p>
        <p className="text-xs text-slate-400 mt-1">{FORMAT_INFO}</p>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED_FORMATS} className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
            <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <AdminButton onClick={handleSubmit} loading={uploading} size="sm">
            Subir y Convertir
          </AdminButton>
        </div>
      )}
    </div>
  );
};

// ─── Metadata expander ────────────────────────────────────────────────────────
const MetadataRow: React.FC<{ asset: ProductAsset & { product?: any } }> = ({ asset }) => {
  const [open, setOpen] = useState(false);
  const meta = asset.metadata as any;
  if (!meta) return null;
  return (
    <div className="mt-1">
      <button onClick={() => setOpen(!open)} className="text-[10px] text-blue-500 hover:underline">
        {open ? '▲ Ocultar' : '▼ Ver metadata'}
      </button>
      {open && (
        <div className="mt-1 p-2 bg-slate-50 border border-slate-100 rounded text-[10px] font-mono space-y-0.5">
          {meta.triangles !== undefined && <div>Triángulos: <strong>{meta.triangles?.toLocaleString()}</strong></div>}
          {meta.materials !== undefined && <div>Materiales: <strong>{meta.materials}</strong></div>}
          {meta.fileSizeMb !== undefined && <div>Tamaño GLB: <strong>{meta.fileSizeMb} MB</strong></div>}
          {meta.originalSize !== undefined && <div>Tamaño original: <strong>{(meta.originalSize / 1024 / 1024).toFixed(2)} MB</strong></div>}
          {meta.validation && <div>Validación: <strong>{meta.validation}</strong></div>}
          {meta.validationWarnings?.length > 0 && (
            <div className="text-amber-700">⚠ {meta.validationWarnings.join('; ')}</div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompanyAssetsPage() {
  const {
    assets, products,
    fetchAssets, fetchProducts,
    uploadAsset, retryConversion,
    isLoading,
  } = useAdminCatalogStore();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [targetProductId, setTargetProductId] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(false);

  const load = useCallback(() => {
    fetchAssets();
    fetchProducts();
  }, [fetchAssets, fetchProducts]);

  useEffect(() => { load(); }, [load]);

  // Auto-poll while any asset is in processing/uploaded state
  useEffect(() => {
    const hasProcessing = assets.some(a =>
      (a as any).conversionStatus === 'processing' || (a as any).conversionStatus === 'uploaded'
    );
    if (hasProcessing && !pollingActive) {
      setPollingActive(true);
      const id = setInterval(load, 4000);
      return () => { clearInterval(id); setPollingActive(false); };
    }
  }, [assets, pollingActive, load]);

  const handleUpload = async (file: File, productId: string) => {
    setUploadingId(productId);
    try {
      await uploadAsset(file, productId);
      load();
      setIsUploadOpen(false);
    } catch (err: any) {
      alert('Error al subir: ' + (err?.message || 'Error desconocido'));
    } finally {
      setUploadingId(null);
    }
  };

  const handleRetry = async (assetId: string) => {
    setRetryingId(assetId);
    try {
      await retryConversion(assetId);
      load();
    } catch (err: any) {
      alert('Error al reintentar: ' + (err?.message || 'Error'));
    } finally {
      setRetryingId(null);
    }
  };

  const columns = [
    {
      header: 'Producto',
      accessor: (a: any) => (
        <div>
          <div className="font-semibold text-slate-900 text-sm">{a.product?.name || a.productId}</div>
          <div className="text-[10px] font-mono text-slate-400">{a.product?.sku}</div>
        </div>
      )
    },
    {
      header: 'Tipo',
      accessor: (a: any) => (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
          a.assetType === 'model_3d' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {a.assetType}
        </span>
      )
    },
    {
      header: 'Formato original',
      accessor: (a: any) => (
        <span className="text-xs font-mono uppercase text-slate-600 font-bold">
          {(a as any).originalFormat || '—'}
        </span>
      )
    },
    {
      header: 'Pipeline',
      accessor: (a: any) => (
        <ConversionBadge
          status={(a as any).conversionStatus || 'pending'}
          error={(a as any).conversionError}
        />
      )
    },
    {
      header: 'Validación',
      accessor: (a: any) => <ValidationBadge status={(a as any).metadata?.validation} />
    },
    {
      header: 'GLB / Metadata',
      accessor: (a: any) => (
        <div>
          {a.model3dUrl ? (
            <a href={a.model3dUrl} target="_blank" rel="noreferrer"
              className="text-blue-500 hover:underline text-xs truncate block max-w-[160px]">
              {a.model3dUrl.split('/').pop()}
            </a>
          ) : (
            <span className="text-xs text-slate-400">Sin GLB aún</span>
          )}
          <MetadataRow asset={a} />
        </div>
      )
    },
    {
      header: 'Acciones',
      accessor: (a: any) => (
        <div className="flex gap-2">
          {(a.conversionStatus === 'failed' || a.conversionStatus === 'uploaded') && (
            <AdminButton
              variant="outline" size="sm"
              loading={retryingId === a.id}
              onClick={() => handleRetry(a.id)}
            >
              Reintentar
            </AdminButton>
          )}
        </div>
      )
    },
  ];

  return (
    <AdminLayout type="company" title="Assets 3D">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Biblioteca de Assets 3D</h2>
          <p className="text-sm text-slate-500">
            Sube archivos 3D multi-formato. El sistema los convierte automáticamente a GLB.
            {pollingActive && <span className="ml-2 text-amber-600 font-bold animate-pulse">● Conversión en progreso...</span>}
          </p>
        </div>
        <AdminButton
          onClick={() => setIsUploadOpen(!isUploadOpen)}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>}
        >
          Subir Modelo 3D
        </AdminButton>
      </div>

      {/* ── Upload panel ─────────────────────────────────────── */}
      {isUploadOpen && (
        <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Subir Modelo 3D</h3>
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Producto de destino *</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:outline-none"
              value={targetProductId}
              onChange={e => setTargetProductId(e.target.value)}
            >
              <option value="">Seleccionar producto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          {targetProductId && (
            <UploadZone
              productId={targetProductId}
              onUpload={handleUpload}
              uploading={uploadingId === targetProductId}
            />
          )}
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <strong>Formatos aceptados:</strong> {FORMAT_INFO}<br />
            <strong>DWG:</strong> No soportado — exportar como DXF desde AutoCAD.
          </div>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      <AdminTable
        columns={columns as any}
        data={assets}
        loading={isLoading}
        emptyMessage="Sin assets. Sube un modelo 3D para comenzar."
      />
    </AdminLayout>
  );
}
