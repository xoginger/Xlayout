"use client";

import React, { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { ProjectManager } from '@/components/editor/ProjectManager';
import { Tooltip } from '@/components/ui/Tooltip';
import { extractFirstPageAsImage } from '@/utils/pdf-extractor';

// ─── Sub-components ─────────────────────────────────────────────────────────

const MenuBtn: React.FC<{ label: string; active?: boolean; onClick?: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-md transition-all text-[10px] font-black uppercase tracking-widest border border-transparent ${
      active ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
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
const ImportIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;

// ─── ActionBar ──────────────────────────────────────────────────────────

/**
 * ActionBar — Barra de acciones del módulo (ej: del editor).
 * Contiene únicamente herramientas interactivas, acciones, menús y opciones de vista.
 */
export const ActionBar: React.FC = () => {
  const {
    project, viewMode, setViewMode,
    undo, redo, historyIndex, history,
    saveProject, createNewProject,
    updateBlueprint
  } = useEditorStore();

  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [activeMenu, setActiveMenu]               = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportPlan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActiveMenu(null);
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
      console.error('Error importando plano:', err);
      alert('Hubo un error procesando el archivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Autosave sigue presente como lógica silenciosa
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
    <div className="flex h-12 w-full shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50/90 backdrop-blur-md px-4 z-30">
      
      {/* ── Izquierda: Menús File / Edit y Quick Actions ── */}
      <div className="flex items-center gap-4">
        
        {/* Menús Desplegables */}
        <div className="flex items-center gap-1">
          <div className="relative">
            <MenuBtn label="Archivo" active={activeMenu === 'file'} onClick={() => toggleMenu('file')} />
            {activeMenu === 'file' && (
              <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[200] p-1.5 ring-1 ring-black/5">
                <MenuAction label="Nuevo Proyecto"   icon={<PlusIcon />}   onClick={handleNew} />
                <MenuAction label="Abrir Biblioteca" icon={<FolderIcon />} onClick={() => { setIsProjectManagerOpen(true); setActiveMenu(null); }} />
                <MenuDivider />
                <MenuAction label="Importar plano"   icon={<ImportIcon />} onClick={() => fileInputRef.current?.click()} />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp, application/pdf" onChange={handleImportPlan} />
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

        <div className="h-5 w-px bg-zinc-300" />

        {/* Acciones Rápidas (Quick Actions) */}
        <div className="flex items-center gap-1 border border-zinc-200 bg-white shadow-sm rounded-lg p-1">
          <Tooltip content="Guardar proyecto (Ctrl+S)" position="bottom">
            <button
              onClick={() => saveProject()}
              disabled={!project.isDirty || project.isSaving}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-blue-600 disabled:opacity-20 transition-all rounded-md hover:bg-zinc-100"
            >
              <SaveIcon />
            </button>
          </Tooltip>
          
          <div className="h-4 w-px bg-zinc-200 mx-1" />

          <Tooltip content="Deshacer (Ctrl+Z)" position="bottom">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-blue-600 disabled:opacity-20 transition-all rounded-md hover:bg-zinc-100"
            >
              <UndoIcon />
            </button>
          </Tooltip>
          
          <Tooltip content="Rehacer (Ctrl+Y)" position="bottom">
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-blue-600 disabled:opacity-20 transition-all rounded-md hover:bg-zinc-100"
            >
              <RedoIcon />
            </button>
          </Tooltip>
        </div>

      </div>

      {/* ── Derecha: 2D/3D + Export ── */}
      <div className="flex items-center gap-3">
        {/* Switch 2D / 3D */}
        <Tooltip content="Cambiar dimensión" position="bottom">
          <div className="flex bg-zinc-200/50 rounded-xl p-1 border border-zinc-200 text-zinc-600">
            <button
              onClick={() => setViewMode('2D')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-[0.15em] transition-all uppercase ${
                viewMode === '2D' ? 'bg-white text-zinc-900 shadow-sm border-zinc-200' : 'hover:text-zinc-900'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3D')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-[0.15em] transition-all uppercase ${
                viewMode === '3D' ? 'bg-white text-zinc-900 shadow-sm border-zinc-200' : 'hover:text-zinc-900'
              }`}
            >
              3D
            </button>
          </div>
        </Tooltip>

        {/* Export */}
        <Tooltip content="Exportar a PDF / Imagen" position="bottom">
          <button className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-1.5">
            <span>Exportar</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
              <path d="M7 17l9.2-9.2M17 17V7H7"/>
            </svg>
          </button>
        </Tooltip>
      </div>

      {/* ProjectManager modal */}
      <ProjectManager isOpen={isProjectManagerOpen} onClose={() => setIsProjectManagerOpen(false)} />

      {/* Overlay para cerrar menús */}
      {activeMenu && <div className="fixed inset-0 z-[199]" onClick={() => setActiveMenu(null)} />}
    </div>
  );
};
