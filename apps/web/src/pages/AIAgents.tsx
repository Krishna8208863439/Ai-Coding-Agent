import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, Badge, Button } from '@nexora/ui';
import { useAuthStore } from '../store/authStore';
import {
  Bot,
  Play,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  RefreshCw,
  Terminal,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface AgentRoleItem {
  role: string;
  name: string;
  description: string;
  allowedTools: string[];
}

interface AgentRunItem {
  id: string;
  projectId: string;
  prompt: string;
  status: string;
  activeAgent: string;
  stepCount: number;
  steps: Array<{
    id: string;
    agentRole: string;
    thought: string;
    action: string;
    output: string;
    status: string;
  }>;
}

export function AIAgents() {
  const { accessToken } = useAuthStore();
  const [roles, setRoles] = useState<AgentRoleItem[]>([]);
  const [runs, setRuns] = useState<AgentRunItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRunItem | null>(null);
  const [prompt, setPrompt] = useState('Build complete patient vitals monitoring telemetry module with alerting');
  const [isStarting, setIsStarting] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchRolesAndRuns = async () => {
    try {
      setLoading(true);
      const [roleRes, runRes] = await Promise.all([
        fetch('/api/agents/roles'),
        accessToken
          ? fetch('/api/agents/runs', { headers: { Authorization: `Bearer ${accessToken}` } })
          : Promise.resolve(null),
      ]);

      if (roleRes.ok) {
        const data = await roleRes.json();
        setRoles(data.roles || []);
      }

      if (runRes && runRes.ok) {
        const data = await runRes.json();
        setRuns(data.runs || []);
        if (data.runs?.length > 0 && !selectedRun) {
          setSelectedRun(data.runs[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndRuns();
  }, [accessToken]);

  const handleTriggerRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      alert('Please log in under Settings before triggering autonomous agent sequences.');
      return;
    }

    try {
      setIsStarting(true);
      // Fetch user projects to get primary projectId
      const projRes = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const projData = await projRes.json();
      const targetProjectId = projData.projects?.[0]?.id;

      if (!targetProjectId) {
        alert('Please create at least one project under "New Project" first.');
        return;
      }

      const res = await fetch('/api/agents/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          projectId: targetProjectId,
          prompt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedRun(data.run);
        fetchRolesAndRuns();
      }
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2433] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-400" />
            Autonomous AI Multi-Agent System
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            7 synchronized engineering roles operating in sequence with human-in-the-loop approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">Architect → Developer → Tester → Security</Badge>
        </div>
      </div>

      {/* 7 Engineering Roles Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {roles.map((r) => (
          <div
            key={r.role}
            className="flex flex-col justify-between rounded-xl border border-[#1f2433] bg-[#0d0f17] p-3 text-center"
          >
            <div>
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                <Cpu className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-semibold text-white truncate">{r.name}</h4>
              <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">{r.description}</p>
            </div>
            <div className="mt-2 pt-2 border-t border-[#1f2433]">
              <span className="text-[9px] font-mono text-neutral-500">{r.allowedTools.length} Tools</span>
            </div>
          </div>
        ))}
      </div>

      {/* Trigger Autonomous Run Card */}
      <Card>
        <CardHeader>
          <CardTitle>Autonomous Pipeline Runner</CardTitle>
          <CardDescription>Dispatch the multi-agent team to execute an engineering task</CardDescription>
        </CardHeader>
        <form onSubmit={handleTriggerRun} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Engineering Objective</label>
            <input
              type="text"
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Build diagnostic test suite and review API endpoints for JWT vulnerability..."
              className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Step limits and destructive action gates enforced</span>
            </div>
            <Button variant="primary" type="submit" size="sm" disabled={isStarting} className="gap-1.5">
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{isStarting ? 'Dispatching Agents...' : 'Dispatch Autonomous Team'}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Execution Timeline & Steps Viewer */}
      {selectedRun && (
        <div className="rounded-xl border border-[#1f2433] bg-[#0d0f17] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2433] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">Active Run: {selectedRun.id}</span>
                <Badge variant={selectedRun.status === 'COMPLETED' ? 'success' : 'info'}>
                  {selectedRun.status}
                </Badge>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">Objective: {selectedRun.prompt}</p>
            </div>
            <span className="font-mono text-xs text-neutral-400">{selectedRun.steps?.length || 0} Steps Executed</span>
          </div>

          {/* Steps Timeline */}
          <div className="space-y-4">
            {selectedRun.steps?.map((step, idx) => (
              <div
                key={step.id || idx}
                className="relative pl-6 border-l-2 border-indigo-500/40 space-y-2 pb-2"
              >
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-indigo-600 border-2 border-[#0d0f17]" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300">
                    Agent [{step.agentRole}]
                  </span>
                  <Badge variant="outline" className="text-[10px]">{step.action}</Badge>
                </div>

                <div className="rounded-lg bg-[#090a0f] p-3 text-xs space-y-2">
                  <p className="text-neutral-300 italic">"{step.thought}"</p>
                  <div className="pt-2 border-t border-[#1f2433] font-mono text-[11px] text-emerald-400">
                    Output: {step.output}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

