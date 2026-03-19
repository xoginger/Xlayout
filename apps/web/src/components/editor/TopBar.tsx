import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useEditorStore } from '@/store/editor-store';
import { ProjectManager } from './ProjectManager';

const NavMenuItem: React.FC<{ label: string; active?: boolean; onClick?: () => void }> = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-md transition-all text-[11px] font-black uppercase tracking-widest border border-transparent 
      ${active ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-100'}`}
  >
    {label}
  </button>
);

export const TopBar: React.FC = () => {
  const { 
    project, viewMode, setViewMode, 
    undo, redo, historyIndex, history, setProjectName,
    saveProject, createNewProject
  } = useEditorStore();

  const { user, logout } = useAuthStore();
  // Role matching based on frontend store model
  const isAdmin = user?.role === 'platform_admin' || user?.role === 'company_admin';

  const [isEditingName, setIsEditingName] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const router = useRouter();

  // Simple Autosave logic (runs every 60s if dirty)
  useEffect(() => {
    const timer = setInterval(() => {
      if (project.isDirty && project.id !== 'default') {
        saveProject().catch(console.error);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [project.isDirty, project.id, saveProject]);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleNew = () => {
    const name = prompt('ENTER PROJECT NAME:', 'NEW ARCHITECTURAL LAYOUT');
    if (name) createNewProject(name);
    setActiveMenu(null);
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-zinc-200 bg-white px-5 shrink-0 shadow-2xl z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 pr-6 border-r border-zinc-200">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-xl ring-2 ring-blue-500/20">X</div>
          <div className="flex flex-col leading-none">
            <span className="font-black tracking-tighter text-zinc-900 text-sm italic">XLAYOUT</span>
            <span className="text-zinc-400 font-black text-[9px] tracking-[0.4em] mt-0.5">PRO</span>
          </div>
        </div>
        
        <nav className="hidden items-center gap-2 md:flex relative">
          <div className="relative">
            <NavMenuItem label="File" active={activeMenu === 'file'} onClick={() => handleMenuClick('file')} />
            {activeMenu === 'file' && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[101] p-1.5 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2">
                <MenuAction label="New Project" icon={<PlusIcon />} onClick={handleNew} />
                <MenuAction label="Open Library" icon={<FolderIcon />} onClick={() => { setIsProjectManagerOpen(true); setActiveMenu(null); }} />
                <MenuDivider />
                <MenuAction label="Save Now" icon={<SaveIcon />} onClick={() => { saveProject(); setActiveMenu(null); }} disabled={!project.isDirty || project.isSaving} />
                <MenuAction label="Duplicate" onClick={() => setActiveMenu(null)} disabled />
              </div>
            )}
          </div>

          <div className="relative">
            <NavMenuItem label="Edit" active={activeMenu === 'edit'} onClick={() => handleMenuClick('edit')} />
            {activeMenu === 'edit' && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[101] p-1.5 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2">
                <MenuAction label="Undo" icon={<UndoIcon />} onClick={() => { undo(); setActiveMenu(null); }} />
                <MenuAction label="Redo" icon={<RedoIcon />} onClick={() => { redo(); setActiveMenu(null); }} />
                <MenuDivider />
                <MenuAction label="Delete Selected" icon={<TrashIcon />} onClick={() => { const id = useEditorStore.getState().selectedId; if (id) useEditorStore.getState().removeItem(id); setActiveMenu(null); }} />
              </div>
            )}
          </div>

          <NavMenuItem label="View" />

          {/* Role-based Dynamic Modules */}
          <div className="h-6 w-px bg-zinc-200 mx-2" />
          <NavMenuItem label="Editor" active />
          {isAdmin && (
            <>
              <NavMenuItem label="Admin" onClick={() => router.push('/admin/platform/overview')} />
              <NavMenuItem label="Dashboard" onClick={() => router.push('/admin/company/dashboard')} />
              <NavMenuItem label="Catálogo" onClick={() => router.push('/admin/company/catalog/products')} />
            </>
          )}
        </nav>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-4 bg-zinc-50 rounded-2xl p-1.5 border border-zinc-200 shadow-inner px-6">
           <button 
             onClick={undo} 
             disabled={historyIndex <= 0} 
             className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-blue-600 disabled:opacity-20 transition-all rounded-full hover:bg-white hover:shadow-sm"
             title="Undo (Ctrl+Z)"
           >
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
           </button>

           <div className="h-4 w-px bg-zinc-200 mx-2" />

           <div className="flex items-center gap-3 px-6 py-1.5 bg-white rounded-xl border border-zinc-200 shadow-sm transition-all hover:border-blue-300 group">
              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-lg ${
                project.isSaving ? 'bg-blue-500 animate-spin border-2 border-t-transparent border-white' :
                project.isDirty ? 'bg-amber-500 shadow-amber-500/50' : 'bg-emerald-500 shadow-emerald-500/50'
              }`}></span>
              {isEditingName ? (
                <input 
                  autoFocus
                  className="text-[11px] font-black text-zinc-900 outline-none w-40 bg-transparent uppercase tracking-wider"
                  value={project.name}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                />
              ) : (
                <span 
                  onClick={() => setIsEditingName(true)}
                  className="text-[11px] font-black text-zinc-900 cursor-pointer uppercase tracking-wider group-hover:text-blue-600 transition-colors"
                >
                  {project.name || 'UNTITLED PROJECT'}
                </span>
              )}
           </div>

           <div className="h-4 w-px bg-zinc-200 mx-2" />

           <button 
             onClick={redo} 
             disabled={historyIndex >= history.length - 1} 
             className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-blue-600 disabled:opacity-20 transition-all rounded-full hover:bg-white hover:shadow-sm"
             title="Redo (Ctrl+Y)"
           >
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="m15 14 5-5-5-5"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
           </button>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex bg-zinc-100/80 rounded-xl p-1 border border-zinc-200 overflow-hidden">
          <button 
            onClick={() => setViewMode('2D')}
            className={`px-5 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase ${viewMode === '2D' ? 'bg-white text-zinc-900 shadow-lg border border-zinc-200' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            2D
          </button>
          <button 
            onClick={() => setViewMode('3D')}
            className={`px-5 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase ${viewMode === '3D' ? 'bg-white text-zinc-900 shadow-lg border border-zinc-200' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            3D
          </button>
        </div>

        <button className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-2">
          <span>EXPORT</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
        </button>

        <div className="h-8 w-px bg-zinc-200 mx-1" />

        <button 
          onClick={() => { logout(); router.push('/login'); }}
          className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-50 transition-all border border-zinc-200"
          title="Cerrar Sesión"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </div>

      <ProjectManager isOpen={isProjectManagerOpen} onClose={() => setIsProjectManagerOpen(false)} />

      {/* Global Menu Close Overlay */}
      {activeMenu && <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenu(null)} />}
    </header>
  );
};

const MenuAction: React.FC<{ label: string; icon?: React.ReactNode; onClick: () => void; disabled?: boolean }> = ({ label, icon, onClick, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
      disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-zinc-50 text-zinc-900 group'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon && <span className="text-zinc-400 group-hover:text-blue-600 transition-colors">{icon}</span>}
      <span>{label}</span>
    </div>
  </button>
);

const MenuDivider = () => <div className="h-px bg-zinc-100 my-1 mx-2" />;

const PlusIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><path d="M5 12h14M12 5v14"/></svg>;
const FolderIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>;
const SaveIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const UndoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>;
const RedoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="m15 4 5 5-5 5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>;
const ImageIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
const BoxIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const PdfIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h3a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H9v6z"/></svg>;
