"use client";

import React from 'react';
import { useEditorStore } from '@/store/editor-store';
import { getItemHalfHeight } from '@/utils/cad-math';

export const RightInspector: React.FC = () => {
  const { 
    selectedId, selectedType, items, walls, openings, dimensions, lines, rectangles, layers,
    updateItem, updateWall, removeItem, toggleLayer 
  } = useEditorStore();

  const selectedItem = items.find(i => i.id === selectedId);
  const selectedWall = walls.find(w => w.id === selectedId);
  const selectedDim = dimensions.find(d => d.id === selectedId);
  const selectedOpening = openings.find(o => o.id === selectedId);
  const selectedLine = lines.find(l => l.id === selectedId);
  const selectedRect = rectangles.find(r => r.id === selectedId);

  return (
    <aside className="w-80 flex flex-col border-l border-zinc-200 bg-white shrink-0 z-40 overflow-hidden shadow-2xl">
      {/* Tabs / Panels */}
      <div className="flex border-b border-zinc-200 bg-zinc-50 p-1">
        <button className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-900 bg-white rounded-md border border-zinc-200 shadow-sm ring-1 ring-white/5">Properties</button>
        <button className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-900 transition-colors">Scene</button>
        <button className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-900 transition-colors">Layers</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
        {!selectedId ? (
          <div className="p-8 h-full flex flex-col items-center justify-center opacity-40 grayscale space-y-4">
             <div className="text-5xl">📐</div>
             <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] text-center max-w-[140px] leading-relaxed">
               SELECT AN OBJECT TO INSPECT GEOMETRY
             </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-3 duration-500">
            {/* Context Header */}
            <div className="p-4 bg-zinc-50 border-b border-zinc-200/50 flex flex-col gap-1">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                {selectedType || 'Entity'} Configuration
              </span>
              <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tighter">
                {selectedType === 'wall' ? 'Structural Wall' : 
                 selectedType === 'item' ? 'Asset Instance' : 
                 selectedType === 'opening' ? 'Structural Opening' : 
                 selectedType === 'rectangle' ? 'Architectural Area' : 
                 selectedType === 'line' ? 'Draft Line' : 'Measurement'}
              </h2>
              <span className="text-[8px] font-mono text-zinc-700 uppercase">UUID: {selectedId}</span>
            </div>

            <div className="p-5 space-y-8">
               {selectedWall && (
                 <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                      WALL GEOMETRY <div className="h-px flex-1 bg-zinc-200"></div>
                    </h3>

                    {/* Length — read-only computed metric */}
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                       <span className="text-[9px] font-black text-zinc-600 uppercase tracking-wider">Length</span>
                       <span className="text-sm font-black font-mono text-blue-600">
                         {Math.sqrt(
                           Math.pow(selectedWall.end[0] - selectedWall.start[0], 2) + 
                           Math.pow(selectedWall.end[2] - selectedWall.start[2], 2)
                         ).toFixed(2)}m
                       </span>
                    </div>

                    {/* Editable: Thickness + Height */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-bold text-zinc-600 uppercase">Thickness (m)</label>
                          <input 
                            type="number" step="0.05" min="0.05" value={selectedWall.thickness} 
                            onChange={(e) => updateWall(selectedWall.id, { thickness: parseFloat(e.target.value) })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 text-xs font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-bold text-zinc-600 uppercase">Height (m)</label>
                          <input 
                            type="number" step="0.1" min="0.5" value={selectedWall.height} 
                            onChange={(e) => updateWall(selectedWall.id, { height: parseFloat(e.target.value) })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 text-xs font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                          />
                       </div>
                    </div>

                    {/* Start / End Vectors */}
                    <div className="space-y-3 p-4 bg-zinc-50/50 rounded-xl border border-zinc-200 shadow-inner">
                       <div className="space-y-1">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Start Point</span>
                          <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-0.5">
                               <span className="text-[7px] text-zinc-400 font-mono uppercase">X</span>
                               <input type="number" readOnly value={selectedWall.start[0].toFixed(2)} className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] font-mono text-zinc-600" />
                             </div>
                             <div className="space-y-0.5">
                               <span className="text-[7px] text-zinc-400 font-mono uppercase">Z</span>
                               <input type="number" readOnly value={selectedWall.start[2].toFixed(2)} className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] font-mono text-zinc-600" />
                             </div>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">End Point</span>
                          <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-0.5">
                               <span className="text-[7px] text-zinc-400 font-mono uppercase">X</span>
                               <input type="number" readOnly value={selectedWall.end[0].toFixed(2)} className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] font-mono text-zinc-600" />
                             </div>
                             <div className="space-y-0.5">
                               <span className="text-[7px] text-zinc-400 font-mono uppercase">Z</span>
                               <input type="number" readOnly value={selectedWall.end[2].toFixed(2)} className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[10px] font-mono text-zinc-600" />
                             </div>
                          </div>
                       </div>
                    </div>
                 </section>
               )}

               {selectedOpening && (
                 <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                      OPENING PARAMS <div className="h-px flex-1 bg-zinc-200"></div>
                    </h3>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-bold text-zinc-600 uppercase">Offset on Wall (0.0 - 1.0)</label>
                          <input 
                            type="range" min="0" max="1" step="0.01" value={selectedOpening.offset} 
                            onChange={(e) => useEditorStore.getState().addOpening({ ...selectedOpening, offset: parseFloat(e.target.value) })}
                            className="w-full accent-blue-500"
                          />
                          <div className="text-[10px] font-mono text-zinc-600 text-right">{(selectedOpening.offset * 100).toFixed(0)}%</div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-600 uppercase">Width (m)</label>
                            <input 
                              type="number" step="0.1" value={selectedOpening.width} 
                              onChange={(e) => useEditorStore.getState().addOpening({ ...selectedOpening, width: parseFloat(e.target.value) })}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 text-xs font-mono text-zinc-900 outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-600 uppercase">Height (m)</label>
                            <input 
                              type="number" step="0.1" value={selectedOpening.height} 
                              onChange={(e) => useEditorStore.getState().addOpening({ ...selectedOpening, height: parseFloat(e.target.value) })}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 text-xs font-mono text-zinc-900 outline-none"
                            />
                          </div>
                       </div>
                    </div>
                 </section>
               )}

               {selectedItem && (
                 <section className="space-y-6">
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                      TRANSFORM <div className="h-px flex-1 bg-zinc-200"></div>
                    </h3>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Position</span>
                          <div className="grid grid-cols-3 gap-2">
                             {/* X */}
                             <input type="number" step="0.1" value={selectedItem.position[0].toFixed(2)}
                               onChange={(e) => updateItem(selectedItem.id, { position: [parseFloat(e.target.value), selectedItem.position[1], selectedItem.position[2]] })}
                               className="bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                             {/* Y — clamped to floor */}
                             <div className="relative">
                               <input type="number" step="0.1" value={selectedItem.position[1].toFixed(2)}
                                 onChange={(e) => {
                                   const minY = getItemHalfHeight(selectedItem.type);
                                   const y = Math.max(parseFloat(e.target.value), minY);
                                   updateItem(selectedItem.id, { position: [selectedItem.position[0], y, selectedItem.position[2]] });
                                 }}
                                 className="w-full bg-zinc-50 border border-emerald-900/40 rounded px-1.5 py-1 text-[10px] font-mono text-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none" />
                               <span className="absolute -bottom-3 left-0 text-[7px] text-emerald-700 font-mono whitespace-nowrap">floor clamp</span>
                             </div>
                             {/* Z */}
                             <input type="number" step="0.1" value={selectedItem.position[2].toFixed(2)}
                               onChange={(e) => updateItem(selectedItem.id, { position: [selectedItem.position[0], selectedItem.position[1], parseFloat(e.target.value)] })}
                               className="bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Rotation (rad)</span>
                          <div className="grid grid-cols-3 gap-2">
                             <input type="number" step="0.1" value={selectedItem.rotation[1].toFixed(2)} onChange={(e) => updateItem(selectedItem.id, { rotation: [0, parseFloat(e.target.value), 0] })} className="bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900 col-span-3 text-center focus:ring-1 focus:ring-blue-500 outline-none" />
                          </div>
                       </div>
                    </div>
                 </section>
               )}

               {selectedLine && (
                 <section className="space-y-6">
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                      LINE GEOMETRY <div className="h-px flex-1 bg-zinc-200"></div>
                    </h3>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Start Point (X, Z)</span>
                          <div className="grid grid-cols-2 gap-2">
                             <input type="number" step="0.1" value={selectedLine.start[0]} onChange={(e) => useEditorStore.getState().updateLine(selectedLine.id, { start: [parseFloat(e.target.value), 0, selectedLine.start[2]] })} className="bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900" />
                             <input type="number" step="0.1" value={selectedLine.start[2]} onChange={(e) => useEditorStore.getState().updateLine(selectedLine.id, { start: [selectedLine.start[0], 0, parseFloat(e.target.value)] })} className="bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900" />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">End Point (X, Z)</span>
                          <div className="grid grid-cols-2 gap-2">
                             <input type="number" step="0.1" value={selectedLine.end[0]} onChange={(e) => useEditorStore.getState().updateLine(selectedLine.id, { end: [parseFloat(e.target.value), 0, selectedLine.end[2]] })} className="bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900" />
                             <input type="number" step="0.1" value={selectedLine.end[2]} onChange={(e) => useEditorStore.getState().updateLine(selectedLine.id, { end: [selectedLine.end[0], 0, parseFloat(e.target.value)] })} className="bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900" />
                          </div>
                       </div>
                       <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-600 uppercase">Length</span>
                          <span className="text-xs font-mono text-blue-400">
                             {Math.sqrt(
                               Math.pow(selectedLine.end[0] - selectedLine.start[0], 2) + 
                               Math.pow(selectedLine.end[2] - selectedLine.start[2], 2)
                             ).toFixed(2)}m
                          </span>
                       </div>
                    </div>
                 </section>
               )}

               {selectedRect && (
                 <section className="space-y-6">
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                      RECTANGLE GEOMETRY <div className="h-px flex-1 bg-zinc-200"></div>
                    </h3>

                    {/* Category badge */}
                    {selectedRect.category && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-zinc-600 uppercase">Category:</span>
                        <span className="text-[9px] font-mono bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/40">{selectedRect.category}</span>
                      </div>
                    )}

                    <div className="space-y-4">
                       {/* Start Point */}
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Start Point</span>
                          <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-1">
                               <label className="text-[8px] text-zinc-600 font-mono">Start X</label>
                               <input type="number" step="0.1" value={selectedRect.start[0].toFixed(2)}
                                 onChange={(e) => {
                                   const x = parseFloat(e.target.value);
                                   const newW = selectedRect.end[0] - x;
                                   useEditorStore.getState().updateRectangle(selectedRect.id, { start: [x, 0, selectedRect.start[2]], width: newW });
                                 }}
                                 className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[8px] text-zinc-600 font-mono">Start Z</label>
                               <input type="number" step="0.1" value={selectedRect.start[2].toFixed(2)}
                                 onChange={(e) => {
                                   const z = parseFloat(e.target.value);
                                    const newD = selectedRect.end[2] - z;
                                    useEditorStore.getState().updateRectangle(selectedRect.id, { start: [selectedRect.start[0], 0, z], depth: newD });
                                 }}
                                 className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                             </div>
                          </div>
                       </div>

                       {/* End Point */}
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">End Point</span>
                          <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-1">
                               <label className="text-[8px] text-zinc-600 font-mono">End X</label>
                               <input type="number" step="0.1" value={selectedRect.end[0].toFixed(2)}
                                 onChange={(e) => {
                                   const x = parseFloat(e.target.value);
                                   const newW = x - selectedRect.start[0];
                                   useEditorStore.getState().updateRectangle(selectedRect.id, { end: [x, 0, selectedRect.end[2]], width: newW });
                                 }}
                                 className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[8px] text-zinc-600 font-mono">End Z</label>
                               <input type="number" step="0.1" value={selectedRect.end[2].toFixed(2)}
                                 onChange={(e) => {
                                   const z = parseFloat(e.target.value);
                                    const newD = z - selectedRect.start[2];
                                    useEditorStore.getState().updateRectangle(selectedRect.id, { end: [selectedRect.end[0], 0, z], depth: newD });
                                 }}
                                 className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none" />
                             </div>
                          </div>
                       </div>

                       {/* Width / Depth derived */}
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-bold text-zinc-600 uppercase">Width (m)</label>
                             <input 
                               type="number" step="0.1" value={Math.abs(selectedRect.width).toFixed(2)} 
                               onChange={(e) => {
                                 const w = parseFloat(e.target.value);
                                 useEditorStore.getState().updateRectangle(selectedRect.id, { width: w, end: [selectedRect.start[0] + w, 0, selectedRect.end[2]] });
                               }}
                               className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 text-xs font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-bold text-zinc-600 uppercase">Depth (m)</label>
                             <input 
                               type="number" step="0.1" value={Math.abs(selectedRect.depth).toFixed(2)} 
                               onChange={(e) => {
                                 const d = parseFloat(e.target.value);
                                 useEditorStore.getState().updateRectangle(selectedRect.id, { depth: d, end: [selectedRect.end[0], 0, selectedRect.start[2] + d] });
                               }}
                               className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 text-xs font-mono text-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none"
                             />
                          </div>
                       </div>

                       {/* Computed area */}
                       <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                             <span className="text-[9px] font-bold text-zinc-600 uppercase">Area</span>
                             <span className="text-sm font-mono text-emerald-400 font-black">{Math.abs(selectedRect.width * selectedRect.depth).toFixed(2)} m²</span>
                          </div>
                          <div className="flex flex-col gap-1">
                             <span className="text-[9px] font-bold text-zinc-600 uppercase">Perimeter</span>
                             <span className="text-sm font-mono text-blue-400 font-black">{(2 * (Math.abs(selectedRect.width) + Math.abs(selectedRect.depth))).toFixed(2)} m</span>
                          </div>
                       </div>
                    </div>
                 </section>
               )}

               <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                    LAYER CONTROL <div className="h-px flex-1 bg-zinc-200"></div>
                  </h3>
                  <div className="space-y-2">
                    {layers.map(layer => (
                      <div key={layer.id} className="flex items-center justify-between p-2 rounded hover:bg-zinc-800 transition-all cursor-pointer group" onClick={() => toggleLayer(layer.id)}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${layer.visible ? 'text-zinc-900' : 'text-zinc-600'}`}>{layer.name}</span>
                        <div className={`w-3 h-3 rounded-full border border-zinc-700 transition-all ${layer.visible ? 'bg-blue-600 shadow-[0_0_8px_#3b82f6] ring-2 ring-blue-500/20' : 'bg-white'}`} />
                      </div>
                    ))}
                  </div>
               </section>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex flex-col gap-3">
         <button 
           disabled={!selectedId}
           onClick={() => selectedId && removeItem(selectedId)}
           className="w-full py-2.5 bg-red-900/10 hover:bg-red-900/40 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-red-900/30 disabled:opacity-20 shadow-xl active:scale-95"
         >
           Remove Selection
         </button>
      </div>
    </aside>
  );
};
