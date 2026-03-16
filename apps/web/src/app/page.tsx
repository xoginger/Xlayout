import React from 'react';

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-300 font-sans selection:bg-blue-500/30">
      {/* 1. TOP BAR */}
      <header className="flex h-12 w-full items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs ring-1 ring-blue-400/50">X</div>
            <span className="font-bold tracking-tight text-zinc-100">XLayout <span className="text-zinc-500 font-normal">v1.2</span></span>
          </div>
          
          <nav className="hidden items-center gap-4 text-xs font-medium md:flex">
            <button className="hover:text-zinc-100 transition-colors">File</button>
            <button className="hover:text-zinc-100 transition-colors">Edit</button>
            <button className="hover:text-zinc-100 transition-colors">View</button>
            <button className="hover:text-zinc-100 transition-colors">Settings</button>
            <button className="hover:text-zinc-100 transition-colors">Help</button>
          </nav>
        </div>

        <div className="flex flex-1 justify-center px-12">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded-md border border-zinc-700/50 text-[11px] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Project: <span className="text-zinc-200 font-medium">New Commercial Layout - Zone 1</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs font-medium transition-all active:scale-95">
            Save Snapshot
          </button>
          <button className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95">
            Generate Quote
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* 2. LEFT TOOLBAR */}
        <aside className="w-14 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-900 gap-2 shrink-0 z-40">
          <ToolButton icon="📂" label="Projects" />
          <div className="h-px w-8 bg-zinc-800 mx-auto my-1" />
          <ToolButton icon="👆" label="Select" active />
          <ToolButton icon="🧱" label="Draw Wall" />
          <ToolButton icon="🚪" label="Add Opening" />
          <ToolButton icon="📦" label="Place Product" />
          <div className="h-px w-8 bg-zinc-800 mx-auto my-1" />
          <ToolButton icon="🔄" label="Rotate" />
          <ToolButton icon="📏" label="Measure" />
          <ToolButton icon="📷" label="Capture" />
          <div className="mt-auto">
            <ToolButton icon="👤" label="Account" />
          </div>
        </aside>

        {/* 3. CENTER WORKSPACE (Viewport) */}
        <main className="flex-1 relative bg-zinc-950 flex flex-col items-center justify-center group">
          {/* Engineering Grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '160px 160px'}}></div>
          
          <div className="text-zinc-600 text-sm font-mono tracking-widest uppercase select-none group-hover:text-zinc-500 transition-colors">
            Main Viewport - 2D Layout
          </div>
          
          <div className="absolute top-4 left-4 flex gap-2">
             <span className="px-2 py-1 bg-zinc-900/80 rounded border border-zinc-800 text-[10px] font-bold text-blue-400">TOP VIEW</span>
             <span className="px-2 py-1 bg-zinc-900/20 rounded border border-transparent text-[10px] font-bold text-zinc-600">3D PERSPECTIVE</span>
          </div>

          <div className="absolute bottom-6 right-6 flex flex-col gap-2 scale-90 md:scale-100">
             <button className="p-2 bg-zinc-900/90 rounded-full border border-zinc-800 hover:bg-zinc-800 shadow-xl">+</button>
             <button className="p-2 bg-zinc-900/90 rounded-full border border-zinc-800 hover:bg-zinc-800 shadow-xl">-</button>
             <button className="p-2 bg-zinc-900/90 rounded-full border border-zinc-800 hover:bg-zinc-800 shadow-xl">🏠</button>
          </div>
        </main>

        {/* 4. RIGHT INSPECTOR PANEL */}
        <aside className="w-72 flex flex-col border-l border-zinc-800 bg-zinc-900 shrink-0 z-40 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">Inspector</h2>
            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">PROPERTIES</span>
          </div>
          
          <div className="p-4 space-y-6">
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight">Active Selection</h3>
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-center text-xs text-zinc-500 italic">
                No object selected
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight">Scene Settings</h3>
              <div className="space-y-2">
                <PropertyField label="Width" value="12.5 m" />
                <PropertyField label="Length" value="8.2 m" />
                <PropertyField label="Unit System" value="Metric (m)" />
                <PropertyField label="Grid Step" value="0.4 m" />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight">Financial Overview</h3>
              <div className="p-4 bg-blue-900/10 rounded-xl border border-blue-500/20 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Product Count</span>
                  <span className="font-bold text-zinc-100">0</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Est. Total</span>
                  <span className="font-bold text-blue-400">$0.00</span>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-auto p-4 border-t border-zinc-800 space-y-3">
             <button className="w-full py-2 bg-zinc-800 rounded-lg text-[11px] font-bold hover:bg-zinc-700 transition-colors">Export PDF</button>
             <button className="w-full py-2 bg-zinc-800 rounded-lg text-[11px] font-bold hover:bg-zinc-700 transition-colors">Sync to Cloud</button>
          </div>
        </aside>
      </div>

      {/* 5. BOTTOM STATUS BAR */}
      <footer className="h-7 w-full flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-3 shrink-0 text-[10px] font-medium text-zinc-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-zinc-800 cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></span>
            MODE: LAYOUT EDIT
          </div>
          <div className="flex items-center gap-3">
            <span>X: 0.00</span>
            <span>Y: 0.00</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="hover:text-zinc-300">ZOOM: 100%</span>
          <span className="text-zinc-600">|</span>
          <span className="text-blue-500/80 font-bold tracking-widest transition-colors hover:text-blue-400 uppercase">System Ready</span>
        </div>
      </footer>
    </div>
  );
}

function ToolButton({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  return (
    <button className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all group relative
      ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-zinc-800 text-zinc-500'}`}
      title={label}>
      <span className="text-xl leading-none">{icon}</span>
      {!active && <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
        {label}
      </div>}
    </button>
  );
}

function PropertyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-zinc-500 font-medium px-1 uppercase tracking-tight">{label}</label>
      <div className="flex items-center h-8 bg-zinc-950 rounded border border-zinc-800 px-2 text-xs font-mono text-zinc-300 group-hover:border-zinc-700 cursor-text">
        {value}
      </div>
    </div>
  );
}
