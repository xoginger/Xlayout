"use client";

import React from 'react';
import { TopBar } from '@/components/editor/TopBar';
import { LeftToolbar } from '@/components/editor/LeftToolbar';
import { CatalogPanel } from '@/components/editor/CatalogPanel';
import { Viewport } from '@/components/editor/Viewport';
import { RightInspector } from '@/components/editor/RightInspector';
import { BottomStatusBar } from '@/components/editor/BottomStatusBar';

export const EditorShell: React.FC = () => {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-300 font-sans selection:bg-blue-500/30">
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden relative">
        <LeftToolbar />
        <CatalogPanel />
        <Viewport />
        <RightInspector />
      </div>

      <BottomStatusBar />
    </div>
  );
};
