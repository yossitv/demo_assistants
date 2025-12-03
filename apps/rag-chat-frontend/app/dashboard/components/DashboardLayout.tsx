'use client';

import React from 'react';
import { Sidebar, SidebarTab } from './Sidebar';

interface DashboardLayoutProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  sidebarOpen: boolean;
  onToggleSidebar: (open: boolean) => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  activeTab,
  onTabChange,
  sidebarOpen,
  onToggleSidebar,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="flex h-full">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            onTabChange(tab);
            onToggleSidebar(false);
          }}
          isOpen={sidebarOpen}
          onClose={() => onToggleSidebar(false)}
        />

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-white/90 backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onToggleSidebar(!sidebarOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Toggle navigation"
                aria-expanded={sidebarOpen}
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <p className="text-xs text-gray-500">RAG Chat Dashboard</p>
                <h1 className="text-xl font-semibold capitalize">{activeTab.replace('-', ' ')}</h1>
              </div>
            </div>
          </header>

          <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
