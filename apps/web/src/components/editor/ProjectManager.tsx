"use client";

import React, { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { projectService, ProjectListing } from '@/services/project-service';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ isOpen, onClose }) => {
  const { loadProject, project: currentProject } = useEditorStore();
  const [projects, setProjects] = useState<ProjectListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.listProjects();
      setProjects(data);
      setError(null);
    } catch (e) {
      setError('Failed to load projects');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const handleOpen = async (id: string) => {
    try {
      await loadProject(id);
      onClose();
    } catch (e) {
      alert('Error opening project');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectService.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (e) {
      alert('Error deleting project');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await projectService.duplicateProject(id);
      fetchProjects();
    } catch (e) {
      alert('Error duplicating project');
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.description?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
        <header className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-zinc-900 uppercase italic">Project Manager</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Manage your design repository</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md transition-all text-zinc-400 hover:text-zinc-900 border border-transparent hover:border-zinc-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="flex gap-4 mb-8">
            <div className="flex-1 relative group">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input 
                placeholder="SEARCH PROJECTS..."
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-[11px] font-black uppercase tracking-widest transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase">Indexing Catalog...</span>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8"><path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
              <span className="text-xs font-bold uppercase tracking-widest">{error}</span>
              <button onClick={fetchProjects} className="mt-4 text-[10px] font-black text-blue-600 hover:underline tracking-widest uppercase">Try Again</button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-400 gap-4 border-2 border-dashed border-zinc-100 rounded-3xl">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 opacity-20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/></svg>
               <span className="text-[10px] font-black tracking-[0.2em] uppercase">No projects found</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredProjects.map(proj => (
                <div 
                  key={proj.id}
                  className={`group flex items-center justify-between p-5 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-0.5 ${
                    currentProject.id === proj.id 
                      ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-500/10' 
                      : 'bg-white border-zinc-100 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
                      currentProject.id === proj.id ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-400 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M9 9h6v6H9z"/></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-zinc-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors flex items-center gap-2">
                        {proj.name}
                        {currentProject.id === proj.id && <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black tracking-[0.1em]">ACTIVE</span>}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-1 uppercase tracking-widest">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                          {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 flex items-center gap-1 uppercase tracking-widest">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M6.5 18H20"/></svg>
                          {proj._count.versions} Versions
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleDuplicate(proj.id)}
                      className="p-2.5 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-zinc-200 text-zinc-400 hover:text-blue-600 transition-all"
                      title="Duplicate"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><rect width="13" height="13" x="9" y="9" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(proj.id)}
                      className="p-2.5 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-zinc-200 text-zinc-400 hover:text-red-500 transition-all"
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                    </button>
                    <button 
                      onClick={() => handleOpen(proj.id)}
                      className="ml-2 px-6 py-2.5 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
            Logged as Developer · Project Cloud Sync Active
          </p>
          <button 
            onClick={() => {
              const name = prompt('Enter project name', 'New Architectural Layout');
              if (name) useEditorStore.getState().createNewProject(name).then(onClose);
            }}
            className="px-8 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M5 12h14M12 5v14"/></svg>
            Create New
          </button>
        </footer>
      </div>
    </div>
  );
};
