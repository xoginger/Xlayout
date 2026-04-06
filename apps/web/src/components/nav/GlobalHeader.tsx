/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useEditorStore } from '@/store/editor-store';
import { Tooltip } from '@/components/ui/Tooltip';
import { XIcon } from '@/components/ui/XLayoutBrand';
import { EditorSaveStatus } from '@/components/editor/EditorSaveStatus';
import { ProjectManager } from '@/components/editor/ProjectManager';
import { CustomizeToolbarModal } from '@/components/editor/CustomizeToolbarModal';
import { VersionHistoryDrawer } from '@/components/editor/VersionHistoryDrawer';
import { extractFirstPageAsImage } from '@/utils/pdf-extractor';
import { getNavModules } from '@/lib/nav-permissions';

// ─── Sistema de Menús Desplegables ───

const MenuBtn: React.FC<{ label: React.ReactNode; active?: boolean; onClick?: () => void; isBrand?: boolean; dark?: boolean }> = ({ label, active, onClick, isBrand, dark }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded transition-all text-[11px] font-black uppercase tracking-widest border border-transparent select-none flex items-center gap-1.5 ${
      isBrand 
        ? (dark ? 'hover:bg-white/10 text-zinc-300 bg-transparent' : 'hover:bg-zinc-100 text-zinc-900 bg-transparent')
        : active 
          ? (dark ? 'bg-white/15 text-white shadow-sm' : 'bg-zinc-900 text-white shadow-sm') 
          : (dark ? 'text-zinc-400 hover:bg-white/10 hover:text-zinc-200' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')
    }`}
  >
    {label}
  </button>
);

const MenuAction: React.FC<{
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  dark?: boolean;
}> = ({ label, icon, shortcut, onClick, disabled, dark }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
      disabled 
        ? (dark ? 'opacity-30 cursor-not-allowed text-zinc-500' : 'opacity-30 cursor-not-allowed text-zinc-400') 
        : (dark ? 'hover:bg-blue-600 hover:text-white text-zinc-300' : 'hover:bg-blue-600 hover:text-white text-zinc-800')
    } group`}
  >
    <div className="flex items-center gap-2.5">
      {icon && <span className="opacity-70 group-hover:text-white transition-colors">{icon}</span>}
      {label}
    </div>
    {shortcut && <span className={`text-[9px] font-mono group-hover:text-blue-200 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>{shortcut}</span>}
  </button>
);

const MenuDivider: React.FC<{ dark?: boolean }> = ({ dark }) => <div className={`h-px my-1 mx-1 ${dark ? 'bg-white/10' : 'bg-zinc-100 border-t border-zinc-200/50'}`} />;

// ─── Iconos ───
const SaveIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const UndoIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>;
const RedoIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="m15 4 5 5-5 5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>;
const TrashIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>;
const ImportIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
const ClockIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const FolderIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>;
const PlusIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M5 12h14M12 5v14"/></svg>;
const ChevronDown = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 opacity-50"><path d="m6 9 6 6 6-6"/></svg>;
const MonitorIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const LogoutIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>;
const QuoteIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const BlueprintIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>;

// ─── Cabecera Global Principal ───

export const GlobalHeader: React.FC<{ pathname: string }> = ({ pathname }) => {
  const router = useRouter();
  const { user, activeTenantName, logout } = useAuthStore();
  
  // Extraemos editor store (seguro llamar los hooks aunque no entremos en el Editor)
  const {
    project, setProjectName, viewMode, setViewMode,
    undo, redo, historyIndex, history,
    saveProject, saveAs, exportProject, importProject, createNewProject, updateBlueprint
  } = useEditorStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const modules = getNavModules(user?.userType, user?.distributorRole);
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'US';

  const isEditor = pathname.startsWith('/editor');
  const isProjects = pathname.startsWith('/projects');
  const isCatalog = pathname.startsWith('/admin/company/catalog') || pathname.startsWith('/catalog');
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/admin/company/dashboard');
  const isAdmin = pathname.startsWith('/admin') && !isCatalog && !isDashboard;

  const toggleMenu = (menu: string) => setActiveMenu(activeMenu === menu ? null : menu);

  // Cierra menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener global
  useEffect(() => {
    if (!isEditor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveProject, isEditor]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActiveMenu(null);
    try {
      if (file.name.endsWith('.xlayout') || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (rev) => {
          try {
            const data = JSON.parse(rev.target?.result as string);
            importProject(data);
          } catch (err) {
            alert('Error al procesar el archivo de proyecto');
          }
        };
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
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
       console.error(err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const currentContextName = () => {
    if (isEditor) return project.name || 'SIN TÍTULO';
    if (isProjects) return 'PIPELINE PRINCIPAL';
    if (isCatalog) return 'CATÁLOGO GLOBAL';
    if (isDashboard) return 'SEGUIMIENTO Q1';
    if (isAdmin) return activeTenantName?.toUpperCase() || 'ADMINISTRACIÓN';
    return 'XLAYOUT CLOUD';
  };

  return (
    <header ref={headerRef} className={`flex h-12 w-full shrink-0 items-center justify-between px-3 z-[100] relative ${
      isEditor 
        ? 'border-b shadow-none' 
        : 'border-b border-zinc-200 bg-white shadow-sm'
    }`}
    style={isEditor ? {
      background: 'var(--xo-surface)',
      borderColor: 'var(--xo-border)',
      backdropFilter: 'var(--xo-blur-light)',
      WebkitBackdropFilter: 'var(--xo-blur-light)',
    } : undefined}
    >
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlayout,.json,image/png,image/jpeg,image/webp,application/pdf" onChange={handleImportFile} />

      {/* ── IZQUIERDA: Logo Global Launcher & Dynamic Menus ── */}
      <div className="flex items-center gap-2">
        
        {/* XLayout Branding Launcher */}
        <div className="relative">
          <MenuBtn 
            label={
              <span className="flex items-center gap-1.5 px-0.5">
                <XIcon size={16} />
                <span className="tracking-widest">XLayout</span>
                <ChevronDown />
              </span>
            } 
            isBrand
            dark={isEditor}
            onClick={() => toggleMenu('launcher')}
          />
          {activeMenu === 'launcher' && (
            <div className="absolute top-full left-0 mt-1.5 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-1.5 z-50 text-white">
              <div className="px-3 py-2 text-[8px] font-black uppercase text-zinc-500 tracking-widest">Ir a...</div>
              {modules.map((m) => (
                <Link key={m.id} href={m.href} onClick={() => setActiveMenu(null)} className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-600 hover:text-white text-zinc-300">
                  <span className="flex items-center gap-2.5">
                    <span className="opacity-50"><MonitorIcon /></span>
                    {m.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={`h-4 w-px mx-1 ${isEditor ? 'bg-white/10' : 'bg-zinc-200'}`} />

        {/* ── Dynamic Menus ── */}
        {isEditor && (
          <>
            {/* Archivo Menu */}
            <div className="relative">
              <MenuBtn label="Archivo" active={activeMenu === 'file'} dark={isEditor} onClick={() => toggleMenu('file')} />
              {activeMenu === 'file' && (
                 <div className={`absolute top-full left-0 mt-1.5 w-56 rounded-lg shadow-xl p-1.5 z-50 ${isEditor ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
                   <MenuAction dark={isEditor} label="Nuevo Proyecto" icon={<PlusIcon />} onClick={() => { 
                     const name = prompt('NOMBRE DEL PROYECTO:', 'NUEVO DISEÑO');
                     if (name) createNewProject(name); 
                     setActiveMenu(null); 
                   }} />
                    <MenuAction dark={isEditor} label="Abrir Biblioteca" icon={<FolderIcon />} shortcut="Ctrl+O" onClick={() => { setIsProjectManagerOpen(true); setActiveMenu(null); }} />
                    <MenuDivider dark={isEditor} />
                    <MenuAction dark={isEditor} label="Guardar Proyecto" icon={<SaveIcon />} shortcut="Ctrl+S" disabled={project.saveStatus === 'saved' || project.saveStatus === 'saving'} onClick={() => { saveProject('manual'); setActiveMenu(null); }} />
                    <MenuAction dark={isEditor} label="Guardar Como..." icon={<SaveIcon />} onClick={() => { 
                      const name = prompt('NUEVO NOMBRE DEL PROYECTO:', `${project.name} (COPIA)`);
                      if (name) saveAs(name); 
                      setActiveMenu(null); 
                    }} />
                    <MenuAction dark={isEditor} label="Historial de Versiones" icon={<ClockIcon />} onClick={() => { setIsVersionHistoryOpen(true); setActiveMenu(null); }} disabled={project.id === 'default'} />
                    <MenuDivider dark={isEditor} />
                    <MenuAction dark={isEditor} label="Exportar Proyecto (.xlayout)" icon={<SaveIcon />} onClick={() => { exportProject(); setActiveMenu(null); }} />
                    <MenuAction dark={isEditor} label="Importar Proyecto / Plano" icon={<ImportIcon />} onClick={() => fileInputRef.current?.click()} />
                  </div>
              )}
            </div>

            {/* Editar Menu */}
            <div className="relative">
              <MenuBtn label="Editar" active={activeMenu === 'edit'} dark={isEditor} onClick={() => toggleMenu('edit')} />
              {activeMenu === 'edit' && (
                 <div className={`absolute top-full left-0 mt-1.5 w-56 rounded-lg shadow-xl p-1.5 z-50 ${isEditor ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
                   <MenuAction dark={isEditor} label="Deshacer" icon={<UndoIcon />} shortcut="Ctrl+Z" onClick={() => { undo(); setActiveMenu(null); }} disabled={historyIndex <= 0} />
                   <MenuAction dark={isEditor} label="Rehacer" icon={<RedoIcon />} shortcut="Ctrl+Y" onClick={() => { redo(); setActiveMenu(null); }} disabled={historyIndex >= history.length - 1} />
                   <MenuDivider dark={isEditor} />
                   <MenuAction dark={isEditor} label="Eliminar Item" icon={<TrashIcon />} shortcut="Del" onClick={() => {
                     const id = useEditorStore.getState().selectedId;
                     if (id) useEditorStore.getState().removeItem(id);
                     setActiveMenu(null);
                   }} />
                 </div>
              )}
            </div>

            {/* Herramientas Menu */}
            <div className="relative">
              <MenuBtn label="Herramientas" active={activeMenu === 'tools'} dark={isEditor} onClick={() => toggleMenu('tools')} />
              {activeMenu === 'tools' && (
                 <div className={`absolute top-full left-0 mt-1.5 w-56 rounded-lg shadow-xl p-1.5 z-50 ${isEditor ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
                   <MenuAction dark={isEditor} label={viewMode === '2D' ? 'Cambiar a 3D' : 'Cambiar a 2D'} icon={<MonitorIcon />} shortcut="Tab" onClick={() => { setViewMode(viewMode === '2D' ? '3D' : '2D'); setActiveMenu(null); }} />
                   <MenuDivider dark={isEditor} />
                   <MenuAction dark={isEditor} label="Cotización" icon={<QuoteIcon />} onClick={() => {
                     const state = useEditorStore.getState();
                     if (!state.advancedMode) state.toggleAdvancedMode();
                     // Usamos un micro-delay para que el inspector se monte antes de cambiar tab
                     setTimeout(() => {
                       const tabBtn = document.querySelector('[data-inspector-tab="quote"]') as HTMLButtonElement;
                       if (tabBtn) tabBtn.click();
                     }, 50);
                     setActiveMenu(null);
                   }} />
                   <MenuAction dark={isEditor} label="Plano / Blueprint" icon={<BlueprintIcon />} onClick={() => {
                     const state = useEditorStore.getState();
                     if (!state.advancedMode) state.toggleAdvancedMode();
                     setTimeout(() => {
                       const tabBtn = document.querySelector('[data-inspector-tab="blueprint"]') as HTMLButtonElement;
                       if (tabBtn) tabBtn.click();
                     }, 50);
                     setActiveMenu(null);
                   }} />
                   <MenuDivider dark={isEditor} />
                   <MenuAction dark={isEditor} label="Personalizar Herramientas" icon={<MonitorIcon />} onClick={() => { setIsCustomizeOpen(true); setActiveMenu(null); }} />
                 </div>
              )}
            </div>
          </>
        )}

        {isProjects && (
          <div className="relative">
            <MenuBtn label="Proyectos" active={activeMenu === 'projects'} onClick={() => toggleMenu('projects')} />
            {activeMenu === 'projects' && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-zinc-200 rounded-lg shadow-xl p-1.5 z-50">
                 <MenuAction label="Nuevo Proyecto" icon={<PlusIcon />} onClick={() => { setActiveMenu(null); router.push('/editor'); }} />
                 <MenuDivider />
                 <MenuAction label="Ver Archivados" icon={<FolderIcon />} onClick={() => setActiveMenu(null)} />
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="relative">
            <MenuBtn label="Ajustes" active={activeMenu === 'settings'} onClick={() => toggleMenu('settings')} />
            {activeMenu === 'settings' && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-zinc-200 rounded-lg shadow-xl p-1.5 z-50">
                 <MenuAction label="Perfil de Empresa" icon={<MonitorIcon />} onClick={() => setActiveMenu(null)} />
                 <MenuAction label="Roles y Permisos" icon={<MonitorIcon />} onClick={() => setActiveMenu(null)} />
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── CENTRO: Document Context (Breadcrumb) ── */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-2">
         {/* Status Dot */}
         {/* Status Dot / Editor Save Status */}
         {isEditor ? (
           <EditorSaveStatus />
         ) : (
           <Tooltip content="Conexión estable" position="bottom">
             <div className="w-2 h-2 rounded-full transition-colors border border-black/10 shadow-sm bg-emerald-500" />
           </Tooltip>
         )}

         {/* Inline Name Editor (Only Editor) */}
         {isEditor && isEditingName ? (
            <input
              autoFocus
              className="text-[11px] font-black text-zinc-900 outline-none w-48 text-center bg-transparent tracking-widest uppercase border-b border-blue-400"
              value={project.name || ''}
              placeholder="SIN TÍTULO"
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            />
          ) : (
            <Tooltip content={isEditor ? "Renombrar Documento" : "Contexto Activo"} position="bottom">
              <span 
                className={`text-[11px] font-black tracking-widest uppercase select-none py-1 border-b border-transparent ${isEditor ? 'text-zinc-300 hover:text-blue-400 transition-colors cursor-text hover:border-blue-400/30' : 'text-zinc-800 hover:text-blue-600 transition-colors cursor-text hover:border-blue-200'}`}
                onClick={() => isEditor && setIsEditingName(true)}
              >
                {currentContextName()}
              </span>
            </Tooltip>
          )}
      </div>

      {/* ── DERECHA: QuickActions, Export & Avatar ── */}
      <div className="flex items-center gap-2.5">
        
        {/* Quick Actions (Dynamic) */}
        {isEditor && (
          <div className="flex items-center gap-0.5 px-2">
             <Tooltip content="Switch View (Tab)" position="bottom">
                <button 
                  onClick={() => setViewMode(viewMode === '2D' ? '3D' : '2D')}
                  className={`px-2 py-1 text-[9px] font-black tracking-widest uppercase rounded select-none shadow-sm mr-2 ${isEditor ? 'hover:bg-white/10 text-zinc-300 border border-white/10' : 'hover:bg-zinc-100 text-zinc-600 border border-zinc-200'}`}
                >
                  {viewMode}
                </button>
             </Tooltip>

             <div className={`flex items-center rounded px-1 group shadow-sm ${isEditor ? 'bg-white/5 border border-white/10' : 'bg-zinc-50 border border-zinc-200'}`}>
               <button onClick={() => saveProject()} disabled={project.saveStatus === 'saved' || project.saveStatus === 'saving'} className={`w-6 h-6 flex items-center justify-center hover:text-blue-400 disabled:opacity-20 rounded transition-colors ${isEditor ? 'text-zinc-400' : 'text-zinc-500 hover:text-blue-600'}`}><SaveIcon /></button>
               <div className={`h-3 w-px mx-0.5 ${isEditor ? 'bg-white/10' : 'bg-zinc-200'}`} />
               <button onClick={undo} disabled={historyIndex <= 0} className={`w-6 h-6 flex items-center justify-center hover:text-blue-400 disabled:opacity-20 rounded transition-colors ${isEditor ? 'text-zinc-400' : 'text-zinc-500 hover:text-blue-600'}`}><UndoIcon /></button>
               <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`w-6 h-6 flex items-center justify-center hover:text-blue-400 disabled:opacity-20 rounded transition-colors ${isEditor ? 'text-zinc-400' : 'text-zinc-500 hover:text-blue-600'}`}><RedoIcon /></button>
             </div>
          </div>
        )}

        {isProjects && (
          <button 
            onClick={() => router.push('/editor')} 
            className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-black text-[9px] tracking-widest uppercase transition-all flex items-center gap-1 border border-blue-200"
          >
            <PlusIcon /> Nuevo Proyecto
          </button>
        )}

        {/* Export Button (Only in Editor/Projects/Reports) */}
        {(isEditor || isProjects || isDashboard) && (
          <Tooltip content="Exportar proyecto (.xlayout)" position="bottom">
            <button onClick={isEditor ? exportProject : undefined} className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
              <SaveIcon />
              <span>Exportar</span>
            </button>
          </Tooltip>
        )}

        <div className={`h-5 w-px ${isEditor ? 'bg-white/10' : 'bg-zinc-200'}`} />

        {/* Global Avatar Dropdown */}
        <div className="relative">
          <button onClick={() => toggleMenu('avatar')} className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-[10px] font-black shadow-md ring-2 ring-white hover:ring-indigo-100 transition-all focus:outline-none">
            {initials}
          </button>

          {activeMenu === 'avatar' && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-1.5 z-[200]">
               {activeTenantName && (
                 <div className="px-3 py-2 mb-1 bg-zinc-800/50 rounded flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">{activeTenantName}</span>
                 </div>
               )}
              <div className="px-3 py-2 text-white">
                <span className="block text-[10px] font-black tracking-widest uppercase truncate">{user?.email}</span>
                <span className="block text-[8px] font-mono text-zinc-400 mt-0.5">{user?.role}</span>
              </div>
              <MenuDivider />
              {modules.map((m) => (
                <Link key={m.id} href={m.href} onClick={() => setActiveMenu(null)} className="w-full flex items-center px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all hover:bg-zinc-800 text-zinc-300">
                  <span className="opacity-50 mr-2"><MonitorIcon /></span> {m.label}
                </Link>
              ))}
              <MenuDivider />
              <button onClick={handleLogout} className="w-full flex items-center px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/20 text-red-400">
                <span className="opacity-70 mr-2"><LogoutIcon /></span> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      <ProjectManager isOpen={isProjectManagerOpen} onClose={() => setIsProjectManagerOpen(false)} />
      <CustomizeToolbarModal isOpen={isCustomizeOpen} onClose={() => setIsCustomizeOpen(false)} />
      <VersionHistoryDrawer isOpen={isVersionHistoryOpen} onClose={() => setIsVersionHistoryOpen(false)} />
    </header>
  );
};
