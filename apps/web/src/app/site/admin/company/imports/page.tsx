/**
 * Creado y diseñado por XO
 * XLayout System — Módulo de Importaciones CSV/Excel v2
 *
 * Flujo UX profesional:
 * 1. Seleccionar tipo de importación
 * 2. Descargar plantilla (básica o completa)
 * 3. Subir archivo llenado
 * 4. Ejecutar análisis previo (dry-run)
 * 5. Confirmar importación real
 * 6. Ver resultado detallado
 */

"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

// ─── Tipos de importación disponibles ────────────────────────────────────────
const IMPORT_TYPES = [
  {
    value: 'catalog',
    label: 'Productos y Catálogo',
    description: 'Importa productos base, variantes, líneas, categorías y precios. Soporta modelos 3D en GLB, OBJ, FBX, SKP y más.',
    icon: '📦',
    templates: [
      { key: 'catalog-basic', label: 'Básica', desc: 'Solo productos base con precio lista A' },
      { key: 'catalog-full', label: 'Completa', desc: 'Productos + variantes + 5 listas de precio' },
    ],
  },
  {
    value: 'prices',
    label: 'Listas de Precios',
    description: 'Actualiza precios base masivamente por SKU y tipo de lista (A-E).',
    icon: '💰',
    templates: [
      { key: 'prices', label: 'Precios', desc: 'SKU, tipo de lista, moneda y precio' },
    ],
  },
  {
    value: 'conditions',
    label: 'Condiciones Comerciales',
    description: 'Garantías, entregas o descuentos vinculados a productos o líneas.',
    icon: '📋',
    templates: [
      { key: 'conditions', label: 'Condiciones', desc: 'Garantías, envíos, descuentos por volumen' },
    ],
  },
];

// ─── Extensiones aceptadas ───────────────────────────────────────────────────
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

// ─── Badge de estado ─────────────────────────────────────────────────────────
const ImportStatusBadge: React.FC<{ status: string; progress?: number }> = ({ status, progress }) => {
  const sName = status?.toLowerCase();
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    pending:      { label: 'En cola',      cls: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200',    icon: '⏳' },
    waiting:      { label: 'En espera',    cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',    icon: '⏳' },
    active:       { label: 'Procesando',   cls: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200 animate-pulse', icon: '⚙️' },
    processing:   { label: 'Procesando',   cls: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200 animate-pulse', icon: '⚙️' },
    completed:    { label: 'Completado',   cls: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200', icon: '✓' },
    done:         { label: 'Completado',   cls: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200', icon: '✓' },
    failed:       { label: 'Error',        cls: 'bg-red-100 text-red-800 ring-1 ring-red-200',          icon: '✗' },
  };
  const s = map[sName] || map['pending'];
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
        <span>{s.icon}</span> {s.label}
      </span>
      {sName === 'active' && progress !== undefined && (
        <span className="text-[10px] font-mono font-bold text-blue-600">{progress}%</span>
      )}
    </div>
  );
};

// ─── Badge de tipo de importación ────────────────────────────────────────────
const ImportTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const match = IMPORT_TYPES.find(t => t.value === type?.toLowerCase());
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
      <span className="text-sm">{match?.icon || '📄'}</span>
      {match?.label || type}
    </span>
  );
};

// ─── Zona de drag & drop para archivos ───────────────────────────────────────
const FileDropZone: React.FC<{
  file: File | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  error?: string | null;
}> = ({ file, onFileSelect, onClear, error }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div>
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging ? 'border-blue-500 bg-blue-50/70 scale-[1.01]' :
          file ? 'border-emerald-400 bg-emerald-50/50' :
          error ? 'border-red-300 bg-red-50/30' :
          'border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef} type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); }}
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[250px]">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="ml-2 p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
              title="Quitar archivo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">
              Arrastra tu archivo aquí o <span className="text-blue-600 font-semibold">haz clic para seleccionar</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">CSV, XLSX o XLS — máximo 10 MB</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5 font-medium">{error}</p>}
    </div>
  );
};

