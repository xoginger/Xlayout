/**
 * Creado y diseñado por XO
 */

import React from 'react';
import { useEditorStore } from '@/store/editor-store';
import { useVersionInfo } from '@/hooks/useVersionInfo';
import { useIntentStore } from '@/intent/intent-store';

export const BottomStatusBar: React.FC = () => {
  const { activeTool, selectedIds, selectedType, gridSize, snapEnabled, advancedMode } = useEditorStore();

  /* Versión del build — obtenida del backend */
  const versionInfo = useVersionInfo();

  /* Intent Engine (Fase 4) */
  const intentLabel = useIntentStore((s) => s.output.intentLabel);
  const intentEnabled = useIntentStore((s) => s.preferences.enabled);
  const showStatusIndicator = useIntentStore((s) => s.preferences.showStatusIndicator);
  const toggleIntent = useIntentStore((s) => s.toggleEnabled);

  /** Formatea fecha ISO a DD/MM/YYYY */
  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const badgeText = versionInfo
    ? `${versionInfo.commit} · ${formatDate(versionInfo.buildDate)}`
    : '…';

  return (
    <footer
      className="h-7 w-full flex items-center justify-between px-4 shrink-0 select-none"
      style={{
        background: 'var(--xo-surface)',
        backdropFilter: 'var(--xo-blur-light)',
        WebkitBackdropFilter: 'var(--xo-blur-light)',
        borderTop: '1px solid var(--xo-border)',
        fontFamily: 'var(--xo-font)',
      }}
    >
      {/* ── Lado izquierdo: herramienta + selección + intent ── */}
      <div className="flex items-center gap-4 h-full">
        {/* Herramienta activa */}
        <div className="flex items-center gap-1.5">
          <span
            className="uppercase tracking-widest"
            style={{ fontSize: 'var(--xo-text-2xs)', color: 'var(--xo-text-dim)', fontWeight: 'var(--xo-weight-bold)' }}
          >
            Herramienta
          </span>
          <span
            className="uppercase"
            style={{ fontSize: 'var(--xo-text-2xs)', color: 'var(--xo-primary)', fontWeight: 'var(--xo-weight-black)', letterSpacing: 'var(--xo-tracking-wide)' }}
          >
            {activeTool?.toUpperCase() || 'SELECT'}
          </span>
        </div>

        {/* Selección */}
        {selectedIds.length > 0 && (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded"
            style={{
              background: 'var(--xo-primary-muted)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
            }}
          >
            <span style={{ fontSize: 'var(--xo-text-2xs)', color: 'var(--xo-text-dim)', fontWeight: 'var(--xo-weight-bold)' }} className="uppercase tracking-widest">
              {selectedIds.length > 1 ? `${selectedIds.length} objetos` : selectedType?.toUpperCase()}
            </span>
            {selectedIds.length === 1 && (
              <span style={{ fontSize: '7px', color: 'var(--xo-text-ghost)', fontFamily: 'var(--xo-font-mono)' }}>
                #{selectedIds[0].substr(0, 8)}
              </span>
            )}
          </div>
        )}

        {/* Intent Engine — badge de intención */}
        {showStatusIndicator && intentEnabled && intentLabel && (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded"
            style={{
              background: 'var(--xo-accent-muted)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
            }}
          >
            <span
              className="w-1 h-1 rounded-full animate-pulse"
              style={{ background: 'var(--xo-accent)' }}
            />
            <span
              className="uppercase"
              style={{ fontSize: 'var(--xo-text-2xs)', color: 'var(--xo-accent)', fontWeight: 'var(--xo-weight-black)', letterSpacing: 'var(--xo-tracking-wide)' }}
            >
              {intentLabel}
            </span>
          </div>
        )}
      </div>

      {/* ── Lado derecho: grid + snap + intent toggle + version ── */}
      <div className="flex items-center gap-4 h-full">
        {/* Grid */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: '7px', color: 'var(--xo-text-ghost)', fontWeight: 'var(--xo-weight-bold)' }} className="uppercase tracking-widest">
            Grid
          </span>
          <span style={{ fontSize: 'var(--xo-text-2xs)', color: 'var(--xo-text-muted)', fontFamily: 'var(--xo-font-mono)', fontWeight: 'var(--xo-weight-bold)' }}>
            {(gridSize * 100).toFixed(0)}cm
          </span>
        </div>

        {/* Snap */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: '7px', color: 'var(--xo-text-ghost)', fontWeight: 'var(--xo-weight-bold)' }} className="uppercase tracking-widest">
            Snap
          </span>
          <span style={{ fontSize: 'var(--xo-text-2xs)', fontWeight: 'var(--xo-weight-black)', color: snapEnabled ? 'var(--xo-success)' : 'var(--xo-text-ghost)' }}>
            {snapEnabled ? 'ON' : 'OFF'}
          </span>
        </div>

        {/* Toggle Intent Engine */}
        <button
          onClick={toggleIntent}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
          style={{
            background: intentEnabled ? 'var(--xo-accent-muted)' : 'transparent',
            border: `1px solid ${intentEnabled ? 'rgba(139, 92, 246, 0.2)' : 'var(--xo-border)'}`,
            fontSize: '7px',
            fontWeight: 800,
            letterSpacing: 'var(--xo-tracking-wide)',
            color: intentEnabled ? 'var(--xo-accent)' : 'var(--xo-text-ghost)',
            textTransform: 'uppercase' as const,
          }}
          title={intentEnabled ? 'Desactivar motor de intención' : 'Activar motor de intención'}
        >
          <span
            className="w-1 h-1 rounded-full"
            style={{ background: intentEnabled ? 'var(--xo-accent)' : 'var(--xo-text-ghost)' }}
          />
          Intent
        </button>

        {/* Toggle Modo Avanzado (Inspector completo) */}
        <button
          onClick={() => useEditorStore.getState().toggleAdvancedMode()}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
          style={{
            background: advancedMode ? 'var(--xo-primary-muted)' : 'transparent',
            border: `1px solid ${advancedMode ? 'rgba(59, 130, 246, 0.2)' : 'var(--xo-border)'}`,
            fontSize: '7px',
            fontWeight: 800,
            letterSpacing: 'var(--xo-tracking-wide)',
            color: advancedMode ? 'var(--xo-primary)' : 'var(--xo-text-ghost)',
            textTransform: 'uppercase' as const,
          }}
          title={advancedMode ? 'Ocultar inspector avanzado' : 'Mostrar inspector avanzado'}
        >
          <span
            className="w-1 h-1 rounded-full"
            style={{ background: advancedMode ? 'var(--xo-primary)' : 'var(--xo-text-ghost)' }}
          />
          Avanzado
        </button>

        {/* Separador */}
        <div className="w-px h-3" style={{ background: 'var(--xo-border)' }} />

        {/* Versión */}
        <span
          style={{
            fontSize: '7px',
            fontFamily: 'var(--xo-font-mono)',
            color: 'var(--xo-text-ghost)',
            fontWeight: 'var(--xo-weight-medium)',
            letterSpacing: 'var(--xo-tracking-normal)',
          }}
          title={versionInfo ? `v${versionInfo.version} · ${versionInfo.commit} · ${versionInfo.buildDate}` : '…'}
        >
          XLayout · {badgeText}
        </span>
      </div>
    </footer>
  );
};
