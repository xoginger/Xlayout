"use client";

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

const EditorShell = dynamic(() => import('@/components/editor/EditorShell').then(mod => mod.EditorShell), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-white text-zinc-400 font-mono text-xs tracking-widest uppercase animate-pulse">
      Initializing XLayout Studio...
    </div>
  )
});

export default function EditorPage() {
  const router = useRouter();
  const { isAuthenticated, fetchMe, isLoading, user } = useAuthStore();

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

  if (!isAuthenticated) return null;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-zinc-400 font-mono text-xs tracking-widest uppercase animate-pulse">
        Loading User Context...
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <EditorShell />
    </div>
  );
}
