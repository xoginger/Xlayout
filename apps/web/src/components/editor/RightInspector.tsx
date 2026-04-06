/**
 * Creado y diseñado por XO
 */

import React, { useState } from 'react';
import { useEditorStore, Scene, Layer, type DimensionUnit, type DimensionAlignment } from '@/store/editor-store';
import { calculateDistance } from '@/utils/cad-math';
import { formatDimensionValue, calculateAlignedDistance } from '@/utils/dimension-math';
import { extractFirstPageAsImage } from '@/utils/pdf-extractor';
import { QuoteInspectorSection } from './QuoteInspectorSection';

export const RightInspector: React.FC = () => {
  const selectedIds = useEditorStore(s => s.selectedIds);
  const selectedType = useEditorStore(s => s.selectedType);
  const items = useEditorStore(s => s.items);
  const walls = useEditorStore(s => s.walls);
  const openings = useEditorStore(s => s.openings);
  const dimensions = useEditorStore(s => s.dimensions);
  const lines = useEditorStore(s => s.lines);
  const rectangles = useEditorStore(s => s.rectangles);
  const faces = useEditorStore(s => s.faces);
  const volumes = useEditorStore(s => s.volumes);
  const layers = useEditorStore(s => s.layers);
  const scenes = useEditorStore(s => s.scenes);
  const activeLayerId = useEditorStore(s => s.activeLayerId);
  const project = useEditorStore(s => s.project);
  const blueprint = useEditorStore(s => s.blueprint);
  const activeTool = useEditorStore(s => s.activeTool);

  const updateItem = useEditorStore(s => s.updateItem);
  const updateWall = useEditorStore(s => s.updateWall);
  const updateOpening = useEditorStore(s => s.updateOpening);
  const updateLine = useEditorStore(s => s.updateLine);
  const updateRectangle = useEditorStore(s => s.updateRectangle);
  const updateFace = useEditorStore(s => s.updateFace);
  const updateVolume = useEditorStore(s => s.updateVolume);
  const updateDimension = useEditorStore(s => s.updateDimension);
  const removeItem = useEditorStore(s => s.removeItem);
  const toggleLayer = useEditorStore(s => s.toggleLayer);
  const updateLayer = useEditorStore(s => s.updateLayer);
  const addLayer = useEditorStore(s => s.addLayer);
  const setActiveLayer = useEditorStore(s => s.setActiveLayer);
  const duplicateItem = useEditorStore(s => s.duplicateItem);
  const addScene = useEditorStore(s => s.addScene);
  const updateScene = useEditorStore(s => s.updateScene);
  const removeScene = useEditorStore(s => s.removeScene);
  const applyScene = useEditorStore(s => s.applyScene);
  const setProjectName = useEditorStore(s => s.setProjectName);
  const updateBlueprint = useEditorStore(s => s.updateBlueprint);
  const setActiveTool = useEditorStore(s => s.setActiveTool);

  const [activeTab, setActiveTab] = useState<'properties' | 'scene' | 'layers' | 'components' | 'quote' | 'blueprint'>('properties');
  const toggleAdvancedMode = useEditorStore((s) => s.toggleAdvancedMode);

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const isMulti = selectedIds.length > 1;

  const selectedItem = items.find(i => i.id === selectedId);
  const selectedWall = walls.find(w => w.id === selectedId);
  const selectedDim = dimensions.find(d => d.id === selectedId);
  const selectedOpening = openings.find(o => o.id === selectedId);
  const selectedLine = lines.find(l => l.id === selectedId);
  const selectedRect = rectangles.find(r => r.id === selectedId);
  const selectedFace = faces.find(f => f.id === selectedId);
  const selectedVolume = volumes.find(v => v.id === selectedId);

  const renderProperties = () => {
    if (selectedIds.length === 0) {
      return (
        <div className="p-8 h-full flex flex-col items-center justify-center opacity-40 grayscale space-y-4">
           <div className="text-5xl">📐</div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center max-w-[140px] leading-relaxed" style={{ color: 'var(--xo-text-ghost)' }}>
             SELECCIONE UN OBJETO PARA INSPECCIONAR GEOMETRÍA
           </p>
        </div>
      );
    }

    if (isMulti) {
      return (
        <div className="animate-in fade-in slide-in-from-right-3 duration-500">
          <div className="p-4 flex flex-col gap-1" style={{ borderBottom: '1px solid var(--xo-border)', background: 'var(--xo-primary-muted)' }}>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--xo-primary)' }}>
              Selección Múltiple
            </span>
            <h2 className="text-sm font-black uppercase tracking-tighter truncate" style={{ color: 'var(--xo-text)' }}>
              {selectedIds.length} Objetos Seleccionados
            </h2>
          </div>
          <div className="p-4 space-y-6">
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--xo-text-muted)' }}>
              Has seleccionado múltiples entidades. Puedes moverlas juntas usando el gizmo central o realizar acciones globales.
            </p>
            <section className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--xo-border)' }}>
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3" style={{ color: 'var(--xo-text-dim)' }}>
                ACCIONES DE GRUPO <div className="h-px flex-1" style={{ background: 'var(--xo-border)' }}></div>
              </h3>
              <div className="flex gap-2">
                 <button 
                   onClick={() => { duplicateItem(); }}
                   className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                   style={{ background: 'var(--xo-surface-hover)', color: 'var(--xo-text-secondary)', border: '1px solid var(--xo-border)' }}
                 >
                   Duplicar Todo
                 </button>
                 <button 
                   onClick={() => { removeItem(); }}
                   className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                   style={{ background: 'var(--xo-danger-muted)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}
                 >
                   Eliminar Todo
                 </button>
              </div>
            </section>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-right-3 duration-500">
        <div className="p-4 flex flex-col gap-1" style={{ borderBottom: '1px solid var(--xo-border)', background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--xo-primary)' }}>
            {selectedType || 'Entidad'}
          </span>
          <h2 className="text-sm font-black uppercase tracking-tighter truncate" style={{ color: 'var(--xo-text)' }}>
            {selectedType === 'wall' ? 'Muro Estructural' : 
             selectedType === 'item' ? selectedItem?.label || 'Instancia de Activo' : 
             selectedType === 'opening' ? 'Vano / Apertura' : 
             selectedType === 'rectangle' ? 'Área Arquitectónica' : 
             selectedType === 'line' ? 'Línea de Trazo' : 
             selectedType === 'face' ? 'Superficie Generada' :
             selectedType === 'volume' ? 'Objeto Volumétrico' : 'Medición'}
          </h2>
          <span className="text-[8px] font-mono uppercase" style={{ color: 'var(--xo-text-ghost)' }}>UUID: {selectedId}</span>
        </div>

        <div className="p-4 space-y-6">
          {selectedWall && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3" style={{ color: 'var(--xo-text-dim)' }}>
                GEOMETRÍA DEL MURO <div className="h-px flex-1" style={{ background: 'var(--xo-border)' }}></div>
              </h3>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--xo-border)' }}>
                <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--xo-text-dim)' }}>Largo Total</span>
                <span className="text-sm font-black font-mono" style={{ color: 'var(--xo-primary)' }}>
                  {calculateDistance(selectedWall.start, selectedWall.end).toFixed(3)}m
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Espesor (m)</label>
                  <input 
                    type="number" step="0.05" min="0.05" value={selectedWall.thickness} 
                    onChange={(e) => updateWall(selectedWall.id, { thickness: parseFloat(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2 text-xs font-mono font-bold outline-none transition-all"
                    style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Altura (m)</label>
                  <input 
                    type="number" step="0.1" min="0.5" value={selectedWall.height} 
                    onChange={(e) => updateWall(selectedWall.id, { height: parseFloat(e.target.value) })}
                    className="w-full rounded-lg px-2.5 py-2 text-xs font-mono font-bold outline-none transition-all"
                    style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} 
                  />
                </div>
              </div>
            </section>
          )}

          {selectedOpening && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3" style={{ color: 'var(--xo-text-dim)' }}>
                PARÁMETROS DEL VANO <div className="h-px flex-1" style={{ background: 'var(--xo-border)' }}></div>
              </h3>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Ancho (m)</label>
                <input type="number" step="0.1" value={selectedOpening.width} onChange={(e) => updateOpening(selectedOpening.id, { width: parseFloat(e.target.value) })} className="w-full rounded-lg px-2.5 py-2 text-xs font-mono font-bold outline-none" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Posición Relativa (%)</label>
                <input type="range" min="0" max="1" step="0.01" value={selectedOpening.offset} onChange={(e) => updateOpening(selectedOpening.id, { offset: parseFloat(e.target.value) })} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600" style={{ background: 'var(--xo-border)' }} />
              </div>
            </section>
          )}

          {selectedFace && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3" style={{ color: 'var(--xo-text-dim)' }}>
                PROPIEDADES DE SUPERFICIE <div className="h-px flex-1" style={{ background: 'var(--xo-border)' }}></div>
              </h3>
              <div className="p-3 rounded-xl flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--xo-border)' }}>
                <span className="text-[9px] font-black uppercase" style={{ color: 'var(--xo-text-dim)' }}>Vértices del Polígono</span>
                <span className="text-sm font-black font-mono px-2 py-0.5 rounded" style={{ color: 'var(--xo-primary)', background: 'var(--xo-primary-muted)', border: '1px solid var(--xo-border)' }}>{selectedFace.points.length}</span>
              </div>
              <button 
                onClick={() => {
                  useEditorStore.getState().setActiveTool('extrude');
                  useEditorStore.getState().select(selectedFace.id, 'face');
                }}
                className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ background: 'var(--xo-primary)', color: 'white' }}
              >
                <span>⬆️</span>
                EXTRUIR (PUSH / PULL)
              </button>
            </section>
          )}

          {selectedVolume && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3" style={{ color: 'var(--xo-text-dim)' }}>
                GEOMETRÍA VOLUMÉTRICA <div className="h-px flex-1" style={{ background: 'var(--xo-border)' }}></div>
              </h3>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Altura de Extrusión (m)</label>
                <input 
                  type="number" step="0.1" min="0.1" value={selectedVolume.height} 
                  onChange={(e) => updateVolume(selectedVolume.id, { height: parseFloat(e.target.value) })}
                  className="w-full rounded-lg px-2.5 py-2 text-xs font-mono font-bold outline-none"
                  style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Posición de Origen (X, Y, Z)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-center" style={{ color: 'var(--xo-text-ghost)' }}>X</span>
                    <input type="number" step="0.1" value={selectedVolume.position[0]} onChange={(e) => updateVolume(selectedVolume.id, { position: [parseFloat(e.target.value), selectedVolume.position[1], selectedVolume.position[2]] })} className="w-full rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-center" style={{ color: 'var(--xo-text-ghost)' }}>Y</span>
                    <input type="number" step="0.1" value={selectedVolume.position[1]} onChange={(e) => updateVolume(selectedVolume.id, { position: [selectedVolume.position[0], parseFloat(e.target.value), selectedVolume.position[2]] })} className="w-full rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-center" style={{ color: 'var(--xo-text-ghost)' }}>Z</span>
                    <input type="number" step="0.1" value={selectedVolume.position[2]} onChange={(e) => updateVolume(selectedVolume.id, { position: [selectedVolume.position[0], selectedVolume.position[1], parseFloat(e.target.value)] })} className="w-full rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {selectedDim && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3" style={{ color: 'var(--xo-text-dim)' }}>
                ACOTACIÓN <div className="h-px flex-1" style={{ background: 'var(--xo-border)' }}></div>
              </h3>
              
              {/* Valor de la medida (solo lectura) */}
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--xo-primary-muted)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--xo-primary)' }}>Medida</span>
                <span className="text-lg font-black font-mono" style={{ color: '#93c5fd' }}>
                  {formatDimensionValue(
                    selectedDim.value || calculateAlignedDistance(selectedDim.start, selectedDim.end, selectedDim.alignment || 'aligned'),
                    selectedDim.unit || 'm'
                  )}
                </span>
              </div>

              {/* Selector de Unidad */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Unidad de Visualización</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['mm', 'cm', 'm'] as DimensionUnit[]).map(u => (
                    <button
                      key={u}
                      onClick={() => updateDimension(selectedDim.id, { unit: u })}
                      className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all`}
                      style={{
                        background: (selectedDim.unit || 'm') === u ? 'var(--xo-primary)' : 'var(--xo-surface-hover)',
                        color: (selectedDim.unit || 'm') === u ? 'white' : 'var(--xo-text-dim)',
                        border: `1px solid ${(selectedDim.unit || 'm') === u ? 'var(--xo-primary)' : 'var(--xo-border)'}`,
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alineación */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Alineación</label>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    { value: 'horizontal' as DimensionAlignment, label: 'Horizontal' },
                    { value: 'vertical' as DimensionAlignment, label: 'Vertical' },
                    { value: 'aligned' as DimensionAlignment, label: 'Al Segmento' },
                    { value: 'free' as DimensionAlignment, label: 'Libre' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        const newAlignment = opt.value;
                        const newValue = calculateAlignedDistance(selectedDim.start, selectedDim.end, newAlignment);
                        updateDimension(selectedDim.id, { alignment: newAlignment, value: newValue });
                      }}
                      className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all`}
                      style={{
                        background: (selectedDim.alignment || 'aligned') === opt.value ? 'var(--xo-surface-hover)' : 'transparent',
                        color: (selectedDim.alignment || 'aligned') === opt.value ? 'var(--xo-text)' : 'var(--xo-text-ghost)',
                        border: `1px solid ${(selectedDim.alignment || 'aligned') === opt.value ? 'var(--xo-border-hover)' : 'var(--xo-border)'}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Offset */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Offset (m)</label>
                  <span className="text-[9px] font-mono font-black" style={{ color: 'var(--xo-primary)' }}>
                    {(selectedDim.offset || 0.3).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={selectedDim.offset || 0.3}
                  onChange={(e) => updateDimension(selectedDim.id, { offset: parseFloat(e.target.value) })}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  style={{ background: 'var(--xo-border)' }}
                />
              </div>

              {/* Coordenadas */}
              <div className="space-y-2 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--xo-border)' }}>
                <div className="flex justify-between text-[8px] font-mono" style={{ color: 'var(--xo-text-ghost)' }}>
                  <span>Inicio: ({selectedDim.start.map(v => v.toFixed(2)).join(', ')})</span>
                </div>
                <div className="flex justify-between text-[8px] font-mono" style={{ color: 'var(--xo-text-ghost)' }}>
                  <span>Fin: ({selectedDim.end.map(v => v.toFixed(2)).join(', ')})</span>
                </div>
              </div>
            </section>
          )}

          {selectedItem && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3" style={{ color: 'var(--xo-text-dim)' }}>
                TRANSFORMACIÓN <div className="h-px flex-1" style={{ background: 'var(--xo-border)' }}></div>
              </h3>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold uppercase" style={{ color: 'var(--xo-text-dim)' }}>Posición Absoluta (X, Y, Z)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-center" style={{ color: 'var(--xo-text-ghost)' }}>X</span>
                    <input type="number" step="0.1" value={selectedItem.position[0]} onChange={(e) => updateItem(selectedItem.id, { position: [parseFloat(e.target.value), selectedItem.position[1], selectedItem.position[2]] })} className="rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold outline-none" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-center" style={{ color: 'var(--xo-text-ghost)' }}>Y</span>
                    <input type="number" step="0.1" value={selectedItem.position[1]} onChange={(e) => updateItem(selectedItem.id, { position: [selectedItem.position[0], parseFloat(e.target.value), selectedItem.position[2]] })} className="rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold outline-none" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-center" style={{ color: 'var(--xo-text-ghost)' }}>Z</span>
                    <input type="number" step="0.1" value={selectedItem.position[2]} onChange={(e) => updateItem(selectedItem.id, { position: [selectedItem.position[0], selectedItem.position[1], parseFloat(e.target.value)] })} className="rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold outline-none" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Acciones Rápidas del panel */}
          <section className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--xo-border)' }}>
            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3" style={{ color: 'var(--xo-text-dim)' }}>
              ACCIÓN RÁPIDA <div className="h-px flex-1" style={{ background: 'var(--xo-border)' }}></div>
            </h3>
            <div className="flex gap-2">
               <button 
                 onClick={() => { duplicateItem(selectedId || undefined); }}
                 className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                 style={{ background: 'var(--xo-surface-hover)', color: 'var(--xo-text-secondary)', border: '1px solid var(--xo-border)' }}
               >
                 Duplicar
               </button>
               <button 
                 onClick={() => { removeItem(selectedId || undefined); }}
                 className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                 style={{ background: 'var(--xo-danger-muted)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}
               >
                 Eliminar
               </button>
            </div>
          </section>

        </div>
      </div>
    );
  };

  const renderScene = () => {
    return (
      <div className="p-5 space-y-6 animate-in fade-in slide-in-from-right-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--xo-text-dim)' }}>Escenas Guardadas</h3>
          <button 
            onClick={() => addScene({
              id: Math.random().toString(36).substr(2, 9),
              name: `Escena ${scenes.length + 1}`,
              cameraPosition: [12, 12, 12],
              cameraTarget: [0, 0, 0],
              viewMode: '3D'
            })}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-sm"
            style={{ background: 'var(--xo-primary-muted)', color: 'var(--xo-primary)' }}
            title="Capturar Escena Actual"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div className="space-y-2">
          {scenes.length === 0 ? (
            <div className="text-[10px] italic text-center py-8 rounded-2xl" style={{ color: 'var(--xo-text-ghost)', border: '2px dashed var(--xo-border)', background: 'rgba(255,255,255,0.02)' }}>No hay escenas guardadas.</div>
          ) : (
            scenes.map(scene => (
              <div key={scene.id} className="group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)' }} onClick={() => applyScene(scene.id)}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--xo-text-secondary)' }}>{scene.name}</span>
                  <span className="text-[8px] font-mono" style={{ color: 'var(--xo-text-ghost)' }}>MODO {scene.viewMode}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                  style={{ color: '#fca5a5' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderLayers = () => {
    return (
      <div className="p-5 space-y-6 animate-in fade-in slide-in-from-right-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--xo-text-dim)' }}>Capas del Proyecto</h3>
          <button 
            onClick={() => addLayer({
              id: `layer-${Math.random().toString(36).substr(2, 5)}`,
              name: 'Nueva Capa',
              visible: true,
              locked: false
            })}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-sm"
            style={{ background: 'var(--xo-primary-muted)', color: 'var(--xo-primary)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div className="space-y-1">
          {layers.map(layer => (
            <div 
              key={layer.id} 
              className={`flex items-center gap-2 p-2.5 rounded-xl transition-all cursor-pointer shadow-sm`}
              style={{
                background: activeLayerId === layer.id ? 'var(--xo-primary)' : 'var(--xo-surface-hover)',
                border: `1px solid ${activeLayerId === layer.id ? 'var(--xo-primary)' : 'var(--xo-border)'}`,
              }}
              onClick={() => setActiveLayer(layer.id)}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); toggleLayer(layer.id); }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all`}
                style={{ color: layer.visible ? (activeLayerId === layer.id ? 'rgba(255,255,255,0.9)' : 'var(--xo-primary)') : 'var(--xo-text-ghost)' }}
              >
                {layer.visible ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M9.88 9.88 2 12s3-7 10-7a9.025 9.025 0 0 1 5.12 1.58M22 12s-3 7-10 7a9.025 9.025 0 0 1-5.12-1.58M15 15l1.24 1.24M1 1l22 22"/></svg>
                )}
              </button>
              <input 
                className={`flex-1 text-[10px] font-black uppercase tracking-wider bg-transparent outline-none border-none pointer-events-none`}
                style={{ color: activeLayerId === layer.id ? 'white' : (layer.visible ? 'var(--xo-text-secondary)' : 'var(--xo-text-ghost)') }}
                value={layer.name}
                readOnly
              />
              <button 
                onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all`}
                style={{ color: layer.locked ? '#fbbf24' : 'var(--xo-text-ghost)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d={layer.locked ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"}/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderComponents = () => {
          const componentList = items.reduce((acc: any[], item) => {
      const existing = acc.find(c => c.productId === item.productId);
      if (existing) {
        existing.count += 1;
        existing.items.push(item);
      } else {
        acc.push({
          productId: item.productId,
          name: item.label || 'Activo sin Nombre',
          price: item.price || 0,
          count: 1,
          items: [item]
        });
      }
      return acc;
    }, []);

    const totalProjectValue = componentList.reduce((sum, c) => sum + (c.price * c.count), 0);

    return (
      <div className="p-5 space-y-6 animate-in fade-in slide-in-from-right-3">
        <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl shadow-inner border border-zinc-800">
           <div className="flex flex-col">
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Total con IVA</span>
              <span className="text-xl font-black text-white font-mono leading-none">${(totalProjectValue * 1.16).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
              <span className="text-[7px] font-mono text-zinc-500 mt-1">Subtotal ${totalProjectValue.toLocaleString()} + IVA ${(totalProjectValue * 0.16).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
           </div>
           <div className="text-right">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Componentes</span>
              <span className="text-lg font-black text-zinc-300 font-mono leading-none">{items.length}</span>
           </div>
        </div>

        <div className="space-y-3">
          {componentList.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center rounded-2xl opacity-40" style={{ border: '2px dashed var(--xo-border)', background: 'rgba(255,255,255,0.02)' }}>
               <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--xo-text-ghost)' }}>Sin Activos en Escena</span>
            </div>
          ) : (
            componentList.map(comp => (
              <div key={comp.productId} className="rounded-xl overflow-hidden transition-all" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)' }}>
                <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--xo-border)' }}>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: 'var(--xo-text-secondary)' }}>{comp.name}</span>
                    <span className="text-[8px] font-mono uppercase" style={{ color: 'var(--xo-text-ghost)' }}>{comp.productId}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono" style={{ background: 'var(--xo-primary)', color: 'white' }}>x{comp.count}</span>
                </div>
                <div className="p-2 flex gap-1">
                  <button 
                    onClick={() => {
                      const first = comp.items[0];
                      useEditorStore.getState().select(first.id, 'item');
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all"
                    style={{ background: 'var(--xo-surface)', color: 'var(--xo-text-muted)', border: '1px solid var(--xo-border)' }}
                  >
                    Localizar
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm(`¿Eliminar las ${comp.count} instancias de ${comp.name}?`)) {
                        comp.items.forEach((it: any) => removeItem(it.id));
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all"
                    style={{ background: 'var(--xo-danger-muted)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    Eliminar todos
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderBlueprint = () => {
    if (!blueprint) {
      return (
        <div className="p-8 h-full flex flex-col items-center justify-center opacity-40 grayscale space-y-4">
           <div className="text-5xl">📄</div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center max-w-[140px] leading-relaxed" style={{ color: 'var(--xo-text-ghost)' }}>
             SISTEMA DE PLANOS NO INICIALIZADO
           </p>
        </div>
      );
    }

    const pos = blueprint.position || [0, -0.01, 0];
    const scaleFactor = typeof blueprint.scale === 'number' && !isNaN(blueprint.scale) ? blueprint.scale : 1;
    const rotationRad = typeof blueprint.rotation === 'number' && !isNaN(blueprint.rotation) ? blueprint.rotation : 0;
    const opacityVal = typeof blueprint.opacity === 'number' && !isNaN(blueprint.opacity) ? blueprint.opacity : 0.5;

    return (
      <div className="p-5 space-y-6 animate-in fade-in slide-in-from-right-3">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3" style={{ color: 'var(--xo-text-dim)' }}>
            Calco de Planimetría <div className="h-px flex-1" style={{ background: 'var(--xo-border)' }}></div>
          </h3>
          
          <div className="flex flex-col gap-3">
            {!blueprint.url ? (
              <div className="group relative h-40 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden p-4 text-center" style={{ border: '2px dashed var(--xo-border-hover)', background: 'rgba(255,255,255,0.02)' }}>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp, application/pdf, .dwg, .dxf" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      // 1. Manejo Especial para formatos de AutoCAD
                      const ext = file.name.toLowerCase().split('.').pop();
                      if (ext === 'dwg' || ext === 'dxf') {
                         useEditorStore.getState().updateBlueprint({ visible: false });
                         
                         const formData = new FormData();
                         formData.append('file', file);
                         
                         const res = await fetch('/api/blueprints/convert', { method: 'POST', body: formData });
                         if (!res.ok) {
                            const errorData = await res.json();
                            throw new Error(errorData.message || 'Error transformando plano CAD');
                         }
                         
                         const data = await res.json();
                         if (!data.svg) throw new Error('Respuesta inválida del servidor');
                         
                         const svgBlob = new Blob([data.svg], { type: 'image/svg+xml;charset=utf-8' });
                         const url = URL.createObjectURL(svgBlob);
                         
                         updateBlueprint({ url, visible: true });
                         return;
                      }

                      // 2. Manejo PDF original
                      if (file.type === 'application/pdf') {
                        const dataUrl = await extractFirstPageAsImage(file);
                        updateBlueprint({ url: dataUrl, visible: true });
                      } 
                      // 3. Manejo Imágenes original
                      else if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (rev) => {
                          updateBlueprint({ url: rev.target?.result as string, visible: true });
                        };
                        reader.readAsDataURL(file);
                      }
                    } catch (err: any) {
                      console.error('Error importando:', err);
                      alert(err.message || 'Error al leer el archivo. Intenta con una imagen válida o un PDF distinto.');
                    } finally {
                      e.target.value = ''; // Resetear input
                    }
                  }}
                />
                <span className="text-2xl mb-2 group-hover:scale-125 transition-transform">📐</span>
                <span className="text-[9px] font-black uppercase tracking-widest transition-colors" style={{ color: 'var(--xo-text-ghost)' }}>Importar Plano</span>
                <span className="text-[8px] mt-1 uppercase font-mono" style={{ color: 'var(--xo-text-ghost)' }}>(DWG, DXF, PDF, JPG, PNG)</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative group rounded-xl overflow-hidden shadow-lg" style={{ border: '1px solid var(--xo-border)' }}>
                   <img src={blueprint.url} alt="Blueprint" className="w-full h-32 object-cover" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                      <button onClick={() => updateBlueprint({ url: null })} className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                   </div>
                </div>

                <div className="space-y-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--xo-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase" style={{ color: 'var(--xo-text-dim)' }}>Visibilidad</span>
                    <button 
                      onClick={() => updateBlueprint({ visible: !blueprint.visible })}
                      className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all`}
                      style={{
                        background: blueprint.visible !== false ? 'var(--xo-primary)' : 'var(--xo-surface-hover)',
                        color: blueprint.visible !== false ? 'white' : 'var(--xo-text-ghost)',
                      }}
                    >
                      {blueprint.visible !== false ? 'Visible' : 'Oculto'}
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[9px] font-black uppercase" style={{ color: 'var(--xo-text-dim)' }}>Opacidad</label>
                      <span className="text-[9px] font-mono font-black" style={{ color: 'var(--xo-primary)' }}>{Math.round(opacityVal * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" value={opacityVal} onChange={(e) => updateBlueprint({ opacity: parseFloat(e.target.value) })} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600" style={{ background: 'var(--xo-border)' }} />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <label className="text-[9px] font-black uppercase" style={{ color: 'var(--xo-text-dim)' }}>Escala</label>
                      <span className="text-[9px] font-mono font-black" style={{ color: 'var(--xo-primary)' }}>×{scaleFactor.toFixed(2)}</span>
                    </div>
                    {blueprint.calibrated ? (
                        <div className="p-2.5 rounded-lg space-y-2" style={{ background: 'var(--xo-primary-muted)', border: '1px solid rgba(59,130,246,0.2)' }}>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-black tracking-widest flex-1" style={{ color: 'var(--xo-primary)' }}>PLANO CALIBRADO</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shadow-sm" style={{ color: 'var(--xo-primary)', background: 'var(--xo-surface-hover)' }}>
                                {blueprint.calibrationMeasuredDist?.toFixed(2)}m ➤ {blueprint.calibrationRealDist?.toFixed(2)}m
                              </span>
                           </div>
                           <button 
                             onClick={() => updateBlueprint({ scale: 1, calibrated: false, calibrationMeasuredDist: undefined, calibrationRealDist: undefined, calibrationPointA: undefined, calibrationPointB: undefined })} 
                             className="w-full py-1.5 rounded text-[9px] font-black transition-all uppercase tracking-widest"
                             style={{ background: 'var(--xo-surface-hover)', color: 'var(--xo-text-muted)', border: '1px solid var(--xo-border)' }}
                           >
                             Deshacer Calibración
                           </button>
                        </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => updateBlueprint({ scale: scaleFactor * 0.9 })} className="flex-1 py-1.5 rounded-lg text-[9px] font-black active:scale-95 transition-all" style={{ background: 'var(--xo-surface-hover)', color: 'var(--xo-text-secondary)', border: '1px solid var(--xo-border)' }}>-</button>
                        <button onClick={() => updateBlueprint({ scale: scaleFactor * 1.1 })} className="flex-1 py-1.5 rounded-lg text-[9px] font-black active:scale-95 transition-all" style={{ background: 'var(--xo-surface-hover)', color: 'var(--xo-text-secondary)', border: '1px solid var(--xo-border)' }}>+</button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[9px] font-black uppercase" style={{ color: 'var(--xo-text-dim)' }}>Rotación</label>
                      <span className="text-[9px] font-mono font-black" style={{ color: 'var(--xo-primary)' }}>{Math.round((rotationRad * 180) / Math.PI)}°</span>
                    </div>
                    <input type="range" min={-Math.PI} max={Math.PI} step={0.01} value={rotationRad} onChange={(e) => updateBlueprint({ rotation: parseFloat(e.target.value) })} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600" style={{ background: 'var(--xo-border)' }} />
                  </div>
                </div>

                <div className="flex gap-2">
                   <div className="flex-1 space-y-1">
                      <label className="text-[7px] font-mono uppercase" style={{ color: 'var(--xo-text-ghost)' }}>POS X</label>
                      <input type="number" step="0.1" value={pos[0]} onChange={(e) => updateBlueprint({ position: [parseFloat(e.target.value) || 0, pos[1], pos[2]] })} className="w-full rounded px-1.5 py-1 text-[10px] font-mono" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} />
                   </div>
                   <div className="flex-1 space-y-1">
                      <label className="text-[7px] font-mono uppercase" style={{ color: 'var(--xo-text-ghost)' }}>POS Z</label>
                      <input type="number" step="0.1" value={pos[2]} onChange={(e) => updateBlueprint({ position: [pos[0], pos[1], parseFloat(e.target.value) || 0] })} className="w-full rounded px-1.5 py-1 text-[10px] font-mono" style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)', color: 'var(--xo-text-secondary)' }} />
                   </div>
                </div>

                <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--xo-border)' }}>
                  <button 
                    onClick={() => {
                      setActiveTool('scale-blueprint');
                      useEditorStore.getState().setCalibrationState({ step: 'awaiting-first-point', pointA: undefined, pointB: undefined, measuredDistance: undefined });
                    }}
                    className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-lg flex items-center justify-center gap-2 group"
                    style={{ background: 'var(--xo-primary)', color: 'white' }}
                  >
                    <span className="group-hover:scale-125 transition-transform">📏</span>
                    {blueprint.calibrated ? 'Recalibrar Plano' : 'Calibrar Escala del Plano'}
                  </button>
                  <p className="text-[8px] text-center mt-2 leading-relaxed px-2" style={{ color: 'var(--xo-text-ghost)' }}>
                    Haz clic en dos puntos del plano e ingresa la distancia real en el HUD central.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside 
      className="absolute top-3 right-3 flex flex-col overflow-hidden w-72 bottom-3 transition-all duration-300 ease-in-out"
      style={{
        background: 'var(--xo-surface-elevated)',
        backdropFilter: 'var(--xo-blur)',
        WebkitBackdropFilter: 'var(--xo-blur)',
        borderRadius: 'var(--xo-radius-lg)',
        border: '1px solid var(--xo-border)',
        boxShadow: 'var(--xo-shadow-xl)',
        zIndex: 'var(--xo-z-panels)' as any,
        animation: 'catalogOverlayIn 0.2s ease-out',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--xo-border)' }}
      >
        <span
          className="uppercase"
          style={{ fontSize: 'var(--xo-text-sm)', fontWeight: 800, letterSpacing: 'var(--xo-tracking-ultra)', color: 'var(--xo-text-secondary)' }}
        >
          Inspector Avanzado
        </span>
        <button
          onClick={() => toggleAdvancedMode()}
          className="w-6 h-6 flex items-center justify-center transition-colors"
          style={{ borderRadius: 'var(--xo-radius-sm)', color: 'var(--xo-text-dim)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--xo-surface-hover)'; e.currentTarget.style.color = 'var(--xo-text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--xo-text-dim)'; }}
          title="Cerrar Inspector Avanzado"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex p-1 shrink-0 overflow-x-auto custom-scrollbar" style={{ borderBottom: '1px solid var(--xo-border)', background: 'rgba(0,0,0,0.15)' }}>
        {[
          { key: 'properties' as const, label: 'Props' },
          { key: 'scene' as const, label: 'Visuales' },
          { key: 'layers' as const, label: 'Capas' },
          { key: 'quote' as const, label: 'Cotización' },
          { key: 'blueprint' as const, label: 'Plano' },
        ].map(tab => (
          <button
            key={tab.key}
            data-inspector-tab={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-1.5 px-2 whitespace-nowrap transition-all uppercase"
            style={{
              fontSize: 'var(--xo-text-xs)',
              fontWeight: 800,
              letterSpacing: 'var(--xo-tracking-ultra)',
              borderRadius: 'var(--xo-radius-sm)',
              background: activeTab === tab.key ? 'var(--xo-surface-hover)' : 'transparent',
              color: activeTab === tab.key
                ? (tab.key === 'quote' ? 'var(--xo-success)' : 'var(--xo-text)')
                : 'var(--xo-text-dim)',
              border: activeTab === tab.key ? '1px solid var(--xo-border-hover)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ background: 'var(--xo-surface)' }}>
        {activeTab === 'properties' && renderProperties()}
        {activeTab === 'scene' && renderScene()}
        {activeTab === 'layers' && renderLayers()}
        {activeTab === 'components' && renderComponents()}
        {activeTab === 'quote' && <QuoteInspectorSection />}
        {activeTab === 'blueprint' && renderBlueprint()}
      </div>
    </aside>
  );
};
