"use client";

import React from 'react';
import { useEditorStore } from '@/store/editor-store';
import { getItemHalfHeight } from '@/utils/cad-math';

const CategoryItem: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <button className={`w-full text-left px-3 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-transparent'}`}>
    {label}
  </button>
);

export const CatalogPanel: React.FC = () => {
  return (
    <aside className="w-56 flex flex-col border-r border-zinc-800 bg-zinc-900 shrink-0 z-30 shadow-2xl overflow-hidden">
      <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center shadow-inner">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Global</span>
          <h2 className="text-xs font-black text-zinc-300 uppercase tracking-tighter">Asset Library</h2>
        </div>
        <div className="h-6 w-6 rounded border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">📁</div>
      </div>
      
      <div className="p-3 bg-zinc-900/50 border-b border-zinc-800">
        <input 
          type="text" 
          placeholder="SEARCH ASSETS..." 
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-[9px] font-bold text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-zinc-700 tracking-wider transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
        <section className="space-y-2">
          <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-2 mb-3">Enterprise Catalog</h3>
          <div className="space-y-1">
             <CategoryItem label="Standard Furniture" active />
             <CategoryItem label="Technical Storage" />
             <CategoryItem label="Structural Fittings" />
             <CategoryItem label="Lighting & Electrical" />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-2">Ready Assets</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { type: 'rack', name: 'RACK H2', icon: '🪜' },
              { type: 'shelf', name: 'SHELF L1', icon: '🍱' },
              { type: 'desk', name: 'DESK OFFICE', icon: '🖥️' },
              { type: 'cabinet', name: 'CAB MODULAR', icon: '🗄️' }
            ].map(asset => (
              <div 
                key={asset.name}
                onClick={() => {
                    const id = Math.random().toString(36).substr(2, 9);
                   const itemType = asset.type as any;
                   useEditorStore.getState().addItem({
                     id,
                     type: itemType,
                     position: [0, getItemHalfHeight(itemType), 0],
                     rotation: [0, 0, 0],
                     scale: [1, 1, 1]
                   });
                   useEditorStore.getState().setActiveTool('move');
                }}
                className="group flex flex-col p-2 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-blue-500/50 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <div className="aspect-square w-full bg-zinc-900 rounded-lg mb-2 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  {asset.icon}
                </div>
                <span className="text-[8px] font-black text-zinc-500 group-hover:text-zinc-200 text-center uppercase tracking-tighter truncate">{asset.name}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="p-4 bg-zinc-950/50 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 opacity-60">
           <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest text-center">Company library loading...</span>
           <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-blue-500/50 animate-[shimmer_2s_infinite]"></div>
           </div>
        </div>
      </div>
      
      <div className="p-4 bg-zinc-950 border-t border-zinc-800">
         <button className="w-full py-2 bg-zinc-900 text-zinc-500 border border-zinc-800 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-zinc-300 hover:border-zinc-700 transition-all">Import FBX/OBJ</button>
      </div>
    </aside>
  );
};
