import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, Button, Badge } from '@nexora/ui';
import { useAuthStore } from '../store/authStore';
import { FolderPlus, Sparkles, CheckCircle2, ArrowRight, Layers, Terminal, FileCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NewProject() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('Smart Healthcare AI');
  const [template, setTemplate] = useState('react');
  const [prompt, setPrompt] = useState(
    'Create a Smart Healthcare Management System with disease prediction analytics, appointment scheduling, and patient history dashboard.'
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      alert('Please log in under Settings before generating projects.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgressStep('Synthesizing requirements and architecture design...');

    try {
      setTimeout(() => setProgressStep('Generating full-stack file structure...'), 800);
      setTimeout(() => setProgressStep('Writing source files, README, and dependency configs...'), 1600);

      const res = await fetch('/api/projects/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: projectName,
          template,
          prompt,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Project generation failed');
      }

      const data = await res.json();
      setProgressStep('Complete! Redirecting to Project Explorer...');
      setTimeout(() => {
        navigate('/explorer');
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2433] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderPlus className="h-6 w-6 text-indigo-400" />
            Prompt-to-Project Generation Engine
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Transform natural language prompts into complete, runnable full-stack application projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">Multi-Stack Generator</Badge>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Main Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Project Specification</CardTitle>
          <CardDescription>Enter project details or paste a comprehensive master prompt</CardDescription>
        </CardHeader>

        <form onSubmit={handleGenerate} className="space-y-5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Project Name</label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Architecture & Tech Stack</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="react">React 18 + Vite (SPA Client)</option>
                <option value="node">Node.js + Express (REST API)</option>
                <option value="python">Python Flask (Data Science & ML)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Requirements & Functional Prompt</label>
            <textarea
              required
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a complete AI-powered Smart Healthcare Management System with authentication, disease prediction, doctor recommendations, and patient records..."
              className="w-full rounded-lg border border-[#1f2433] bg-[#090a0f] p-3 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Preset Prompts */}
          <div>
            <span className="text-[11px] font-medium text-neutral-400">Quick Prompt Presets:</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setProjectName('Healthcare AI Assistant');
                  setTemplate('react');
                  setPrompt('Smart Healthcare platform with disease prediction, doctor recommendations, and patient dashboard.');
                }}
                className="rounded-lg border border-[#1f2433] bg-[#090a0f] px-2.5 py-1 text-[11px] text-neutral-300 hover:border-indigo-500"
              >
                🏥 Smart Healthcare
              </button>
              <button
                type="button"
                onClick={() => {
                  setProjectName('E-Commerce Microservice');
                  setTemplate('node');
                  setPrompt('Node.js REST API with product catalog, cart checkout, inventory tracking, and Stripe integration.');
                }}
                className="rounded-lg border border-[#1f2433] bg-[#090a0f] px-2.5 py-1 text-[11px] text-neutral-300 hover:border-indigo-500"
              >
                🛒 E-Commerce API
              </button>
              <button
                type="button"
                onClick={() => {
                  setProjectName('Predictive Analytics Engine');
                  setTemplate('python');
                  setPrompt('Python Flask microservice predicting churn probabilities and risk scoring using scikit-learn models.');
                }}
                className="rounded-lg border border-[#1f2433] bg-[#090a0f] px-2.5 py-1 text-[11px] text-neutral-300 hover:border-indigo-500"
              >
                🐍 Python Analytics
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          {isGenerating && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                <Sparkles className="h-4 w-4 animate-spin text-indigo-400" />
                <span>Autonomous Generation Pipeline Active</span>
              </div>
              <p className="font-mono text-xs text-neutral-300">{progressStep}</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="primary" type="submit" disabled={isGenerating} className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{isGenerating ? 'Generating Project...' : 'Generate Real Project Files'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

