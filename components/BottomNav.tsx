
import React from 'react';
import { Home, Upload, PlusCircle, Search, Mic } from 'lucide-react';
import { ViewMode } from '../types';

interface BottomNavProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    { mode: 'dashboard', icon: Home, label: 'Home' },
    { mode: 'media-upload', icon: Upload, label: 'Upload' },
    { mode: 'roster', icon: PlusCircle, label: 'New' }, // "New" maps to Class Selection -> Roster
    { mode: 'search', icon: Search, label: 'Search' },
    { mode: 'live-agent', icon: Mic, label: 'AI Voice' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-50 shadow-lg pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        // live-agent is technically an overlay now, but we can highlight it if desired or keep standard nav behavior
        const isActive = currentView === item.mode;
        return (
          <button
            key={item.mode}
            onClick={() => onNavigate(item.mode as ViewMode)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
              isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-1 rounded-full ${isActive && item.mode === 'live-agent' ? 'bg-indigo-100' : ''}`}>
               <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