// ─── Panel de preview (dry-run) ──────────────────────────────────────────────
const PreviewPanel: React.FC<{
  preview: any;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting: boolean;
}> = ({ preview, onConfirm, onCancel, isImporting }) => {
  const s = preview;
  const hasErrors = s.errors && s.errors.length > 0;
  const hasWarnings = s.warnings && s.warnings.length > 0;

  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        Resultado del análisis previo
      </div>

      {/* Contadores principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-blue-700">{s.total || 0}</div>
          <div className="text-[10px] text-blue-500 uppercase font-bold">Filas totales</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-emerald-700">{s.created || 0}</div>
          <div className="text-[10px] text-emerald-500 uppercase font-bold">Productos base</div>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-violet-700">{s.variantsCreated || 0}</div>
          <div className="text-[10px] text-violet-500 uppercase font-bold">Variantes</div>
        </div>
        <div className={`${hasErrors ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border rounded-lg p-3 text-center`}>
          <div className={`text-xl font-bold ${hasErrors ? 'text-red-600' : 'text-slate-400'}`}>{s.failed || 0}</div>
          <div className={`text-[10px] uppercase font-bold ${hasErrors ? 'text-red-400' : 'text-slate-400'}`}>Errores</div>
        </div>
      </div>

      {/* Líneas y categorías detectadas */}
      {(s.linesCreated?.length > 0 || s.categoriesCreated?.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {s.linesCreated?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">Líneas nuevas ({s.linesCreated.length})</div>
              <div className="flex flex-wrap gap-1">
                {s.linesCreated.map((l: string) => (
                  <span key={l} className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-medium">{l}</span>
                ))}
              </div>
            </div>
          )}
          {s.categoriesCreated?.length > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
              <div className="text-[10px] font-bold text-teal-600 uppercase mb-1">Categorías nuevas ({s.categoriesCreated.length})</div>
              <div className="flex flex-wrap gap-1">
                {s.categoriesCreated.map((c: string) => (
                  <span key={c} className="inline-block px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] rounded font-medium">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Errores */}
      {hasErrors && (
        <div className="p-3 border border-red-200 bg-red-50/40 rounded-lg">
          <h4 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
            Errores encontrados ({s.errors.length})
          </h4>
          <div className="max-h-[200px] overflow-y-auto space-y-1.5">
            {s.errors.slice(0, 30).map((err: string, idx: number) => (
              <div key={idx} className="text-[11px] text-red-700 bg-white px-2.5 py-1.5 rounded border border-red-100 font-mono leading-relaxed">
                {err}
              </div>
            ))}
            {s.errors.length > 30 && (
              <p className="text-[10px] text-red-500 italic pt-1">… y {s.errors.length - 30} errores más</p>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="p-3 border border-amber-200 bg-amber-50/40 rounded-lg">
          <h4 className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
            ⚠ Advertencias ({s.warnings.length})
          </h4>
          <div className="max-h-[120px] overflow-y-auto space-y-1">
            {s.warnings.slice(0, 15).map((w: string, idx: number) => (
              <div key={idx} className="text-[11px] text-amber-700 bg-white px-2.5 py-1 rounded border border-amber-100 font-mono">
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={isImporting}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors ${
            hasErrors && s.created === 0
              ? 'bg-slate-400 cursor-not-allowed'
              : isImporting
              ? 'bg-blue-400 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
          }`}
        >
          {isImporting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Importando...
            </span>
          ) : (
            `Confirmar Importación (${(s.created || 0) + (s.variantsCreated || 0)} registros)`
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Panel de resumen de resultado ───────────────────────────────────────────
const ResultSummaryPanel: React.FC<{ summary: any }> = ({ summary }) => {
  if (!summary) return null;
  const s = summary;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {s.created > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-emerald-700">{s.created}</div>
            <div className="text-[10px] text-emerald-500 uppercase font-bold">Productos creados</div>
          </div>
        )}
        {s.updated > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-blue-700">{s.updated}</div>
            <div className="text-[10px] text-blue-500 uppercase font-bold">Actualizados</div>
          </div>
        )}
        {s.variantsCreated > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-violet-700">{s.variantsCreated}</div>
            <div className="text-[10px] text-violet-500 uppercase font-bold">Variantes</div>
          </div>
        )}
        {s.linesCreated?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-amber-700">{s.linesCreated.length}</div>
            <div className="text-[10px] text-amber-500 uppercase font-bold">Líneas nuevas</div>
          </div>
        )}
        {s.categoriesCreated?.length > 0 && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-teal-700">{s.categoriesCreated.length}</div>
            <div className="text-[10px] text-teal-500 uppercase font-bold">Categorías nuevas</div>
          </div>
        )}
        {s.failed > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-red-600">{s.failed}</div>
            <div className="text-[10px] text-red-400 uppercase font-bold">Errores</div>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-4">
        <span>Total filas: <strong className="text-slate-700">{s.total}</strong></span>
        <span>Exitosas: <strong className="text-emerald-600">{s.succeeded}</strong></span>
        <span>Tipo: <strong className="text-slate-700">{s.type}</strong></span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Página principal de Importaciones ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function CompanyImportsPage() {
  const { activeTenantId } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal de nueva importación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(IMPORT_TYPES[0].value);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Flujo preview → confirmar
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select');
  const [previewData, setPreviewData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Modal de errores
  const [errorDetailsJob, setErrorDetailsJob] = useState<any>(null);

  useEffect(() => {
    if (activeTenantId) fetchJobs();
  }, [activeTenantId]);

  // Polling para actualizar estados en proceso
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => ['pending', 'waiting', 'active', 'processing'].includes(j.status?.toLowerCase()));
    if (!hasActiveJobs || !activeTenantId) return;

    const interval = setInterval(async () => {
      try {
        const data = await api.get('/imports');
        setJobs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error en polling:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs, activeTenantId]);

  // ─── Cargar historial de importaciones ─────────────────────────────────
  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/imports');
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar importaciones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Descargar plantilla CSV ───────────────────────────────────────────
  const handleDownloadTemplate = (templateKey: string) => {
    const { token, activeTenantId: tid } = useAuthStore.getState();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = `${baseUrl}/imports/template/${templateKey}`;

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(tid ? { 'x-tenant-id': tid } : {}),
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al descargar plantilla');
        return res.blob();
      })
      .then(blob => {
        const filename = `plantilla_${templateKey}_xlayout.csv`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert('Error al descargar la plantilla. Verifica tu conexión.'));
  };

  // ─── Validar y seleccionar archivo ─────────────────────────────────────
  const handleFileSelect = (file: File) => {
    setFileError(null);
    setSubmitResult(null);
    setPreviewData(null);
    setStep('select');

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setFileError(`Extensión '${ext}' no soportada. Usa CSV, XLSX o XLS.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('El archivo excede el tamaño máximo de 10 MB.');
      return;
    }
    if (file.size === 0) {
      setFileError('El archivo está vacío.');
      return;
    }

    setSelectedFile(file);
  };

  // ─── Ejecutar análisis previo (dry-run) ────────────────────────────────
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setFileError('Selecciona un archivo antes de analizar.');
      return;
    }

    setIsAnalyzing(true);
    setFileError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', selectedType);

      const result = await api.post<{ jobId: string }>('/imports/preview', formData);

      // Esperar a que el job termine (polling rápido)
      const jobId = result.jobId;
      let attempts = 0;
      while (attempts < 30) {
        await new Promise(r => setTimeout(r, 1000));
        const status = await api.get<any>(`/imports/${jobId}/status`);
        if (status.status === 'completed' || status.status === 'done' || status.status === 'COMPLETED') {
          setPreviewData(status.result);
          setStep('preview');
          break;
        }
        if (status.status === 'failed' || status.status === 'FAILED') {
          const errMsg = status.result?.error || status.failedReason || 'Error al analizar el archivo';
          setFileError(errMsg);
          break;
        }
        attempts++;
      }

      if (attempts >= 30) {
        setFileError('El análisis tardó demasiado. Intenta de nuevo.');
      }
    } catch (err: any) {
      setFileError(err.message || 'Error al analizar el archivo');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── Confirmar importación real ────────────────────────────────────────
  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', selectedType);

      const result = await api.post<{ message: string; jobId: string }>('/imports/upload', formData);
      setSubmitResult({ success: true, message: result.message || 'Importación encolada exitosamente' });
      setStep('result');

      // Refrescar historial después de un momento
      setTimeout(() => {
        fetchJobs();
      }, 2000);
    } catch (err: any) {
      setSubmitResult({ success: false, message: err.message || 'Error al procesar la importación' });
    } finally {
      setIsImporting(false);
    }
  };

  // ─── Reset del modal ──────────────────────────────────────────────────
  const resetModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setFileError(null);
    setSubmitResult(null);
    setSelectedType(IMPORT_TYPES[0].value);
    setStep('select');
    setPreviewData(null);
    setIsAnalyzing(false);
    setIsImporting(false);
  };

  // ─── Columnas de la tabla ──────────────────────────────────────────────
  const columns = [
    {
      header: 'ID / Fecha',
      accessor: (job: any) => (
        <div>
          <span className="font-mono text-[10px] text-slate-400 block tracking-tight">
            {job.id?.substring(0, 8)}
          </span>
          <span className="text-[11px] text-slate-600 font-medium">
            {new Date(job.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
      )
    },
    {
      header: 'Tipo / Archivo',
      accessor: (job: any) => (
        <div className="max-w-[200px]">
          <ImportTypeBadge type={job.type} />
          <span className="text-[10px] text-slate-500 block truncate" title={job.filename}>
            {job.filename || '—'}
          </span>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: (job: any) => <ImportStatusBadge status={job.status} progress={job.progress} />
    },
    {
      header: 'Resultado',
      accessor: (job: any) => {
        if (!job.summary) return <span className="text-xs text-slate-400 italic">Procesando...</span>;
        const s = job.summary;
        if (s.error && !s.succeeded) return <span className="text-xs text-red-600 font-medium">{(s.error || '').substring(0, 50)}...</span>;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-xs">
              {s.created > 0 && <span className="text-emerald-600 font-semibold">{s.created} creados</span>}
              {s.updated > 0 && <span className="text-blue-600 font-semibold">{s.updated} actualizados</span>}
              {s.variantsCreated > 0 && <span className="text-violet-600 font-semibold">{s.variantsCreated} variantes</span>}
            </div>
            <span className="text-[10px] text-slate-400">
              {s.succeeded}/{s.total} exitosos
            </span>
            {s.failed > 0 && (
              <button
                onClick={() => setErrorDetailsJob(job)}
                className="text-[10px] text-red-500 font-bold hover:underline text-left"
              >
                Ver {s.failed} errores
              </button>
            )}
          </div>
        );
      }
    },
  ];

  const activeType = IMPORT_TYPES.find(t => t.value === selectedType)!;

  return (
    <AdminLayout type="company" title="Importaciones">
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Importación Masiva de Catálogo</h2>
          <p className="text-sm text-slate-500">
            Carga productos, variantes, precios y condiciones desde archivos CSV o Excel.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchJobs} className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" title="Recargar historial">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
          <AdminButton
            onClick={() => setIsModalOpen(true)}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>}
          >
            Nueva Importación
          </AdminButton>
        </div>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: jobs.length, color: 'text-slate-700' },
          { label: 'Completados', value: jobs.filter(j => ['completed', 'done'].includes(j.status?.toLowerCase())).length, color: 'text-emerald-600' },
          { label: 'En proceso', value: jobs.filter(j => ['pending', 'waiting', 'active', 'processing'].includes(j.status?.toLowerCase())).length, color: 'text-amber-600' },
          { label: 'Con errores', value: jobs.filter(j => j.status?.toLowerCase() === 'failed').length, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla de historial */}
      <AdminTable
        columns={columns as any}
        data={jobs}
        loading={isLoading}
        emptyMessage="No hay importaciones registradas. Usa el botón 'Nueva Importación' para comenzar."
      />

      {/* ─── Modal de Detalles de Errores ──────────────────────────────────── */}
      <AdminModal
        isOpen={!!errorDetailsJob}
        onClose={() => setErrorDetailsJob(null)}
        title="Detalles de la Importación"
        width="max-w-2xl"
      >
        {errorDetailsJob && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">Archivo</p>
                <p className="text-sm font-semibold text-slate-800">{errorDetailsJob.filename}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">Tipo</p>
                <ImportTypeBadge type={errorDetailsJob.type} />
              </div>
            </div>

            {/* Resumen del resultado */}
            <ResultSummaryPanel summary={errorDetailsJob.summary} />

            {errorDetailsJob.summary?.errors?.length > 0 && (
              <div className="p-4 border border-red-100 bg-red-50/30 rounded-lg">
                <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                  Errores detectados ({errorDetailsJob.summary.errors.length}):
                </h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {errorDetailsJob.summary.errors.map((err: string, idx: number) => (
                    <div key={idx} className="text-xs text-red-700 bg-white p-2 rounded border border-red-100 font-mono leading-relaxed">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorDetailsJob.summary?.warnings?.length > 0 && (
              <div className="p-3 border border-amber-100 bg-amber-50/30 rounded-lg">
                <h4 className="text-xs font-bold text-amber-700 mb-2">
                  ⚠ Advertencias ({errorDetailsJob.summary.warnings.length}):
                </h4>
                <div className="max-h-[150px] overflow-y-auto space-y-1">
                  {errorDetailsJob.summary.warnings.map((w: string, idx: number) => (
                    <div key={idx} className="text-[11px] text-amber-600 bg-white px-2 py-1 rounded border border-amber-100 font-mono">
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 italic">
              * Se muestran los primeros 100 errores y 50 advertencias.
            </p>
          </div>
        )}
      </AdminModal>

      {/* ─── Modal de Nueva Importación ───────────────────────────────────── */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={resetModal}
        title="Nueva Importación"
        width="max-w-xl"
        footer={step === 'select' ? <>
          <AdminButton variant="outline" onClick={resetModal}>Cancelar</AdminButton>
          <AdminButton
            onClick={handleAnalyze}
            loading={isAnalyzing}
            disabled={!selectedFile || isAnalyzing}
          >
            {isAnalyzing ? 'Analizando...' : 'Analizar Archivo'}
          </AdminButton>
        </> : step === 'result' ? <>
          <AdminButton variant="outline" onClick={resetModal}>Cerrar</AdminButton>
        </> : null}
      >
        <div className="space-y-5">
          {/* Resultado de envío final */}
          {submitResult && (
            <div className={`p-3 rounded-lg border text-sm font-medium ${
              submitResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {submitResult.success ? '✓ ' : '✗ '}{submitResult.message}
            </div>
          )}

          {step === 'select' && (
            <>
              {/* Paso 1: Tipo de importación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Tipo de importación
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {IMPORT_TYPES.map(t => (
                    <button
                      key={t.value} type="button"
                      onClick={() => { setSelectedType(t.value); setSelectedFile(null); setFileError(null); setSubmitResult(null); setPreviewData(null); }}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        selectedType === t.value
                          ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-200 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xl mt-0.5">{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${selectedType === t.value ? 'text-blue-900' : 'text-slate-800'}`}>
                          {t.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.description}</p>
                      </div>
                      {selectedType === t.value && (
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paso 2: Descargar plantilla */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Descargar plantilla oficial
                </label>
                <div className="space-y-2">
                  {activeType.templates.map(tpl => (
                    <div key={tpl.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700">{tpl.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{tpl.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadTemplate(tpl.key)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        CSV
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paso 3: Subir archivo */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  3. Cargar archivo llenado
                </label>
                <FileDropZone
                  file={selectedFile}
                  onFileSelect={handleFileSelect}
                  onClear={() => { setSelectedFile(null); setFileError(null); setPreviewData(null); }}
                  error={fileError}
                />
              </div>
            </>
          )}

          {step === 'preview' && previewData && (
            <PreviewPanel
              preview={previewData}
              onConfirm={handleConfirmImport}
              onCancel={() => { setStep('select'); setPreviewData(null); }}
              isImporting={isImporting}
            />
          )}

          {step === 'result' && submitResult?.success && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">¡Importación Encolada!</h3>
              <p className="text-sm text-slate-500">
                El archivo se está procesando en segundo plano. El resultado aparecerá en el historial.
              </p>
            </div>
          )}
        </div>
      </AdminModal>
    </AdminLayout>
  );
}
