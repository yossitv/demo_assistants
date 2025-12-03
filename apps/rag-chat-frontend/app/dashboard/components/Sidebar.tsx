'use client';

import React from 'react';

export type SidebarTab = 'chat' | 'vector-knowledge' | 'agents' | 'api-keys';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

const tabs: Array<{ id: SidebarTab; label: string; description: string; icon: React.ReactNode }> = [
  {
    id: 'chat',
    label: 'Chat',
    description: 'Chat with your agents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    id: 'vector-knowledge',
    label: 'Vector Knowledge',
    description: 'Manage knowledge spaces',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
      </svg>
    ),
  },
  {
    id: 'agents',
    label: 'Agents',
    description: 'Create and manage agents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 10-6 0 3 3 0 006 0z" />
      </svg>
    ),
  },
  {
    id: 'api-keys',
    label: 'API Keys',
    description: 'API key & curl examples',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
      </svg>
    ),
  },
];

export function Sidebar({ activeTab, onTabChange, isOpen, onClose }: SidebarProps) {
  return (
    <>
      <aside
        className={`fixed z-40 top-14 bottom-0 left-0 w-72 bg-white border-r border-gray-200 shadow-sm transition-transform duration-200 ${
          isOpen ? 'translate-x-0 md:translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        aria-label="Sidebar navigation"
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-5 border-b border-gray-200">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">assistants</p>
              <p className="text-lg font-semibold text-gray-900">Controls</p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2" aria-label="Dashboard sections">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50 text-gray-800'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-md ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}
                      aria-hidden="true"
                    >
                      {tab.icon}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{tab.label}</p>
                      <p className="text-xs text-gray-500">{tab.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
