/**
 * Creado y diseñado por XO
 */

import React, { useState } from 'react';
import { useEditorStore, Scene, Layer } from '@/store/editor-store';
import { calculateDistance } from '@/utils/cad-math';
import { extractFirstPageAsImage } from '@/utils/pdf-extractor';

export const RightInspector: React.FC = () => {
  const { 
    selectedIds, selectedType, items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes,
    activeLayerId, project, blueprint, activeTool,
    updateItem, updateWall, updateOpening, updateLine, updateRectangle, updateFace, updateVolume,
    removeItem, toggleLayer, updateLayer, addLayer, setActiveLayer, duplicateItem,
    addScene, updateScene, removeScene, applyScene, setProjectName, updateBlueprint, setActiveTool
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<'properties' | 'scene' | 'layers' | 'components' | 'blueprint'>('properties');
  const [isCollapsed, setIsCollapsed] = useState(false);

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
           <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] text-center max-w-[140px] leading-relaxed">
             SELECCIONE UN OBJETO PARA INSPECCIONAR GEOMETRÍA
           </p>
        </div>
      );
    }

    if (isMulti) {
      return (
        <div className="animate-in fade-in slide-in-from-right-3 duration-500">
          <div className="p-4 bg-blue-50 border-b border-blue-200/50 flex flex-col gap-1">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
              Selección Múltiple
            </span>
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tighter truncate">
              {selectedIds.length} Objetos Seleccionados
            </h2>
          </div>
          <div className="p-4 space-y-6">
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Has seleccionado múltiples entidades. Puedes moverlas juntas usando el gizmo central o realizar acciones globales.
            </p>
            <section className="space-y-4 pt-4 border-t border-zinc-200/50">
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                ACCIONES DE GRUPO <div className="h-px flex-1 bg-zinc-200"></div>
              </h3>
              <div className="flex gap-2">
                 <button 
                   onClick={() => { duplicateItem(); }}
                   className="flex-1 py-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                 >
                   Duplicar Todo
                 </button>
                 <button 
                   onClick={() => { removeItem(); }}
                   className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm"
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
        <div className="p-4 bg-zinc-50 border-b border-zinc-200/50 flex flex-col gap-1">
          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
            {selectedType || 'Entidad'}
          </span>
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tighter truncate">
            {selectedType === 'wall' ? 'Muro Estructural' : 
             selectedType === 'item' ? selectedItem?.label || 'Instancia de Activo' : 
             selectedType === 'opening' ? 'Vano / Apertura' : 
             selectedType === 'rectangle' ? 'Área Arquitectónica' : 
             selectedType === 'line' ? 'Línea de Trazo' : 
             selectedType === 'face' ? 'Superficie Generada' :
             selectedType === 'volume' ? 'Objeto Volumétrico' : 'Medición'}
          </h2>
          <span className="text-[8px] font-mono text-zinc-500 uppercase">UUID: {selectedId}</span>
        </div>

        <div className="p-4 space-y-6">
          {selectedWall && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                GEOMETRÍA DEL MURO <div className="h-px flex-1 bg-zinc-200"></div>
              </h3>
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-wider">Largo Total</span>
                <span className="text-sm font-black font-mono text-blue-600">
                  {calculateDistance(selectedWall.start, selectedWall.end).toFixed(3)}m
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-zinc-600 uppercase">Espesor (m)</label>
                  <input 
                    type="number" step="0.05" min="0.05" value={selectedWall.thickness} 
                    onChange={(e) => updateWall(selectedWall.id, { thickness: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-zinc-600 uppercase">Altura (m)</label>
                  <input 
                    type="number" step="0.1" min="0.5" value={selectedWall.height} 
                    onChange={(e) => updateWall(selectedWall.id, { height: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                  />
                </div>
              </div>
            </section>
          )}

          {selectedOpening && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                PARÁMETROS DEL VANO <div className="h-px flex-1 bg-zinc-200"></div>
              </h3>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-zinc-600 uppercase">Ancho (m)</label>
                <input type="number" step="0.1" value={selectedOpening.width} onChange={(e) => updateOpening(selectedOpening.id, { width: parseFloat(e.target.value) })} className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-zinc-600 uppercase">Posición Relativa (%)</label>
                <input type="range" min="0" max="1" step="0.01" value={selectedOpening.offset} onChange={(e) => updateOpening(selectedOpening.id, { offset: parseFloat(e.target.value) })} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </section>
          )}

          {selectedFace && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                PROPIEDADES DE SUPERFICIE <div className="h-px flex-1 bg-zinc-200"></div>
              </h3>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex justify-between items-center shadow-sm">
                <span className="text-[9px] font-black text-zinc-600 uppercase">Vértices del Polígono</span>
                <span className="text-sm font-black font-mono text-blue-600 bg-white px-2 py-0.5 rounded border border-zinc-100">{selectedFace.points.length}</span>
              </div>
              <button 
                onClick={() => {
                  useEditorStore.getState().setActiveTool('extrude');
                  useEditorStore.getState().select(selectedFace.id, 'face');
                }}
                className="w-full py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-blue-500/10 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>⬆️</span>
                EXTRUIR (PUSH / PULL)
              </button>
            </section>
          )}

          {selectedVolume && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                GEOMETRÍA VOLUMÉTRICA <div className="h-px flex-1 bg-zinc-200"></div>
              </h3>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-zinc-600 uppercase">Altura de Extrusión (m)</label>
                <input 
                  type="number" step="0.1" min="0.1" value={selectedVolume.height} 
                  onChange={(e) => updateVolume(selectedVolume.id, { height: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold text-zinc-600 uppercase">Posición de Origen (X, Y, Z)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-zinc-400 text-center">X</span>
                    <input type="number" step="0.1" value={selectedVolume.position[0]} onChange={(e) => updateVolume(selectedVolume.id, { position: [parseFloat(e.target.value), selectedVolume.position[1], selectedVolume.position[2]] })} className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-zinc-400 text-center">Y</span>
                    <input type="number" step="0.1" value={selectedVolume.position[1]} onChange={(e) => updateVolume(selectedVolume.id, { position: [selectedVolume.position[0], parseFloat(e.target.value), selectedVolume.position[2]] })} className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-zinc-400 text-center">Z</span>
                    <input type="number" step="0.1" value={selectedVolume.position[2]} onChange={(e) => updateVolume(selectedVolume.id, { position: [selectedVolume.position[0], selectedVolume.position[1], parseFloat(e.target.value)] })} className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {selectedItem && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                TRANSFORMACIÓN <div className="h-px flex-1 bg-zinc-200"></div>
              </h3>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold text-zinc-600 uppercase">Posición Absoluta (X, Y, Z)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-zinc-400 text-center">X</span>
                    <input type="number" step="0.1" value={selectedItem.position[0]} onChange={(e) => updateItem(selectedItem.id, { position: [parseFloat(e.target.value), selectedItem.position[1], selectedItem.position[2]] })} className="bg-zinc-50 border border-zinc-300 rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-zinc-400 text-center">Y</span>
                    <input type="number" step="0.1" value={selectedItem.position[1]} onChange={(e) => updateItem(selectedItem.id, { position: [selectedItem.position[0], parseFloat(e.target.value), selectedItem.position[2]] })} className="bg-zinc-50 border border-zinc-300 rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-mono text-zinc-400 text-center">Z</span>
                    <input type="number" step="0.1" value={selectedItem.position[2]} onChange={(e) => updateItem(selectedItem.id, { position: [selectedItem.position[0], selectedItem.position[1], parseFloat(e.target.value)] })} className="bg-zinc-50 border border-zinc-300 rounded-lg px-1.5 py-2 text-[10px] font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Acciones Rápidas del panel */}
          <section className="space-y-4 pt-4 border-t border-zinc-200/50">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
              ACCIÓN RÁPIDA <div className="h-px flex-1 bg-zinc-200"></div>
            </h3>
            <div className="flex gap-2">
               <button 
                 onClick={() => { duplicateItem(selectedId || undefined); }}
                 className="flex-1 py-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
               >
                 Duplicar
               </button>
               <button 
                 onClick={() => { removeItem(selectedId || undefined); }}
                 className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm"
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
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Escenas Guardadas</h3>
          <button 
            onClick={() => addScene({
              id: Math.random().toString(36).substr(2, 9),
              name: `Escena ${scenes.length + 1}`,
              cameraPosition: [12, 12, 12],
              cameraTarget: [0, 0, 0],
              viewMode: '3D'
            })}
            className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            title="Capturar Escena Actual"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div className="space-y-2">
          {scenes.length === 0 ? (
            <div className="text-[10px] text-zinc-400 italic text-center py-8 border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/30">No hay escenas guardadas.</div>
          ) : (
            scenes.map(scene => (
              <div key={scene.id} className="group flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-pointer" onClick={() => applyScene(scene.id)}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-zinc-900 uppercase tracking-wider">{scene.name}</span>
                  <span className="text-[8px] font-mono text-zinc-500">MODO {scene.viewMode}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-all border border-transparent hover:border-red-100"
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
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Capas del Proyecto</h3>
          <button 
            onClick={() => addLayer({
              id: `layer-${Math.random().toString(36).substr(2, 5)}`,
              name: 'Nueva Capa',
              visible: true,
              locked: false
            })}
            className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div className="space-y-1">
          {layers.map(layer => (
            <div 
              key={layer.id} 
              className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm
                ${activeLayerId === layer.id ? 'bg-zinc-900 border-zinc-900 shadow-zinc-900/10' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}
              onClick={() => setActiveLayer(layer.id)}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); toggleLayer(layer.id); }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${layer.visible ? (activeLayerId === layer.id ? 'text-blue-400 bg-white/10' : 'bg-blue-50 text-blue-600') : 'text-zinc-300 hover:text-zinc-500'}`}
              >
                {layer.visible ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M9.88 9.88 2 12s3-7 10-7a9.025 9.025 0 0 1 5.12 1.58M22 12s-3 7-10 7a9.025 9.025 0 0 1-5.12-1.58M15 15l1.24 1.24M1 1l22 22"/></svg>
                )}
              </button>
              <input 
                className={`flex-1 text-[10px] font-black uppercase tracking-wider bg-transparent outline-none border-none pointer-events-none ${activeLayerId === layer.id ? 'text-white' : (layer.visible ? 'text-zinc-900' : 'text-zinc-300')}`}
                value={layer.name}
                readOnly
              />
              <button 
                onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${layer.locked ? (activeLayerId === layer.id ? 'text-amber-400 bg-white/10' : 'bg-amber-50 text-amber-600') : 'text-zinc-300 hover:text-zinc-500'}`}
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
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Cotización Estimada</span>
              <span className="text-xl font-black text-white font-mono leading-none">${totalProjectValue.toLocaleString()}</span>
           </div>
           <div className="text-right">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Componentes</span>
              <span className="text-lg font-black text-zinc-300 font-mono leading-none">{items.length}</span>
           </div>
        </div>

        <div className="space-y-3">
          {componentList.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-2xl opacity-40 bg-zinc-50/50">
               <span className="text-[10px] font-black uppercase tracking-widest">Sin Activos en Escena</span>
            </div>
          ) : (
            componentList.map(comp => (
              <div key={comp.productId} className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all">
                <div className="p-3 flex items-center justify-between border-b border-zinc-200/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-tight">{comp.name}</span>
                    <span className="text-[8px] font-mono text-zinc-400 uppercase">{comp.productId}</span>
                  </div>
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black font-mono">x{comp.count}</span>
                </div>
                <div className="p-2 flex gap-1">
                  <button 
                    onClick={() => {
                      const first = comp.items[0];
                      useEditorStore.getState().select(first.id, 'item');
                    }}
                    className="flex-1 py-1.5 bg-white border border-zinc-200 rounded-lg text-[8px] font-black uppercase hover:bg-zinc-100 transition-all"
                  >
                    Localizar
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm(`¿Eliminar las ${comp.count} instancias de ${comp.name}?`)) {
                        comp.items.forEach((it: any) => removeItem(it.id));
                      }
                    }}
                    className="px-3 py-1.5 bg-red-50 text-red-500 border border-red-100 rounded-lg text-[8px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
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
           <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] text-center max-w-[140px] leading-relaxed">
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
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
            Calco de Planimetría <div className="h-px flex-1 bg-zinc-200"></div>
          </h3>
          
          <div className="flex flex-col gap-3">
            {!blueprint.url ? (
              <div className="group relative h-40 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer overflow-hidden p-4 text-center">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp, application/pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.type === 'application/pdf') {
                        const dataUrl = await extractFirstPageAsImage(file);
                        updateBlueprint({ url: dataUrl, visible: true });
                      } else if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (rev) => {
                          updateBlueprint({ url: rev.target?.result as string, visible: true });
                        };
                        reader.readAsDataURL(file);
                      }
                    } catch (err) {
                      console.error('Error importando:', err);
                      // Fallback visual en caso de error
                      alert('Error al leer el archivo. Intenta con una imagen válida o un PDF distinto.');
                    }
                  }}
                />
                <span className="text-2xl mb-2 group-hover:scale-125 transition-transform">📄</span>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Importar Plano</span>
                <span className="text-[8px] text-zinc-400 mt-1 uppercase font-mono">(PDF, JPG, PNG, WEBP)</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative group rounded-xl overflow-hidden border border-zinc-200 shadow-lg">
                   <img src={blueprint.url} alt="Blueprint" className="w-full h-32 object-cover" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                      <button onClick={() => updateBlueprint({ url: null })} className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                   </div>
                </div>

                <div className="space-y-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-zinc-600 uppercase">Visibility</span>
                    <button 
                      onClick={() => updateBlueprint({ visible: !blueprint.visible })}
                      className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${blueprint.visible !== false ? 'bg-blue-600 text-white shadow-md' : 'bg-zinc-200 text-zinc-500'}`}
                    >
                      {blueprint.visible !== false ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[9px] font-black text-zinc-600 uppercase">Opacity</label>
                      <span className="text-[9px] font-mono text-blue-600 font-black">{Math.round(opacityVal * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" value={opacityVal} onChange={(e) => updateBlueprint({ opacity: parseFloat(e.target.value) })} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <label className="text-[9px] font-black text-zinc-600 uppercase">Scale Factor</label>
                      <span className="text-[9px] font-mono text-blue-600 font-black">×{scaleFactor.toFixed(2)}</span>
                    </div>
                    {blueprint.calibrated ? (
                        <div className="bg-blue-50/50 border border-blue-200 p-2.5 rounded-lg space-y-2">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-black tracking-widest text-blue-600 flex-1">PLANO CALIBRADO</span>
                              <span className="text-[9px] font-mono text-blue-600 bg-white px-1.5 py-0.5 rounded shadow-sm">
                                {blueprint.calibrationMeasuredDist?.toFixed(2)}m ➔ {blueprint.calibrationRealDist?.toFixed(2)}m
                              </span>
                           </div>
                           <button 
                             onClick={() => updateBlueprint({ scale: 1, calibrated: false, calibrationMeasuredDist: undefined, calibrationRealDist: undefined, calibrationPointA: undefined, calibrationPointB: undefined })} 
                             className="w-full py-1.5 bg-white border border-blue-200 rounded text-[9px] font-black text-blue-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all uppercase tracking-widest"
                           >
                             Deshacer Calibración
                           </button>
                        </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => updateBlueprint({ scale: scaleFactor * 0.9 })} className="flex-1 py-1.5 bg-white border border-zinc-200 rounded-lg text-[9px] font-black hover:bg-zinc-100 active:scale-95 transition-all">-</button>
                        <button onClick={() => updateBlueprint({ scale: scaleFactor * 1.1 })} className="flex-1 py-1.5 bg-white border border-zinc-200 rounded-lg text-[9px] font-black hover:bg-zinc-100 active:scale-95 transition-all">+</button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[9px] font-black text-zinc-600 uppercase">Rotation</label>
                      <span className="text-[9px] font-mono text-blue-600 font-black">{Math.round((rotationRad * 180) / Math.PI)}°</span>
                    </div>
                    <input type="range" min={-Math.PI} max={Math.PI} step={0.01} value={rotationRad} onChange={(e) => updateBlueprint({ rotation: parseFloat(e.target.value) })} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                </div>

                <div className="flex gap-2">
                   <div className="flex-1 space-y-1">
                      <label className="text-[7px] font-mono text-zinc-400 uppercase">POS X</label>
                      <input type="number" step="0.1" value={pos[0]} onChange={(e) => updateBlueprint({ position: [parseFloat(e.target.value) || 0, pos[1], pos[2]] })} className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono" />
                   </div>
                   <div className="flex-1 space-y-1">
                      <label className="text-[7px] font-mono text-zinc-400 uppercase">POS Z</label>
                      <input type="number" step="0.1" value={pos[2]} onChange={(e) => updateBlueprint({ position: [pos[0], pos[1], parseFloat(e.target.value) || 0] })} className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono" />
                   </div>
                </div>

                <div className="pt-2 border-t border-zinc-200/50 mt-2">
                  <button 
                    onClick={() => {
                      setActiveTool('scale-blueprint');
                      useEditorStore.getState().setCalibrationState({ step: 'awaiting-first-point', pointA: undefined, pointB: undefined, measuredDistance: undefined });
                    }}
                    className="w-full py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2 group ring-1 ring-zinc-900/5"
                  >
                    <span className="group-hover:scale-125 transition-transform">📏</span>
                    {blueprint.calibrated ? 'Recalibrar Plano' : 'Calibrar Escala del Plano'}
                  </button>
                  <p className="text-[8px] text-zinc-400 text-center mt-2 leading-relaxed px-2">
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
      className={`absolute top-4 right-4 z-40 flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-zinc-900/5 transition-all duration-300 ease-in-out overflow-hidden
        ${isCollapsed ? 'w-12 h-12 justify-center items-center cursor-pointer hover:bg-zinc-50' : 'w-72 bottom-4'}`}
    >
      {isCollapsed ? (
        <div onClick={() => setIsCollapsed(false)} className="w-full h-full flex items-center justify-center text-zinc-600 hover:text-blue-600" title="Expandir Inspector">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/50 bg-white/50 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Inspector</span>
            <button onClick={() => setIsCollapsed(true)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-colors" title="Contraer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex border-b border-zinc-200/50 bg-zinc-50/50 p-1 shrink-0 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('properties')} className={`flex-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-md whitespace-nowrap ${activeTab === 'properties' ? 'text-zinc-900 bg-white border border-zinc-200 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Props</button>
            <button onClick={() => setActiveTab('scene')} className={`flex-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-md whitespace-nowrap ${activeTab === 'scene' ? 'text-zinc-900 bg-white border border-zinc-200 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Visuales</button>
            <button onClick={() => setActiveTab('layers')} className={`flex-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-md whitespace-nowrap ${activeTab === 'layers' ? 'text-zinc-900 bg-white border border-zinc-200 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Capas</button>
            <button onClick={() => setActiveTab('blueprint')} className={`flex-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-md whitespace-nowrap ${activeTab === 'blueprint' ? 'text-zinc-900 bg-white border border-zinc-200 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Plano</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
            {activeTab === 'properties' && renderProperties()}
            {activeTab === 'scene' && renderScene()}
            {activeTab === 'layers' && renderLayers()}
            {activeTab === 'components' && renderComponents()}
            {activeTab === 'blueprint' && renderBlueprint()}
          </div>
        </>
      )}
    </aside>
  );
};
