import React, { useState } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Monitor,
  Cpu,
  Shield,
  FileCode,
  Terminal,
  Save,
  Check,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { usePreferencesStore, UserPreferences } from '../store/preferencesStore';
import { useAuthStore } from '../store/authStore';

export function SettingsModal() {
  const { isSettingsOpen, closeSettings, preferences, setPreferences, addToast } = usePreferencesStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'editor' | 'ai' | 'security' | 'appearance'>('editor');
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    setPreferences(localPrefs);
    addToast('Settings Saved', 'Your workspace preferences were updated successfully.', 'success');
    closeSettings();
  };

  const handleReset = () => {
    setLocalPrefs(preferences);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1c1c1c] border border-[#333] rounded-xl max-w-2xl w-full h-[520px] shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="h-12 border-b border-[#2b2b2b] px-4 flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-2 text-neutral-200 font-semibold text-sm">
            <SettingsIcon className="w-4 h-4 text-cyan-400" />
            <span>Workspace Preferences & Settings</span>
          </div>
          <button
            onClick={closeSettings}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#282828] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (Sidebar + Content) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Settings Nav Sidebar */}
          <div className="w-44 bg-[#181818] border-r border-[#2b2b2b] p-2 space-y-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                activeTab === 'editor' ? 'bg-[#252525] text-cyan-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> Monaco Editor
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                activeTab === 'ai' ? 'bg-[#252525] text-cyan-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> AI Providers
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                activeTab === 'appearance' ? 'bg-[#252525] text-cyan-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Appearance
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                activeTab === 'security' ? 'bg-[#252525] text-cyan-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Security & Account
            </button>
          </div>

          {/* Settings Tab Panels */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-neutral-300">
            {activeTab === 'editor' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-200 border-b border-[#292929] pb-1.5">
                  Editor Configuration
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400">Font Size (px)</label>
                  <input
                    type="number"
                    min={10}
                    max={24}
                    value={localPrefs.fontSize}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, fontSize: Number(e.target.value) })}
                    className="w-24 bg-[#141414] border border-[#333] rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400">Tab Size (Spaces)</label>
                  <select
                    value={localPrefs.tabSize}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, tabSize: Number(e.target.value) })}
                    className="w-24 bg-[#141414] border border-[#333] rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-medium text-neutral-200 block">Minimap Display</span>
                    <span className="text-neutral-500 text-[10px]">Show code overview sidebar inside editor tabs</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localPrefs.minimap}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, minimap: e.target.checked })}
                    className="rounded bg-[#141414] border-[#333] text-cyan-500 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-neutral-200 block">Automatic Save</span>
                    <span className="text-neutral-500 text-[10px]">Automatically write dirty tabs to disk on focus lost</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localPrefs.autoSave}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, autoSave: e.target.checked })}
                    className="rounded bg-[#141414] border-[#333] text-cyan-500 focus:ring-0"
                  />
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-200 border-b border-[#292929] pb-1.5">
                  AI Model & Agent Defaults
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400">Default AI Provider</label>
                  <select
                    value={localPrefs.activeAiProvider}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, activeAiProvider: e.target.value })}
                    className="w-full bg-[#141414] border border-[#333] rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="gemini">Google Gemini (Gemini 3.8 / 2.0 Flash)</option>
                    <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
                    <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                    <option value="groq">Groq (Llama 3.3 70B Fast Inference)</option>
                    <option value="deepseek">DeepSeek (DeepSeek V3 / R1)</option>
                  </select>
                </div>

                <div className="p-3 bg-[#161616] border border-[#262626] rounded-lg text-neutral-400 space-y-1">
                  <span className="font-semibold text-neutral-300 block text-xs">Encryption Vault Notice</span>
                  <p className="text-[10px]">
                    API keys for providers and Universal APIs are encrypted in the PostgreSQL database using AES-256-GCM.
                    They are never sent in plain text or rendered in client-side bundles.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-200 border-b border-[#292929] pb-1.5">
                  Theme & Visual Customization
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400">Color Theme</label>
                  <select
                    value={localPrefs.theme}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, theme: e.target.value as any })}
                    className="w-full bg-[#141414] border border-[#333] rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="vs-dark">NEXORA Dark / Antigravity (#171717)</option>
                    <option value="hc-black">High Contrast Black</option>
                    <option value="vs-light">Light Mode</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-200 border-b border-[#292929] pb-1.5">
                  Account & Session Security
                </h3>

                <div className="p-3 bg-[#151515] border border-[#262626] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-neutral-200 font-medium block">Current Identity</span>
                      <span className="text-neutral-500 text-[10px]">{user ? user.email : 'Signed in as Local Developer'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[10px]">
                      Session Active
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-12 border-t border-[#2b2b2b] px-4 flex items-center justify-between bg-[#191919]">
          <button
            onClick={handleReset}
            className="px-3 py-1 rounded text-neutral-400 hover:text-white hover:bg-[#282828] text-xs flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={closeSettings}
              className="px-3 py-1 rounded bg-[#282828] hover:bg-[#333] text-neutral-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
