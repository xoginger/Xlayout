"use client";

import React from 'react';
import { Sidebar, SidebarType } from './Sidebar';
import { Header } from './Header';

interface AdminLayoutProps {
  children: React.ReactNode;
  type: SidebarType;
  title: string;
}

export const AdminLayout = ({ children, type, title }: AdminLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar type={type} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
