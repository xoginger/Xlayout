/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useCallback, useEffect, useMemo } from 'react';
import { useRadialMenu } from '@/hooks/useRadialMenu';
import { useEditorStore } from '@/store/editor-store';
import { useSelectionContext } from '@/hooks/useSelectionContext';
import { useIntentStore } from '@/intent/intent-store';
import './radial-menu.css';

/* ─── Definición de un ítem del menú ─── */

interface RadialItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  danger?: boolean;
}

/* ─── Iconos SVG compactos ─── */

const Icons = {
  move: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </svg>
  ),
  rotate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
    </svg>
  ),
  duplicate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  dimension: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" />
    </svg>
  ),
  group: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" /><rect x="14" y="14" width="8" height="8" rx="1" />
    </svg>
  ),
  ungroup: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 4v16M4 12h16" />
    </svg>
  ),
  catalog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  wall: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  ),
  inspector: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  select: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    </svg>
  ),
  undo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  ),
};

/* ─── Cálculo de posición circular ─── */

function getItemPosition(index: number, total: number, radius: number): { x: number; y: number } {
  // Arrancar desde arriba (-90°) y distribuir en círculo completo
  const angle = ((index / total) * 2 * Math.PI) - (Math.PI / 2);
  return {
    x: Math.cos(angle) * radius + 120, // 120 = mitad del ring (240/2)
    y: Math.sin(angle) * radius + 120,
  };
}

/* ─── Componente Principal: Menú Radial ─── */

