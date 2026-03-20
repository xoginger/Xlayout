"use client";

import React, { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { ProjectManager } from './ProjectManager';

// ─── Sub-components ─────────────────────────────────────────────────────────

const MenuBtn: React.FC<{ label: string; active?: boolean; onClick?: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-md transition-all text-[10px] font-black uppercase tracking-widest border border-transparent ${
      active ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
    }`}
  >
    {label}
  </button>
);

const MenuAction: React.FC<{
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, icon, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
      disabled ? 'opacity-20 cursor-not-allowed text-zinc-400' : 'hover:bg-zinc-50 text-zinc-900'
    }`}
  >
    {icon && <span className="text-zinc-400">{icon}</span>}
    {label}
  </button>
);

const MenuDivider = () => <div className="h-px bg-zinc-100 my-1 mx-2" />;

// ─── Icon helpers ────────────────────────────────────────────────────────────

const PlusIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><path d="M5 12h14M12 5v14"/></svg>;
const FolderIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>;
const SaveIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const UndoIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>;
const RedoIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="m15 4 5 5-5 5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>;
const TrashIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>;

// ─── EditorToolbar ──────────────────────────────────────────────────────────

/**
 * Barra contextual del editor.
 * Contiene: File/Edit menus · Undo/Redo · Nombre del proyecto · 2D/3D · Export.
 * NO contiene navegación global (eso es responsabilidad de GlobalNavBar).
 */
export const EditorToolbar: React.FC = () => {
  const {
    project, viewMode, setViewMode,
    undo, redo, historyIndex, history,
    setProjectName, saveProject, createNewProject,
  } = useEditorStore();

  const [isEditingName, setIsEditingName]         = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [activeMenu, setActiveMenu]               = useState<string | null>(null);

  // Autosave cada 60s si está sucio
  useEffect(() => {
    const timer = setInterval(() => {
      if (project.isDirty && project.id !== 'default') {
        saveProject().catch(console.error);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [project.isDirty, project.id, saveProject]);

  const toggleMenu = (menu: string) => setActiveMenu(activeMenu === menu ? null : menu);

  const handleNew = () => {
    const name = prompt('NOMBRE DEL PROYECTO:', 'NUEVO LAYOUT ARQUITECTÓNICO');
    if (name) createNewProject(name);
    setActiveMenu(null);
  };

  return (
    <div className="flex h-12 w-full shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-4 z-40">

      {/* ── File / Edit menus ── */}
      <div className="flex items-center gap-1">
        {/* File menu */}
        <div className="relative">
          <MenuBtn label="Archivo" active={activeMenu === 'file'} onClick={() => toggleMenu('file')} />
          {activeMenu === 'file' && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[200] p-1.5 ring-1 ring-black/5">
              <MenuAction label="Nuevo Proyecto"   icon={<PlusIcon />}   onClick={handleNew} />
              <MenuAction label="Abrir Biblioteca" icon={<FolderIcon />} onClick={() => { setIsProjectManagerOpen(true); setActiveMenu(null); }} />
              <MenuDivider />
              <MenuAction
                label="Guardar ahora"
                icon={<SaveIcon />}
                onClick={() => { saveProject(); setActiveMenu(null); }}
                disabled={!project.isDirty || project.isSaving}
              />
              <MenuAction label="Duplicar" onClick={() => setActiveMenu(null)} disabled />
            </div>
          )}
        </div>

        {/* Edit menu */}
        <div className="relative">
          <MenuBtn label="Editar" active={activeMenu === 'edit'} onClick={() => toggleMenu('edit')} />
          {activeMenu === 'edit' && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[200] p-1.5 ring-1 ring-black/5">
              <MenuAction label="Deshacer" icon={<UndoIcon />} onClick={() => { undo(); setActiveMenu(null); }} />
              <MenuAction label="Rehacer"  icon={<RedoIcon />} onClick={() => { redo(); setActiveMenu(null); }} />
              <MenuDivider />
              <MenuAction
                label="Eliminar selección"
                icon={<TrashIcon />}
                onClick={() => {
                  const id = useEditorStore.getState().selectedId;
                  if (id) useEditorStore.getState().removeItem(id);
                  setActiveMenu(null);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Undo / Project name / Redo ── */}
      <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-1.5 border border-zinc-200 shadow-sm">
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Deshacer (Ctrl+Z)"
          className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-blue-600 disabled:opacity-20 transition-all rounded-full hover:bg-zinc-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
            <path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
          </svg>
        </button>

        <div className="h-4 w-px bg-zinc-200" />

        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => !isEditingName && setIsEditingName(true)}>
          <span className={`w-2 h-2 rounded-full transition-all ${
            project.isSaving ? 'bg-blue-500 animate-ping' :
            project.isDirty  ? 'bg-amber-500'             : 'bg-emerald-500'
          }`} />
          {isEditingName ? (
            <input
              autoFocus
              className="text-[10px] font-black text-zinc-900 outline-none w-40 bg-transparent uppercase tracking-wider"
              value={project.name}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            />
          ) : (
            <span className="text-[10px] font-black text-zinc-800 uppercase tracking-wider group-hover:text-blue-600 transition-colors select-none">
              {project.name || 'SIN TÍTULO'}
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-zinc-200" />

        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="Rehacer (Ctrl+Y)"
          className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-blue-600 disabled:opacity-20 transition-all rounded-full hover:bg-zinc-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
            <path d="m15 14 5-5-5-5"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
          </svg>
        </button>
      </div>

      {/* ── Right: 2D/3D + Export ── */}
      <div className="flex items-center gap-3">
        {/* 2D / 3D toggle */}
        <div className="flex bg-zinc-100 rounded-xl p-1 border border-zinc-200">
          <button
            onClick={() => setViewMode('2D')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase ${
              viewMode === '2D' ? 'bg-white text-zinc-900 shadow border border-zinc-200' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            2D
          </button>
          <button
            onClick={() => setViewMode('3D')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase ${
              viewMode === '3D' ? 'bg-white text-zinc-900 shadow border border-zinc-200' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            3D
          </button>
        </div>

        {/* Export */}
        <button className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-1.5">
          <span>Export</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
            <path d="M7 17l9.2-9.2M17 17V7H7"/>
          </svg>
        </button>
      </div>

      {/* ProjectManager modal */}
      <ProjectManager isOpen={isProjectManagerOpen} onClose={() => setIsProjectManagerOpen(false)} />

      {/* Overlay para cerrar menús */}
      {activeMenu && <div className="fixed inset-0 z-[199]" onClick={() => setActiveMenu(null)} />}
    </div>
  );
};
