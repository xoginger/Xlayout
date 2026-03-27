/**
 * Creado y diseñado por XO
 */
"use client";

import dynamic from 'next/dynamic';
import React, { useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useEditorStore } from '@/store/editor-store';

const EditorShell = dynamic(() => import('@/components/editor/EditorShell').then(mod => mod.EditorShell), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-white text-zinc-400 font-mono text-xs tracking-widest uppercase animate-pulse">
      Initializing XLayout Studio...
    </div>
  )
});

function EditorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { isAuthenticated, fetchMe, isLoading, user } = useAuthStore();
  const { loadProject, project } = useEditorStore();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Load full context (permissions, tenants) if not already loaded
    if (!user) {
      fetchMe();
    }
  }, [isAuthenticated, user, fetchMe, router]);

  // Si hay projectId en la URL, cargar el proyecto
  useEffect(() => {
    if (user && projectId && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      // Solo cargamos si es distinto al que ya está en memoria (evita re-loads raros)
      if (project.id !== projectId) {
        loadProject(projectId).catch(err => {
          console.error("Error cargando proyecto desde URL:", err);
          alert("No se pudo cargar el proyecto solicitado.");
        });
      }
    }
  }, [user, projectId, loadProject, project.id]);

  if (!isAuthenticated) return null;

  if (isLoading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white text-zinc-400 font-mono text-xs tracking-widest uppercase animate-pulse">
        Loading User Context...
      </div>
    );
  }

  return <EditorShell />;
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center bg-white text-zinc-400 font-mono text-xs tracking-widest uppercase animate-pulse">
        Initializing...
      </div>
    }>
      <EditorPageContent />
    </Suspense>
  );
}