export const RadialMenu: React.FC = () => {
  const { isOpen, position, context, close } = useRadialMenu();
  const ctx = useSelectionContext();
  const {
    setActiveTool,
    duplicateItem,
    removeItem,
    saveToHistory,
    updateItem,
    groupSelection,
    ungroupSelection,
    setCatalogPanelState,
    undo,
  } = useEditorStore();

  /* ── Intent Engine (Fase 4) ── */
  const currentIntent = useIntentStore((s) => s.output.intent);
  const intentEnabled = useIntentStore((s) => s.preferences.enabled);

  /* ── Cerrar con Escape ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  /* ── Construir ítems según contexto ── */
  const items: RadialItem[] = useMemo(() => {
    if (context === 'empty') {
      // Sin selección — acciones globales
      const emptyItems: RadialItem[] = [
        {
          id: 'catalog',
          label: 'Catálogo',
          icon: Icons.catalog,
          action: () => { setCatalogPanelState('open'); close(); },
        },
        {
          id: 'wall',
          label: 'Muro',
          icon: Icons.wall,
          action: () => { setActiveTool('wall'); close(); },
        },
        {
          id: 'dimension',
          label: 'Acotar',
          icon: Icons.dimension,
          action: () => { setActiveTool('dimension'); close(); },
        },
        {
          id: 'line',
          label: 'Línea',
          icon: Icons.select,
          action: () => { setActiveTool('line'); close(); },
        },
        {
          id: 'rectangle',
          label: 'Área',
          icon: Icons.group,
          action: () => { setActiveTool('rectangle'); close(); },
        },
        {
          id: 'undo',
          label: 'Deshacer',
          icon: Icons.undo,
          action: () => { undo(); close(); },
        },
      ];

      /* ── Intent Engine: reordenar según intención (Fase 4) ── */
      if (intentEnabled && currentIntent === 'dimension') {
        // Priorizar acotar al inicio
        const dimIdx = emptyItems.findIndex(i => i.id === 'dimension');
        if (dimIdx > 0) {
          const [dim] = emptyItems.splice(dimIdx, 1);
          emptyItems.unshift(dim);
        }
      } else if (intentEnabled && currentIntent === 'insert') {
        // Priorizar catálogo al inicio
        const catIdx = emptyItems.findIndex(i => i.id === 'catalog');
        if (catIdx > 0) {
          const [cat] = emptyItems.splice(catIdx, 1);
          emptyItems.unshift(cat);
        }
      }

      return emptyItems;
    }

    if (context === 'multi') {
      // Selección múltiple — acciones grupales
      return [
        {
          id: 'move',
          label: 'Mover',
          icon: Icons.move,
          action: () => { setActiveTool('move'); close(); },
        },
        {
          id: 'duplicate',
          label: 'Duplicar',
          icon: Icons.duplicate,
          action: () => { duplicateItem(); close(); },
        },
        {
          id: 'group',
          label: 'Agrupar',
          icon: Icons.group,
          action: () => { groupSelection(); close(); },
        },
        {
          id: 'dimension',
          label: 'Acotar',
          icon: Icons.dimension,
          action: () => { setActiveTool('dimension'); close(); },
        },
        {
          id: 'delete',
          label: 'Eliminar',
          icon: Icons.trash,
          action: () => { removeItem(); close(); },
          danger: true,
        },
      ];
    }

    // Selección única — acciones sobre el objeto
    const singleItems: RadialItem[] = [
      {
        id: 'move',
        label: 'Mover',
        icon: Icons.move,
        action: () => { setActiveTool('move'); close(); },
      },
      {
        id: 'rotate',
        label: 'Rotar',
        icon: Icons.rotate,
        action: () => {
          // Rotación rápida 90° para items, o activar herramienta rotate
          if (ctx.item) {
            saveToHistory();
            updateItem(ctx.item.id, {
              rotation: [ctx.item.rotation[0], ctx.item.rotation[1] + Math.PI / 2, ctx.item.rotation[2]],
            });
          } else {
            setActiveTool('rotate');
          }
          close();
        },
      },
      {
        id: 'duplicate',
        label: 'Duplicar',
        icon: Icons.duplicate,
        action: () => { duplicateItem(ctx.id || undefined); close(); },
      },
      {
        id: 'dimension',
        label: 'Acotar',
        icon: Icons.dimension,
        action: () => { setActiveTool('dimension'); close(); },
      },
      {
        id: 'properties',
        label: 'Inspector',
        icon: Icons.inspector,
        action: () => { useEditorStore.getState().toggleAdvancedMode(); close(); },
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: Icons.trash,
        action: () => { removeItem(ctx.id || undefined); close(); },
        danger: true,
      },
    ];

    return singleItems;
  }, [context, ctx, currentIntent, intentEnabled, setActiveTool, duplicateItem, removeItem, saveToHistory, updateItem, groupSelection, setCatalogPanelState, undo, close]);

  /* ── Clic en backdrop → cerrar ── */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  }, [close]);

  if (!isOpen) return null;

  // Radio del anillo (distancia del centro a los ítems)
  const radius = 85;

  // Enclavar posición para que no salga de pantalla
  const clampedX = Math.max(140, Math.min(window.innerWidth - 140, position.x));
  const clampedY = Math.max(140, Math.min(window.innerHeight - 140, position.y));

  return (
    <>
      {/* Backdrop invisible para capturar clics fuera */}
      <div
        className="radial-menu__backdrop"
        onClick={handleBackdropClick}
        onContextMenu={(e) => { e.preventDefault(); close(); }}
      />

      {/* Menú radial posicionado */}
      <div
        className="radial-menu radial-menu--open"
        style={{ left: clampedX, top: clampedY }}
        role="menu"
        aria-label="Menú radial contextual"
      >
        <div className="radial-menu__ring">
          {/* Punto central */}
          <div className="radial-menu__center">
            <div className="radial-menu__center-dot" />
          </div>

          {/* Ítems distribuidos en círculo */}
          {items.map((item, idx) => {
            const pos = getItemPosition(idx, items.length, radius);
            return (
              <button
                key={item.id}
                className={`radial-menu__item ${item.danger ? 'radial-menu__item--danger' : ''}`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  animationDelay: `${idx * 0.03}s`,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  item.action();
                }}
                role="menuitem"
                title={item.label}
              >
                <div className="radial-menu__item-icon">{item.icon}</div>
                <span className="radial-menu__item-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
