/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dash', icon: 'dashboard' },
    { id: 'telemetry', label: 'Telem', icon: 'speed' },
    { id: 'attitude', label: 'Attitude', icon: 'view_in_ar' },
    { id: 'charts', label: 'Charts', icon: 'monitoring' },
    { id: 'orbit', label: 'Orbit', icon: 'satellite_alt' },
    { id: 'console', label: 'Console', icon: 'terminal' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 sm:hidden bg-[#0A1020]/95 backdrop-blur-md border-t border-[#1E2A3F]">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[50px] h-11 rounded-lg transition-all ${
                isActive
                  ? 'text-[#22D3EE] font-bold'
                  : 'text-[#8B9BB4] hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-[19px] ${isActive ? 'scale-110 text-[#22D3EE]' : ''}`}>
                {tab.icon}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
