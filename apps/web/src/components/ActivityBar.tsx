import React from 'react';
import {
  Files,
  Search,
  GitBranch,
  PlayCircle,
  Package,
  Bot,
  FolderKanban,
  Settings,
  Terminal,
  Network,
} from 'lucide-react';

export type ActivityTab =
  | 'explorer'
  | 'search'
  | 'git'
  | 'debug'
  | 'extensions'
  | 'agents'
  | 'projects'
  | 'terminal'
  | 'universal-apis'
  | 'settings';

interface ActivityBarProps {
  activeTab: ActivityTab | null;
  onSelectTab: (tab: ActivityTab) => void;
}

export function ActivityBar({ activeTab, onSelectTab }: ActivityBarProps) {
  const topItems: Array<{ id: ActivityTab; label: string; icon: React.ElementType }> = [
    { id: 'explorer', label: 'Explorer (Ctrl+Shift+E)', icon: Files },
    { id: 'search', label: 'Search in Workspace (Ctrl+Shift+F)', icon: Search },
    { id: 'git', label: 'Source Control & GitHub (Ctrl+Shift+G)', icon: GitBranch },
    { id: 'debug', label: 'Run & Testing (Ctrl+Shift+D)', icon: PlayCircle },
    { id: 'agents', label: 'Autonomous AI Agents', icon: Bot },
    { id: 'universal-apis', label: 'Universal API Manager', icon: Network },
    { id: 'projects', label: 'Project Generator', icon: FolderKanban },
    { id: 'terminal', label: 'Integrated Terminal', icon: Terminal },
    { id: 'extensions', label: 'AI Model Providers', icon: Package },
  ];

  return (
    <aside className="w-12 bg-[#181818] border-r border-[#2b2b2b] flex flex-col justify-between items-center py-2 select-none z-40">
      {/* Primary Activity Icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        {topItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={item.label}
              className={`relative w-full h-11 flex items-center justify-center transition-colors ${
                isActive
                  ? 'text-cyan-400 bg-[#252525]'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#202020]'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 bg-cyan-400 rounded-r" />
              )}
              <Icon className="w-5 h-5 stroke-[1.75]" />
            </button>
          );
        })}
      </div>

      {/* Bottom Settings Icon */}
      <div className="flex flex-col items-center w-full">
        <button
          onClick={() => onSelectTab('settings')}
          title="Settings (Ctrl+,)"
          className={`relative w-full h-11 flex items-center justify-center transition-colors ${
            activeTab === 'settings'
              ? 'text-cyan-400 bg-[#252525]'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#202020]'
          }`}
        >
          {activeTab === 'settings' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 bg-cyan-400 rounded-r" />
          )}
          <Settings className="w-5 h-5 stroke-[1.75]" />
        </button>
      </div>
    </aside>
  );
}
