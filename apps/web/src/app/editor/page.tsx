"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the editor shell to prevent SSR issues with Three.js and Zustand
const EditorShell = dynamic(() => import('@/components/editor/EditorShell').then(mod => mod.EditorShell), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-white text-zinc-400 font-mono text-xs tracking-widest uppercase animate-pulse">
      Initializing XLayout Studio...
    </div>
  )
});

export default function EditorPage() {
  return (
    <div className="bg-white min-h-screen">
      <EditorShell />
    </div>
  );
}
