import { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Bug,
  Lightbulb,
  FileCode,
  Shield,
  Layers,
  ChevronRight,
  Terminal,
} from 'lucide-react';

interface TestCase {
  id: string;
  name: string;
  suite?: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  errorMsg?: string;
  stackTrace?: string;
}

interface TestRun {
  id: string;
  projectId: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';
  framework: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  createdAt: string;
  cases: TestCase[];
}

interface DebugResult {
  id: string;
  errorMsg: string;
  stackTrace?: string;
  suggestion: string;
  createdAt: string;
}

export function TestingDashboard() {
  const [projectId, setProjectId] = useState('demo-project');
  const [framework, setFramework] = useState('vitest');
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'runs' | 'debug' | 'coverage'>('runs');

  // Debug Assistant state
  const [debugError, setDebugError] = useState('');
  const [debugStack, setDebugStack] = useState('');
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  // Fetch runs
  const fetchRuns = async () => {
    try {
      const res = await fetch(`/api/testing/runs?projectId=${projectId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
        if (data.runs?.length > 0 && !selectedRun) {
          setSelectedRun(data.runs[0]);
        }
      }
    } catch {
      // Backend not yet running or mock mode
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [projectId]);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/testing/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, framework }),
      });
      if (res.ok) {
        const run: TestRun = await res.json();
        setRuns((prev) => [run, ...prev]);
        setSelectedRun(run);
      }
    } catch (err) {
      console.error('Failed to trigger test run:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAnalyzeError = async () => {
    if (!debugError.trim()) return;
    setIsDebugging(true);
    try {
      const res = await fetch('/api/testing/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, errorMsg: debugError, stackTrace: debugStack }),
      });
      if (res.ok) {
        const data: DebugResult = await res.json();
        setDebugResult(data);
      }
    } catch (err) {
      console.error('Debug analysis failed:', err);
    } finally {
      setIsDebugging(false);
    }
  };

  const statusBadge = (status: TestRun['status']) => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" /> FAILED
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RotateCcw className="w-3.5 h-3.5 animate-spin" /> RUNNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Bug className="w-6 h-6" />
            </div>
            Testing & Debugging Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Automated test orchestration, test-case analytics, and intelligent root-cause diagnosis.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-3">
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="vitest">Vitest (Node/React)</option>
            <option value="pytest">Pytest (Python)</option>
            <option value="jest">Jest (JavaScript)</option>
          </select>

          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Project ID"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 w-36"
          />

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" /> Running Suite...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Run Tests
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800 space-x-6 text-sm">
        <button
          onClick={() => setActiveTab('runs')}
          className={`pb-3 font-medium transition-colors ${
            activeTab === 'runs'
              ? 'border-b-2 border-indigo-500 text-indigo-400'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Test Runs & Cases
        </button>
        <button
          onClick={() => setActiveTab('debug')}
          className={`pb-3 font-medium transition-colors ${
            activeTab === 'debug'
              ? 'border-b-2 border-indigo-500 text-indigo-400'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          AI Debug Assistant
        </button>
      </div>

      {/* Tab 1: Runs & Test Cases */}
      {activeTab === 'runs' && (
        <div className="grid grid-cols-12 gap-6 flex-1 min-h-[500px]">
          {/* Runs Sidebar (4 cols) */}
          <div className="col-span-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center justify-between">
              <span>Run History</span>
              <span className="text-xs text-zinc-500 font-normal">{runs.length} runs</span>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {runs.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  <Play className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No test runs yet.
                  <div className="text-xs text-zinc-600 mt-1">Click "Run Tests" to launch a suite.</div>
                </div>
              ) : (
                runs.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRun(r)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRun?.id === r.id
                        ? 'bg-zinc-800/80 border-indigo-500/50 shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      {statusBadge(r.status)}
                      <span className="text-xs text-zinc-500">
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      <span className="uppercase text-zinc-500 font-mono text-[11px]">{r.framework}</span>
                      <span>•</span>
                      <span>{r.totalTests} tests</span>
                      <span>•</span>
                      <span>{r.durationMs}ms</span>
                    </div>

                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-emerald-400 font-medium">✓ {r.passed}</span>
                      {r.failed > 0 && <span className="text-red-400 font-medium">✗ {r.failed}</span>}
                      {r.skipped > 0 && <span className="text-zinc-500 font-medium">○ {r.skipped}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Run Detail & Cases (8 cols) */}
          <div className="col-span-8 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 flex flex-col space-y-4">
            {selectedRun ? (
              <>
                {/* Run Summary Banner */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-white">Run Summary</h2>
                      {statusBadge(selectedRun.status)}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 flex items-center gap-4">
                      <span>Project: <strong className="text-zinc-300 font-mono">{selectedRun.projectId}</strong></span>
                      <span>Framework: <strong className="text-zinc-300 uppercase font-mono">{selectedRun.framework}</strong></span>
                      <span>Duration: <strong className="text-zinc-300 font-mono">{selectedRun.durationMs}ms</strong></span>
                    </div>
                  </div>

                  {/* Stat Blocks */}
                  <div className="flex gap-4">
                    <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                      <div className="text-lg font-bold text-emerald-400">{selectedRun.passed}</div>
                      <div className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Passed</div>
                    </div>
                    <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                      <div className="text-lg font-bold text-red-400">{selectedRun.failed}</div>
                      <div className="text-[10px] text-red-500 font-medium uppercase tracking-wider">Failed</div>
                    </div>
                    <div className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-center">
                      <div className="text-lg font-bold text-zinc-300">{selectedRun.skipped}</div>
                      <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Skipped</div>
                    </div>
                  </div>
                </div>

                {/* Test Cases List */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Test Cases</h3>
                  {selectedRun.cases.length === 0 ? (
                    <div className="text-sm text-zinc-500 py-6 text-center">No individual test cases parsed from output.</div>
                  ) : (
                    selectedRun.cases.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-lg border text-sm flex flex-col space-y-1.5 ${
                          c.status === 'PASSED'
                            ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-200'
                            : c.status === 'FAILED'
                            ? 'bg-red-950/20 border-red-900/40 text-red-200'
                            : 'bg-zinc-900/40 border-zinc-800/40 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {c.status === 'PASSED' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                            {c.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                            {c.status === 'SKIPPED' && <AlertCircle className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                            <span className="font-mono text-xs text-zinc-400">[{c.suite || 'test'}]</span>
                            <span className="font-medium text-xs">{c.name}</span>
                          </div>
                          <span className="text-xs text-zinc-500 font-mono">{c.durationMs}ms</span>
                        </div>

                        {c.errorMsg && (
                          <div className="text-xs text-red-400 font-mono bg-red-950/40 p-2 rounded border border-red-900/30">
                            {c.errorMsg}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Raw Console Output */}
                <div className="border-t border-zinc-800 pt-3">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 font-medium select-none flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-zinc-500" /> Raw stdout / stderr
                    </summary>
                    <pre className="mt-2 p-3 bg-zinc-950 rounded-lg text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-48 border border-zinc-850">
                      {selectedRun.stdout || selectedRun.stderr || 'No output recorded.'}
                    </pre>
                  </details>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                <FileCode className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Select a test run from the history to view details.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: AI Debug Assistant */}
      {activeTab === 'debug' && (
        <div className="grid grid-cols-12 gap-6 flex-1 min-h-[500px]">
          {/* Input Panel (6 cols) */}
          <div className="col-span-6 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 flex flex-col space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bug className="w-5 h-5 text-indigo-400" /> Error Diagnostics
            </h2>
            <p className="text-xs text-zinc-400">
              Paste an error message or stack trace to receive an instant root-cause analysis and actionable fix recommendations.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Error Message</label>
              <input
                type="text"
                value={debugError}
                onChange={(e) => setDebugError(e.target.value)}
                placeholder="e.g. TypeError: Cannot read property 'map' of undefined"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1 flex-1 flex flex-col">
              <label className="text-xs font-semibold text-zinc-300">Stack Trace (optional)</label>
              <textarea
                value={debugStack}
                onChange={(e) => setDebugStack(e.target.value)}
                placeholder="at handleRequest (src/app.ts:42:15)&#10;at Layer.handle [as handle_request] (node_modules/express/lib/router/layer.js:95:5)"
                className="flex-1 min-h-[160px] bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              onClick={handleAnalyzeError}
              disabled={isDebugging || !debugError.trim()}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
            >
              {isDebugging ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" /> Diagnosing Root Cause...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" /> Diagnose Error
                </>
              )}
            </button>
          </div>

          {/* Analysis Result (6 cols) */}
          <div className="col-span-6 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 flex flex-col space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" /> Root-Cause Analysis & Fix
            </h2>

            {debugResult ? (
              <div className="space-y-4 flex-1">
                {/* Error Banner */}
                <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg">
                  <div className="text-xs font-mono font-semibold text-red-300">{debugResult.errorMsg}</div>
                </div>

                {/* Suggested Fix */}
                <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-lg space-y-2">
                  <div className="text-xs font-semibold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Recommended Solution
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed">{debugResult.suggestion}</p>
                </div>

                {/* Quick actions */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Actions</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => alert('Fix dispatched to Developer Agent!')}
                      className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md border border-zinc-700 transition-colors"
                    >
                      Ask Developer Agent to Patch
                    </button>
                    <button
                      onClick={() => {
                        setDebugError('');
                        setDebugStack('');
                        setDebugResult(null);
                      }}
                      className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-md transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                <Lightbulb className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Enter an error message and click "Diagnose Error" to view root cause analysis.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

