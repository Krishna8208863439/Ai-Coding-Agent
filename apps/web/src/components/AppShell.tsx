import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderPlus,
  Bot,
  Terminal,
  Cpu,
  Library,
  FolderTree,
  GitBranch,
  Settings,
  Code2,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@nexora/ui';

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  phaseRequired?: number;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'New Project', to: '/new-project', icon: FolderPlus, phaseRequired: 5 },
  { name: 'AI Workspace', to: '/workspace', icon: Code2, phaseRequired: 7 },
  { name: 'AI Agents', to: '/agents', icon: Bot, phaseRequired: 6 },
  { name: 'API Manager', to: '/api-manager', icon: Cpu },
  { name: 'Model Library', to: '/models', icon: Library },
  { name: 'Project Explorer', to: '/explorer', icon: FolderTree, phaseRequired: 5 },
  { name: 'Terminal', to: '/terminal', icon: Terminal, phaseRequired: 8 },
  { name: 'GitHub', to: '/github', icon: GitBranch, phaseRequired: 10 },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#090a0f] text-neutral-200 overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#1f2433] bg-[#0d0f17] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#1f2433] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20">
              <span className="font-bold text-white text-lg tracking-wider">N</span>
            </div>
            <div>
              <span className="font-bold tracking-tight text-white">NEXORA</span>
              <span className="ml-1 text-xs font-semibold text-indigo-400">AI</span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Phase Indicator */}
        <div className="border-b border-[#1f2433] px-4 py-3 bg-[#131620]/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Platform Stage</span>
            <Badge variant="info">Phase 3 Active</Badge>
          </div>
          <p className="mt-1 text-[11px] text-neutral-400 leading-tight">
            API Manager & Model Library Architecture
          </p>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isFuture = !!item.phaseRequired && item.phaseRequired > 1;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                      : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                  } ${isFuture ? 'opacity-85' : ''}`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {isFuture && (
                  <span className="rounded bg-neutral-800/80 px-1.5 py-0.5 text-[10px] text-neutral-400">
                    Phase {item.phaseRequired}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Security & System Status */}
        <div className="border-t border-[#1f2433] p-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Strict Sandbox Isolation</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            Node 22 / Postgres / Docker Architecture
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-[#1f2433] bg-[#0d0f17]/80 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-sm font-medium text-neutral-400">Environment: </span>
              <span className="text-sm text-neutral-200">Local Monorepo Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Core System Operational</span>
            </div>
          </div>
        </header>

        {/* Outlet View */}
        <main className="flex-1 overflow-y-auto bg-[#090a0f] p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

