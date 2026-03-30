/**
 * Creado y diseñado por XO
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';
import './command-palette.css';

/**
 * Definición de un comando registrable
 */
interface Command {
  id: string;
  name: string;
  description?: string;
  icon: string;
  shortcut?: string;
  group: 'herramienta' | 'acción' | 'vista' | 'configuración';
  action: () => void;
}

/**
 * Búsqueda fuzzy simple: retorna true si cada carácter de query aparece en order en target
 */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * Paleta de comandos profesional — Ctrl+K / ⌘K
 */
export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Acceso al store del editor
  const {
    setActiveTool,
    duplicateItem,
    removeItem,
    setViewMode,
    toggleSnap,
    toggleGrid,
  } = useEditorStore();

  // Registro centralizado de comandos
  const commands: Command[] = useMemo(() => [
    // ─── Herramientas ───
    { id: 'tool-select', name: 'Seleccionar', description: 'Herramienta de selección', icon: '🖱️', shortcut: 'Space', group: 'herramienta', action: () => setActiveTool('select') },
    { id: 'tool-move', name: 'Mover', description: 'Trasladar objetos', icon: '✥', shortcut: 'V', group: 'herramienta', action: () => setActiveTool('move') },
    { id: 'tool-rotate', name: 'Rotar', description: 'Rotar objetos', icon: '↻', shortcut: 'R', group: 'herramienta', action: () => setActiveTool('rotate') },
    { id: 'tool-wall', name: 'Muro', description: 'Dibujar muro', icon: '🧱', shortcut: 'W', group: 'herramienta', action: () => setActiveTool('wall') },
    { id: 'tool-line', name: 'Línea', description: 'Dibujar línea', icon: '📏', shortcut: 'L', group: 'herramienta', action: () => setActiveTool('line') },
    { id: 'tool-rectangle', name: 'Rectángulo', description: 'Dibujar rectángulo', icon: '⬜', shortcut: 'E', group: 'herramienta', action: () => setActiveTool('rectangle') },
    { id: 'tool-dimension', name: 'Acotar', description: 'Crear acotación', icon: '📐', shortcut: 'D', group: 'herramienta', action: () => setActiveTool('dimension') },
    { id: 'tool-orbit', name: 'Orbitar', description: 'Navegar la cámara', icon: '🔄', shortcut: 'O', group: 'herramienta', action: () => setActiveTool('orbit') },
    { id: 'tool-pan', name: 'Paneo', description: 'Mover la vista', icon: '🤚', shortcut: 'H', group: 'herramienta', action: () => setActiveTool('pan') },

    // ─── Acciones ───
    { id: 'act-duplicate', name: 'Duplicar', description: 'Duplicar selección', icon: '📋', shortcut: 'Ctrl+D', group: 'acción', action: () => duplicateItem() },
    { id: 'act-delete', name: 'Eliminar', description: 'Eliminar selección', icon: '🗑️', shortcut: 'Del', group: 'acción', action: () => removeItem() },
    { id: 'act-undo', name: 'Deshacer', description: 'Revertir última acción', icon: '↩️', shortcut: 'Ctrl+Z', group: 'acción', action: () => useEditorStore.getState().undo() },
    { id: 'act-redo', name: 'Rehacer', description: 'Rehacer última acción', icon: '↪️', shortcut: 'Ctrl+Y', group: 'acción', action: () => useEditorStore.getState().redo() },
    { id: 'act-catalog', name: 'Abrir Catálogo', description: 'Toglear panel de productos', icon: '📦', shortcut: 'Tab', group: 'acción', action: () => {
      const store = useEditorStore.getState();
      store.setCatalogPanelState(store.catalogPanelState === 'open' ? 'hidden' : 'open');
    }},
    { id: 'act-export', name: 'Exportar Escena', description: 'Descargar archivo JSON', icon: '💾', group: 'acción', action: () => {
      // Exportar la escena actual como JSON descargable
      const state = useEditorStore.getState();
      const data = { items: state.items, walls: state.walls, dimensions: state.dimensions };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'xlayout-scene.json'; a.click();
      URL.revokeObjectURL(url);
    }},

    // ─── Vistas ───
    { id: 'view-3d', name: 'Vista 3D', description: 'Perspectiva tridimensional', icon: '🌐', group: 'vista', action: () => setViewMode('3D') },
    { id: 'view-2d', name: 'Vista 2D', description: 'Planta cenital', icon: '📋', group: 'vista', action: () => setViewMode('2D') },

    // ─── Configuración ───
    { id: 'cfg-snap', name: 'Toggle Snap', description: 'Activar/desactivar ajuste a grilla', icon: '🧲', shortcut: 'S', group: 'configuración', action: () => { if (toggleSnap) toggleSnap(); }},
    { id: 'cfg-grid', name: 'Toggle Grid', description: 'Mostrar/ocultar grilla', icon: '🔲', shortcut: 'G', group: 'configuración', action: () => { if (toggleGrid) toggleGrid(); }},
  ], [setActiveTool, duplicateItem, removeItem, setViewMode, toggleSnap, toggleGrid]);

  // Filtrado por búsqueda fuzzy
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return commands.filter(c =>
      fuzzyMatch(query, c.name) || fuzzyMatch(query, c.description || '') || fuzzyMatch(query, c.group)
    );
  }, [query, commands]);

  // Agrupar resultados
  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of filtered) {
      if (!groups[cmd.group]) groups[cmd.group] = [];
      groups[cmd.group].push(cmd);
    }
    return groups;
  }, [filtered]);

  // Abrir/cerrar con Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(prev => !prev);
        setQuery('');
        setActiveIndex(0);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen]);

  // Auto-focus al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Navegación con teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    }
    if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      filtered[activeIndex].action();
      setIsOpen(false);
    }
  }, [filtered, activeIndex]);

  // Scroll al elemento activo
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Resetear índice al cambiar query
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const groupLabels: Record<string, string> = {
    herramienta: 'Herramientas',
    acción: 'Acciones',
    vista: 'Vistas',
    configuración: 'Configuración',
  };

  let flatIndex = 0;

  return (
    <div className="xo-cmd-backdrop" onClick={() => setIsOpen(false)}>
      <div className="xo-cmd-palette" onClick={(e) => e.stopPropagation()}>
        {/* Barra de búsqueda */}
        <div className="xo-cmd-search">
          <svg className="xo-cmd-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar herramientas, acciones, vistas..."
            autoComplete="off"
            spellCheck={false}
          />
          <span className="xo-cmd-shortcut-hint">ESC</span>
        </div>

        {/* Resultados agrupados */}
        <div className="xo-cmd-results" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="xo-cmd-empty">Sin resultados para &quot;{query}&quot;</div>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => (
              <div key={group}>
                <div className="xo-cmd-group-label">{groupLabels[group] || group}</div>
                {cmds.map(cmd => {
                  const currentIndex = flatIndex++;
                  return (
                    <div
                      key={cmd.id}
                      className="xo-cmd-item"
                      data-active={currentIndex === activeIndex ? 'true' : undefined}
                      data-index={currentIndex}
                      onClick={() => { cmd.action(); setIsOpen(false); }}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                    >
                      <div className="xo-cmd-item-icon">{cmd.icon}</div>
                      <div className="xo-cmd-item-text">
                        <span className="xo-cmd-item-name">{cmd.name}</span>
                        {cmd.description && <span className="xo-cmd-item-desc">{cmd.description}</span>}
                      </div>
                      {cmd.shortcut && <span className="xo-cmd-item-shortcut">{cmd.shortcut}</span>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="xo-cmd-footer">
          <span><kbd>↑↓</kbd> Navegar · <kbd>↵</kbd> Ejecutar</span>
          <span>XLayout Command Palette</span>
        </div>
      </div>
    </div>
  );
};
