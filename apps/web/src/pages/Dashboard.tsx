import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button } from '@nexora/ui';
import {
  Layers,
  Cpu,
  Shield,
  Code2,
  Sparkles,
  ArrowRight,
  Terminal,
  Activity,
  FolderGit2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PhaseState {
  activePhase: number;
  phaseName: string;
  allPhases: Array<{ phase: number; name: string; status: string }>;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [phaseInfo, setPhaseInfo] = useState<PhaseState | null>(null);

  useEffect(() => {
    fetch('/api/phases')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPhaseInfo(data);
      })
      .catch(() => {
        // Fallback Phase 1 state
        setPhaseInfo({
          activePhase: 1,
          phaseName: 'Foundation and UI Architecture',
          allPhases: [
            { phase: 1, name: 'Foundation and UI', status: 'ACTIVE' },
            { phase: 2, name: 'Authentication and Database', status: 'LOCKED' },
            { phase: 3, name: 'API Manager and Model Library', status: 'LOCKED' },
            { phase: 4, name: 'AI Chat and Streaming', status: 'LOCKED' },
            { phase: 5, name: 'Project Generation', status: 'LOCKED' },
            { phase: 6, name: 'Multi-Agent Orchestration', status: 'LOCKED' },
            { phase: 7, name: 'Advanced IDE', status: 'LOCKED' },
            { phase: 8, name: 'Sandbox and Execution', status: 'LOCKED' },
            { phase: 9, name: 'Testing and Debugging', status: 'LOCKED' },
            { phase: 10, name: 'GitHub, Export and Production', status: 'LOCKED' },
          ],
        });
      });
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/40 via-[#0d0f17] to-[#090a0f] p-6 lg:p-8">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Phase 1 Foundation</Badge>
            <Badge variant="outline">Antigravity & Cursor Inspired</Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            NEXORA AI Software Development Platform
          </h1>
          <p className="max-w-3xl text-sm sm:text-base text-neutral-300">
            Autonomous multi-agent software engineering environment. Architect, Developer,
            Debugger, Tester, UI/UX, Security, and Project Manager agents operating in synchronized
            coordination inside sandboxed Docker containers.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => navigate('/api-manager')}
              className="gap-2"
            >
              <span>Explore Provider Hub</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/workspace')}
              className="gap-2"
            >
              <Code2 className="h-4 w-4" />
              <span>IDE Workspace</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-600/20 p-2.5 text-indigo-400">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Multi-Provider Hub</CardTitle>
                <CardDescription>OpenAI, Anthropic, Gemini, Groq, Ollama</CardDescription>
              </div>
            </div>
          </CardHeader>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Provider abstraction layer with AES-256-GCM credential vault, live model discovery, and
            dynamic runtime switching.
          </p>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-600/20 p-2.5 text-violet-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Autonomous Agents</CardTitle>
                <CardDescription>7 Autonomous Engineering Roles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Architect, Developer, Debugger, Tester, UI/UX, Security, and Project Manager agents
            collaborating over shared workspace state.
          </p>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-600/20 p-2.5 text-emerald-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Isolated Sandbox</CardTitle>
                <CardDescription>Dockerized PTY Execution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Secure containerized runners for Node.js, Python, and Java with non-root execution,
            resource limits, and live preview proxy.
          </p>
        </Card>
      </div>

      {/* Controlled Phase Roadmap */}
      <div className="rounded-xl border border-[#1f2433] bg-[#0d0f17] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-[#1f2433]">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              10 Controlled Development Phases
            </h2>
            <p className="text-xs text-neutral-400">
              Strict phase gating with automated acceptance checks and user approval.
            </p>
          </div>
          <Badge variant="success">Strict Phase Gating</Badge>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {phaseInfo?.allPhases.map((phase) => {
            const isCurrent = phase.phase === 1;
            return (
              <div
                key={phase.phase}
                className={`flex items-center justify-between rounded-lg border p-3.5 transition-colors ${
                  isCurrent
                    ? 'border-indigo-500/50 bg-indigo-950/20'
                    : 'border-[#1f2433] bg-[#131620]/40 opacity-75'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    P{phase.phase}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-neutral-200">
                      {phase.name}
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      {isCurrent ? 'Under active verification' : `Requires Phase ${phase.phase} approval`}
                    </p>
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <Badge variant="info">Active</Badge>
                  ) : (
                    <Badge variant="outline">Phase {phase.phase}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Architecture Verification Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#1f2433] bg-[#0d0f17] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200 mb-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h3>Monorepo Modules</h3>
          </div>
          <ul className="text-xs space-y-1 text-neutral-400 font-mono">
            <li>• apps/web (React 18 + Vite + Tailwind + App Shell)</li>
            <li>• apps/api (Express + TypeScript + Pino logging)</li>
            <li>• packages/shared (Shared types & system health)</li>
            <li>• packages/ui (Button, Card, Badge, Theme design tokens)</li>
          </ul>
        </div>

        <div className="rounded-xl border border-[#1f2433] bg-[#0d0f17] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200 mb-2">
            <FolderGit2 className="h-4 w-4 text-indigo-400" />
            <h3>System Documentation</h3>
          </div>
          <ul className="text-xs space-y-1 text-neutral-400">
            <li>• docs/ARCHITECTURE.md — System modularity and boundary specs</li>
            <li>• docs/DECISIONS.md — Architectural Decision Records (ADRs)</li>
            <li>• docs/SECURITY.md — Sandbox isolation and credential encryption</li>
            <li>• docs/API.md — REST endpoints & WebSocket protocol</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

