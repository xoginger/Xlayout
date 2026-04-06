/**
 * Creado y diseñado por XO
 * XLayout System — Página de Assets 3D
 *
 * Gestión completa de modelos 3D: subida multi-formato, pipeline de conversión,
 * visor 3D con React Three Fiber, metadata técnica, y reintentos.
 * Hardened: badges profesionales, metadata precisa, error fallback visual.
 */

"use client";

import React, { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { useAdminCatalogStore, ProductAsset } from '@/store/admin-catalog-store';

// Carga lazy del visor 3D — evitar bundle pesado si no se usa
const ModelViewer = lazy(() => import('@/components/3d/ModelViewer'));

// ─── Utilidad para formatear bytes de forma legible ──────────────────────────
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ─── Badge de estado del pipeline ────────────────────────────────────────────
const ConversionBadge: React.FC<{ status: string; error?: string }> = ({ status, error }) => {
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    pending:     { label: 'Pendiente',    cls: 'bg-slate-100 text-slate-600',     icon: '⏳' },
    uploaded:    { label: 'Subido',       cls: 'bg-blue-100 text-blue-700',       icon: '📤' },
    processing:  { label: 'Procesando',   cls: 'bg-amber-100 text-amber-700',     icon: '⚙️' },
    converted:   { label: 'Convertido',   cls: 'bg-cyan-100 text-cyan-700',       icon: '🔄' },
    validated:   { label: 'Validado',     cls: 'bg-emerald-100 text-emerald-700', icon: '✅' },
    failed:      { label: 'Error',        cls: 'bg-red-100 text-red-700',         icon: '❌' },
    error:       { label: 'Error',        cls: 'bg-red-100 text-red-700',         icon: '❌' },
    url_only:    { label: 'URL directa',  cls: 'bg-purple-100 text-purple-700',   icon: '🔗' },
  };
  const cfg = map[status] ?? map['pending'];
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${cfg.cls}`}>
        <span>{cfg.icon}</span> {cfg.label}
      </span>
      {error && (
        <span
          className="text-[10px] text-red-500 mt-0.5 max-w-[200px] line-clamp-2 leading-tight"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
};

// ─── Badges de propiedades del asset ─────────────────────────────────────────
const PropertyBadges: React.FC<{ asset: any }> = ({ asset }) => {
  const meta = asset.metadata as any;
  if (!meta) return null;

  const badges: { label: string; cls: string; show: boolean }[] = [
    {
      label: '🗜️ Draco',
      cls: meta.dracoEnabled ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400',
      show: asset.conversionStatus === 'validated' || asset.conversionStatus === 'converted',
    },
    {
      label: meta.validation === 'valid' ? '✓ Válido' : '⚠ Warning',
      cls: meta.validation === 'valid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
      show: !!meta.validation,
    },
    {
      label: meta.orientation?.floorAligned ? '⬇ Piso OK' : '⬇ Piso ⚠',
      cls: meta.orientation?.floorAligned ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700',
      show: !!meta.orientation,
    },
    {
      label: meta.orientation?.centered ? '⊕ Centro OK' : '⊕ Descentrado',
      cls: meta.orientation?.centered ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700',
      show: !!meta.orientation,
    },
    {
      label: meta.normalization?.normalized ? `📏 ×${meta.normalization.scaleApplied}` : '📏 1:1',
      cls: meta.normalization?.normalized ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400',
      show: !!meta.normalization,
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {badges.filter(b => b.show).map((b, i) => (
        <span key={i} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${b.cls}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
};

// Formatos 3D aceptados (SKP vía conversión automática con Blender headless)
const ACCEPTED_FORMATS = '.glb,.gltf,.obj,.dae,.fbx,.3ds,.kmz,.stl,.ply,.ifc,.wrl,.xsi,.skp';
const FORMAT_INFO = 'GLB, GLTF, OBJ, DAE, FBX, 3DS, KMZ, STL, PLY, IFC, WRL, XSI, SKP';

const UploadZone: React.FC<{
  productId: string;
  onUpload: (file: File, productId: string) => Promise<void>;
  uploading: boolean;
}> = ({ productId, onUpload, uploading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    // Validar extensión en frontend
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_FORMATS.split(',').includes(ext)) {
      if (ext === '.dwg' || ext === '.dxf') {
        alert("DWG / DXF no está soportado actualmente en el flujo automático de modelos 3D de XLayout. Exporta el modelo a OBJ o GLB antes de subirlo.");
      } else {
        alert(`Formato de archivo no soportado: ${ext}. Usa formatos como OBJ o GLB.`);
      }
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert(`El archivo excede el límite de 50MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }
    // Nota informativa para archivos SKP
    if (ext === '.skp') {
      const confirmar = confirm(
        '⚠️ Soporte SketchUp (.skp)\n\n' +
        'XLayout intentará convertir este archivo automáticamente. ' +
        'Si la conversión falla, se te indicará cómo exportar desde SketchUp en un formato compatible (OBJ, DAE o FBX).\n\n' +
        'Para mejores resultados, exporta directamente desde SketchUp:\n' +
        'File → Export → 3D Model → OBJ/DAE/FBX\n\n' +
        '¿Deseas intentar la conversión automática?'
      );
      if (!confirmar) return;
    }
    // Subir automáticamente después de la validación
    await onUpload(file, productId);
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          uploading
            ? 'border-blue-400 bg-blue-50 cursor-wait'
            : isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 cursor-pointer'
        }`}
      >
        {uploading ? (
          <>
            <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm font-semibold text-blue-700 mt-2">Subiendo y procesando...</p>
            <p className="text-xs text-blue-500 mt-1">Esto puede tomar unos segundos</p>
          </>
        ) : (
          <>
            <span className="text-3xl">🎲</span>
            <p className="text-sm font-semibold text-slate-700 mt-2">
              Arrastrar aquí o clic para seleccionar
            </p>
            <p className="text-xs text-slate-400 mt-1">{FORMAT_INFO} · Máximo 50MB</p>
            <p className="text-[11px] font-medium text-blue-600 mt-2 px-4 py-1.5 bg-blue-50 rounded inline-block">
              💡 Selecciona un archivo y se subirá automáticamente
            </p>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED_FORMATS} className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
};

// ─── Panel expandible de metadata técnica ─────────────────────────────────────
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
        <div className="mt-1 p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-mono space-y-1">
          {/* ── Geometría ── */}
          {meta.triangles !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-500">Triángulos</span>
              <strong>{meta.triangles.toLocaleString()}</strong>
            </div>
          )}
          {meta.materials !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-500">Materiales</span>
              <strong>{meta.materials}</strong>
            </div>
          )}

          {/* ── Tamaños precisos ── */}
          {meta.originalSizeBytes !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-500">Original</span>
              <strong>{formatBytes(meta.originalSizeBytes)}</strong>
            </div>
          )}
          {meta.optimizedSizeBytes !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-500">GLB optimizado</span>
              <strong>{formatBytes(meta.optimizedSizeBytes)}</strong>
            </div>
          )}
          {meta.compressionRatio !== undefined && meta.compressionRatio !== 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Compresión</span>
              <strong className={meta.compressionRatio > 0 ? 'text-emerald-600' : 'text-amber-600'}>
                {meta.compressionRatio > 0 ? `↓ ${meta.compressionRatio}%` : `↑ ${Math.abs(meta.compressionRatio)}%`}
              </strong>
            </div>
          )}

          {/* ── Pipeline ── */}
          <div className="flex justify-between">
            <span className="text-slate-500">Draco</span>
            <strong className={meta.dracoEnabled ? 'text-violet-600' : 'text-slate-400'}>
              {meta.dracoEnabled ? '✓ Aplicado' : '✗ No aplicado'}
            </strong>
          </div>

          {/* ── Normalización de Escala ── */}
          {meta.normalization?.normalized && (
            <div className="flex justify-between">
              <span className="text-slate-500">Escala Corregida</span>
              <strong className="text-indigo-600">
                {meta.normalization.detectedUnit} → m (×{meta.normalization.scaleApplied})
              </strong>
            </div>
          )}

          {/* ── BBox con dimensiones ── */}
          {meta.boundingBox?.width !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-500">Dimensiones</span>
              <strong>
                {meta.boundingBox.width.toFixed(3)} × {meta.boundingBox.height.toFixed(3)} × {meta.boundingBox.depth.toFixed(3)} m
              </strong>
            </div>
          )}

          {/* ── Orientación ── */}
          {meta.orientation && (
            <div className="flex justify-between">
              <span className="text-slate-500">Orientación</span>
              <strong className={meta.orientation.status === 'ok' ? 'text-emerald-600' : 'text-amber-600'}>
                {meta.orientation.status === 'ok' ? '✓ Correcta' : '⚠ Revisar'}
              </strong>
            </div>
          )}

          {/* ── Warnings ── */}
          {meta.validationWarnings?.length > 0 && (
            <div className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded text-amber-700 space-y-0.5">
              {meta.validationWarnings.map((w: string, i: number) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          )}

          {/* ── Error fallback info ── */}
          {meta.errorType && (
            <div className="mt-1 p-1.5 bg-red-50 border border-red-200 rounded text-red-700">
              Tipo: <strong>{meta.errorType}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Modal de Preview 3D ──────────────────────────────────────────────────────
const Preview3DModal: React.FC<{
  url: string;
  assetName: string;
  onClose: () => void;
}> = ({ url, assetName, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎲</span>
            <h3 className="text-sm font-bold text-slate-800">Preview 3D: {assetName}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
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
};

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CompanyAssetsPage() {
  const {
    assets, products,
    fetchAssets, fetchProducts,
    uploadAsset, retryConversion, forceScale,
    isLoading,
  } = useAdminCatalogStore();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [targetProductId, setTargetProductId] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<{ url: string; name: string } | null>(null);

  const load = useCallback(() => {
    fetchAssets();
    fetchProducts();
  }, [fetchAssets, fetchProducts]);

  useEffect(() => { load(); }, [load]);

  // Auto-poll mientras hay assets en procesamiento
  useEffect(() => {
    const hasProcessing = assets.some(a =>
      ['processing', 'uploaded'].includes((a as any).conversionStatus || '')
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

  const [scalingAssetId, setScalingAssetId] = useState<string | null>(null);
  const [targetUnit, setTargetUnit] = useState<string>('m');

  const handleForceScale = async () => {
    if (!scalingAssetId) return;
    try {
      await forceScale(scalingAssetId, targetUnit);
      setScalingAssetId(null);
      load();
    } catch (err: any) {
      alert('Error al forzar escala: ' + (err?.message || 'Error'));
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
      header: 'Formato',
      accessor: (a: any) => (
        <span className="text-xs font-mono uppercase text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">
          {(a as any).originalFormat || '—'}
        </span>
      )
    },
    {
      header: 'Estado',
      accessor: (a: any) => (
        <div>
          <ConversionBadge
            status={(a as any).conversionStatus || 'pending'}
            error={(a as any).conversionError}
          />
          <PropertyBadges asset={a} />
        </div>
      )
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
            <span className="text-xs text-slate-400">
              {(a as any).conversionStatus === 'error' ? 'Conversión fallida' : 'Sin GLB aún'}
            </span>
          )}
          <MetadataRow asset={a} />
        </div>
      )
    },
    {
      header: 'Acciones',
      accessor: (a: any) => (
        <div className="flex gap-2">
          {a.model3dUrl && ['validated', 'converted'].includes(a.conversionStatus) && (
            <AdminButton
              variant="outline" size="sm"
              onClick={() => setPreviewAsset({
                url: a.model3dUrl,
                name: a.product?.name || a.model3dUrl.split('/').pop() || 'Modelo',
              })}
            >
              Ver 3D
            </AdminButton>
          )}
          {['failed', 'error', 'uploaded'].includes(a.conversionStatus) && (
            <AdminButton
              variant="outline" size="sm"
              loading={retryingId === a.id}
              onClick={() => handleRetry(a.id)}
            >
              Reintentar
            </AdminButton>
          )}
          {scalingAssetId === a.id ? (
            <div className="flex flex-col gap-1 border border-blue-200 bg-blue-50 p-1 rounded">
              <span className="text-[10px] font-bold text-blue-800">Forzar Unidad Orig.</span>
              <select 
                title="Unidad forzada"
                className="text-xs p-1 rounded border border-slate-300"
                value={targetUnit}
                onChange={e => setTargetUnit(e.target.value)}
              >
                <option value="m">Metros (m)</option>
                <option value="cm">Centímetros (cm)</option>
                <option value="mm">Milímetros (mm)</option>
                <option value="in">Pulgadas (in)</option>
              </select>
              <div className="flex gap-1 mt-1">
                <AdminButton variant="primary" size="sm" onClick={handleForceScale}>
                  Aplicar
                </AdminButton>
                <AdminButton variant="outline" size="sm" onClick={() => setScalingAssetId(null)}>
                  X
                </AdminButton>
              </div>
            </div>
          ) : (
            a.originalFileUrl && !['processing'].includes(a.conversionStatus) && (
              <AdminButton
                variant="outline" size="sm" onClick={() => { setScalingAssetId(a.id); setTargetUnit('m'); }}
              >
                Editar Escala
              </AdminButton>
            )
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
            Sube archivos 3D multi-formato. Pipeline automático: conversión → Draco → validación.
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
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <strong>Formatos aceptados:</strong> {FORMAT_INFO}<br />
            <strong>SketchUp (.skp):</strong> Se acepta carga directa. Si la conversión automática no es posible, el sistema te indicará cómo exportar desde SketchUp como OBJ/DAE/FBX.<br />
            <strong>Recomendación:</strong> Para máxima compatibilidad y evitar problemas de escala, exportar los modelos preferiblemente como <strong>.glb</strong>, <strong>.obj</strong> o <strong>.fbx</strong> desde la herramienta CAD.<br />
            <strong>Pipeline automático:</strong> Conversión → Draco compression → Normalización de Escala → Validación de orientación y piso.
          </div>
        </div>
      )}

      <AdminTable
        columns={columns as any}
        data={assets}
        loading={isLoading}
        emptyMessage="Sin assets. Sube un modelo 3D para comenzar."
      />

      {previewAsset && (
        <Preview3DModal
          url={previewAsset.url}
          assetName={previewAsset.name}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </AdminLayout>
  );
}
