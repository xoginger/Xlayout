/**
 * Creado y diseñado por XO
 */
import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editor-store';
import { projectService } from '../../services/project-service';

export function VersionHistoryDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { project, restoreVersion } = useEditorStore();
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && project.id && project.id !== 'default') {
      setLoading(true);
      projectService.getVersions(project.id)
        .then(setVersions)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, project.id]);

  if (!isOpen) return null;

  const handleRestore = async (version: any) => {
    if (window.confirm('¿Estás seguro de que quieres restaurar esta versión? Se creará una nueva versión derivada de esta, preservando el historial actual.')) {
      setRestoringId(version.id);
      try {
        await restoreVersion(version.id);
        onClose();
      } catch (err) {
        alert('Error al restaurar la versión');
      } finally {
        setRestoringId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Drawer */}
      <div className="relative ml-auto w-96 h-full bg-white shadow-2xl flex flex-col border-l border-zinc-200 transform transition-transform animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-black uppercase tracking-widest text-zinc-900">Historial de Versiones</h2>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">{project.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-400 gap-3 text-[10px] uppercase font-black tracking-widest">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle className="opacity-25" cx="12" cy="12" r="10"/><path className="opacity-75" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"/></svg>
              Cargando historial...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center text-zinc-400 text-[11px] mt-10">No hay versiones guardadas en la nube aún.</div>
          ) : (
             <div className="relative border-l-2 border-zinc-100 ml-3 pl-5 space-y-6">
               {versions.map((ver, idx) => {
                 const isLatest = idx === 0;
                 const isAuto = ver.saveMode === 'autosave';
                 const summary = ver.summary || {};
                 const d = new Date(ver.createdAt);
                 
                 return (
                   <div key={ver.id} className="relative group">
                     {/* Dot */}
                     <span className={`absolute -left-[27px] w-3 h-3 rounded-full border-2 border-white ring-2 z-10 ${
                        isLatest ? 'bg-blue-500 ring-blue-100' : isAuto ? 'bg-zinc-300 ring-zinc-50' : 'bg-zinc-500 ring-zinc-100'
                     }`} />
                     
                     {/* Card */}
                     <div className={`p-3 rounded-lg border transition-all ${isLatest ? 'border-blue-200 bg-blue-50/50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
                       
                       <div className="flex items-start justify-between mb-2">
                         <div>
                           <div className="flex items-center gap-2">
                             <span className="text-[11px] font-black text-zinc-900 tracking-wide">
                               {d.toLocaleDateString()} a las {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                             {isLatest && <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Actual</span>}
                           </div>
                           <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mt-1 flex items-center gap-1.5">
                             {isAuto ? (
                               <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Automático</>
                             ) : (
                               <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Manual</>
                             )}
                             <span className="opacity-50 mx-1">|</span>
                             v{ver.versionNum}
                           </div>
                         </div>
                       </div>

                       <div className="text-[10px] font-medium text-zinc-600 bg-zinc-50 px-2 py-1.5 rounded flex gap-3">
                         <span><strong className="text-zinc-900">{summary.totalItems || 0}</strong> items</span>
                         <span><strong className="text-zinc-900">{summary.totalWalls || 0}</strong> muros</span>
                         {ver.sceneHash && <span className="text-zinc-400 font-mono ml-auto">[{ver.sceneHash.slice(0,6)}]</span>}
                       </div>

                       {!isLatest && (
                          <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-end">
                            <button 
                              onClick={() => handleRestore(ver)}
                              disabled={restoringId !== null}
                              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              {restoringId === ver.id ? (
                                'Restaurando...'
                              ) : (
                                <>
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                  Restaurar Versión
                                </>
                              )}
                            </button>
                          </div>
                       )}

                     </div>
                   </div>
                 );
               })}
             </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
