/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { useSelectionContext } from '@/hooks/useSelectionContext';
import { useIntentStore } from '@/intent/intent-store';
import { calculateDistance } from '@/utils/cad-math';
import { formatDimensionValue, calculateAlignedDistance } from '@/utils/dimension-math';
import './contextual-inspector.css';

/* ─── Iconos SVG inline (minimalistas) ─── */

const DuplicateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const RotateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
  </svg>
);

/* ─── Componente: Campo de propiedad inline ─── */

const PropField: React.FC<{
  label: string;
  value: string | number;
  suffix?: string;
  editable?: boolean;
  onChange?: (val: number) => void;
  step?: number;
}> = ({ label, value, suffix = '', editable = false, onChange, step = 0.1 }) => (
  <div className="ctx-inspector__prop">
    <span className="ctx-inspector__prop-label">{label}</span>
    {editable && onChange ? (
      <input
        type="number"
        className="ctx-inspector__prop-input"
        value={typeof value === 'number' ? value.toFixed(2) : value}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <span className="ctx-inspector__prop-value">{value}{suffix}</span>
    )}
  </div>
);

/* ─── Componente: Contenido para SceneItem (muebles, activos) ─── */

const ItemContent: React.FC = () => {
  const ctx = useSelectionContext();
  const updateItem = useEditorStore((s) => s.updateItem);
  if (!ctx.item) return null;
  const { item } = ctx;

  return (
    <>
      <PropField label="X" value={item.position[0]} editable onChange={(v) => updateItem(item.id, { position: [v, item.position[1], item.position[2]] })} />
      <PropField label="Z" value={item.position[2]} editable onChange={(v) => updateItem(item.id, { position: [item.position[0], item.position[1], v] })} />
      <div className="ctx-inspector__divider" />
      <PropField label="R°" value={Math.round((item.rotation[1] * 180) / Math.PI)} suffix="°" />
      <PropField label="W" value={`${item.width}m`} />
    </>
  );
};

/* ─── Componente: Contenido para Muro ─── */

const WallContent: React.FC = () => {
  const ctx = useSelectionContext();
  const updateWall = useEditorStore((s) => s.updateWall);
  if (!ctx.wall) return null;
  const { wall } = ctx;
  const length = calculateDistance(wall.start, wall.end);

  return (
    <>
      <PropField label="L" value={length.toFixed(2)} suffix="m" />
      <PropField label="H" value={wall.height} editable onChange={(v) => updateWall(wall.id, { height: v })} step={0.1} />
      <PropField label="E" value={wall.thickness} editable onChange={(v) => updateWall(wall.id, { thickness: v })} step={0.05} />
    </>
  );
};

/* ─── Componente: Contenido para Acotación ─── */

const DimensionContent: React.FC = () => {
  const ctx = useSelectionContext();
  if (!ctx.dimension) return null;
  const { dimension } = ctx;
  const dist = dimension.value || calculateAlignedDistance(dimension.start, dimension.end, dimension.alignment || 'aligned');
  const formatted = formatDimensionValue(dist, dimension.unit || 'm');

  return (
    <>
      <PropField label="📏" value={formatted} />
    </>
  );
};

/* ─── Componente: Contenido para Volumen ─── */

const VolumeContent: React.FC = () => {
  const ctx = useSelectionContext();
  const updateVolume = useEditorStore((s) => s.updateVolume);
  if (!ctx.volume) return null;
  const { volume } = ctx;

  return (
    <>
      <PropField label="H" value={volume.height} editable onChange={(v) => updateVolume(volume.id, { height: v })} step={0.1} />
    </>
  );
};

/* ─── Componente: Contenido para Selección Múltiple ─── */

const MultiContent: React.FC<{ count: number }> = ({ count }) => (
  <PropField label="SEL" value={`${count} objetos`} />
);

/* ─── Componente Principal: ContextualInspector ─── */

export const ContextualInspector: React.FC = () => {
  const ctx = useSelectionContext();
  const duplicateItem = useEditorStore((s) => s.duplicateItem);
  const removeItem = useEditorStore((s) => s.removeItem);
  const updateItem = useEditorStore((s) => s.updateItem);
  const saveToHistory = useEditorStore((s) => s.saveToHistory);

  /** Rotar 90° en Y (solo para SceneItems) */
  const handleRotate90 = useCallback(() => {
    if (!ctx.item) return;
    saveToHistory();
    const currentY = ctx.item.rotation[1];
    updateItem(ctx.item.id, {
      rotation: [ctx.item.rotation[0], currentY + Math.PI / 2, ctx.item.rotation[2]],
    });
  }, [ctx.item, updateItem, saveToHistory]);

  /** Duplicar acción */
  const handleDuplicate = useCallback(() => {
    duplicateItem(ctx.id || undefined);
  }, [ctx.id, duplicateItem]);

  /** Eliminar acción */
  const handleDelete = useCallback(() => {
    removeItem(ctx.id || undefined);
  }, [ctx.id, removeItem]);

  // Intent Engine (Fase 4)
  const intentOutput = useIntentStore((s) => s.output);
  const intentEnabled = useIntentStore((s) => s.preferences.enabled);

  // No renderizar si no hay selección
  if (!ctx.hasSelection) return null;

  // Suprimir durante navegación pura (Fase 4)
  if (intentEnabled && intentOutput.suppression.suppressInspector) return null;

  return (
    <div className="ctx-inspector" role="toolbar" aria-label="Inspector contextual">
      {/* Badge de tipo */}
      <div className="ctx-inspector__badge">
        <span className="ctx-inspector__badge-dot" />
        {ctx.typeLabel}
      </div>

      {/* Micro-badge de intención (Fase 4) */}
      {intentEnabled && intentOutput.intentLabel && intentOutput.intent !== 'idle' && (
        <div className="ctx-inspector__intent-badge" title={`Intención: ${intentOutput.intentLabel}`}>
          {intentOutput.intentLabel}
        </div>
      )}

      {/* Nombre del elemento */}
      <span className="ctx-inspector__label">{ctx.label}</span>

      <div className="ctx-inspector__divider" />

      {/* Propiedades rápidas según tipo */}
      {ctx.item && <ItemContent />}
      {ctx.wall && <WallContent />}
      {ctx.dimension && <DimensionContent />}
      {ctx.volume && <VolumeContent />}
      {ctx.isMulti && <MultiContent count={ctx.count} />}

      <div className="ctx-inspector__divider" />

      {/* Acciones rápidas */}
      {ctx.item && (
        <button className="ctx-inspector__action ctx-inspector__action--primary" onClick={handleRotate90} title="Rotar 90°">
          <RotateIcon />
        </button>
      )}

      <button className="ctx-inspector__action" onClick={handleDuplicate} title="Duplicar (Ctrl+C → Ctrl+V)">
        <DuplicateIcon />
      </button>

      <button className="ctx-inspector__action ctx-inspector__action--danger" onClick={handleDelete} title="Eliminar (Del)">
        <TrashIcon />
      </button>
    </div>
  );
};
