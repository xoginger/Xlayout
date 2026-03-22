/**
 * Creado y diseñado por XO
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { EDITOR_TOOLS_META, EditorToolConfig } from './tools.config';

interface CustomizeToolbarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomizeToolbarModal: React.FC<CustomizeToolbarModalProps> = ({ isOpen, onClose }) => {
  const { user, updatePreferences } = useAuthStore();
  const [tools, setTools] = useState<EditorToolConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const customOrder = user?.preferences?.toolbarOrder as string[] | undefined;
      const baseTools = EDITOR_TOOLS_META.filter(t => t.group !== 'system');
      
      if (customOrder && Array.isArray(customOrder) && customOrder.length > 0) {
        const orderMap = new Map(customOrder.map((id, index) => [id, index]));
        const ordered = [...baseTools].sort((a, b) => {
          const aIndex = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999 + a.defaultOrder;
          const bIndex = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999 + b.defaultOrder;
          return aIndex - bIndex;
        });
        setTools(ordered);
      } else {
        setTools([...baseTools].sort((a, b) => a.defaultOrder - b.defaultOrder));
      }
    }
  }, [isOpen, user?.preferences?.toolbarOrder]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newTools = [...tools];
    const temp = newTools[index - 1];
    newTools[index - 1] = newTools[index];
    newTools[index] = temp;
    setTools(newTools);
  };

  const moveDown = (index: number) => {
    if (index === tools.length - 1) return;
    const newTools = [...tools];
    const temp = newTools[index + 1];
    newTools[index + 1] = newTools[index];
    newTools[index] = temp;
    setTools(newTools);
  };

  const resetToDefault = () => {
    const baseTools = EDITOR_TOOLS_META.filter(t => t.group !== 'system');
    setTools([...baseTools].sort((a, b) => a.defaultOrder - b.defaultOrder));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const newOrder = tools.map(t => t.id);
    await updatePreferences({ toolbarOrder: newOrder });
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Personalizar Herramientas</h2>
            <p className="text-sm text-zinc-500">Reordena las herramientas a tu gusto.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-2 bg-zinc-50/50">
          <div className="space-y-1">
            {tools.map((tool, idx) => (
              <div key={tool.id} className="flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-lg shadow-sm hover:border-blue-400 transition-colors">
                <div className="text-zinc-400 cursor-grab active:cursor-grabbing hover:text-zinc-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-800">{tool.label}</span>
                    {tool.shortcut && <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded font-mono font-bold tracking-widest">{tool.shortcut}</span>}
                  </div>
                  <span className="text-xs text-zinc-400 truncate">{tool.description}</span>
                </div>

                <div className="flex flex-col gap-1 items-center justify-center ml-2 border-l border-zinc-100 pl-3">
                  <button 
                    onClick={() => moveUp(idx)} 
                    disabled={idx === 0}
                    className="text-zinc-400 hover:text-blue-600 disabled:opacity-30 p-0.5 rounded hover:bg-zinc-100 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                  </button>
                  <button 
                    onClick={() => moveDown(idx)} 
                    disabled={idx === tools.length - 1}
                    className="text-zinc-400 hover:text-blue-600 disabled:opacity-30 p-0.5 rounded hover:bg-zinc-100 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie de página */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-white flex items-center justify-between">
          <button 
            onClick={resetToDefault}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
          >
            Restablecer por defecto
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
            >
              {isSaving ? 'Guardando...' : 'Guardar Preferencias'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
