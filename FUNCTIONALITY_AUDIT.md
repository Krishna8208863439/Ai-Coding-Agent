# FUNCTIONALITY AUDIT: NEXORA AI AUTONOMOUS IDE

**Audit Date:** 2026-11-18  
**Repository:** `https://github.com/Krishna8208863439/Ai-Coding-Agent.git`  
**Monorepo Packages:** `@nexora/shared`, `@nexora/ui`, `@nexora/agents`, `@nexora/providers`, `@nexora/api`, `@nexora/web`

---

## 1. Feature Status & Gap Matrix

| Feature | Current status | Problem / Gap Identified | Required Implementation | Test Plan |
|---|---|---|---|---|
| **Explorer File Tree** | Partial | Explorer defaults to in-memory state when no project is loaded; `onCreateFolder` and `onRefresh` are empty no-ops in `IdeLayout.tsx`. | Wire `fetchProjectFiles()`, real backend directory listing `/api/projects/:id/files`, directory creation (`WorkspaceManager.ensureProjectDir`), and rename handlers. | Test E1: Real project directory loaded from backend; file created on disk. |
| **Monaco Editor Tabs** | Partial | Save active tab writes in-memory with a `setTimeout`; does not persist directly to backend file `/api/projects/:id/files/modify`. | Wire `handleSaveActive` to call `POST /api/projects/:id/files/modify` to ensure changes are written to the sandbox filesystem. | Test M1: Modify content, save, reload from disk, verify matching content. |
| **Top Navigation Actions** | Partial | Edit menu (Undo, Redo, Cut, Copy, Paste, Find, Format), Selection (Select All, Line Up/Down), Go (Go to Line), and Run menus lack wired keyboard/Monaco dispatchers. | Connect menu actions to Monaco editor instance actions (`editor.trigger('menu', 'actions.find')`, `editor.getAction('editor.action.formatDocument').run()`, etc.). | Test N1: Click each menu action and verify Monaco/IDE response. |
| **AI Agent Copilot** | Working | Full 7-agent autonomous pipeline with SSE streaming and human approval gating is built; empty API key shows generic error. | Add explicit check for unconfigured provider in `AiAgentPanel.tsx` directing user to Model Settings as requested. | Test A1: Send prompt, verify SSE events, agent switches, and approval cards. |
| **AI Model Providers** | Working | AES-256-GCM vault, connection testing, and model discovery working across Gemini, OpenAI, Claude, Groq, DeepSeek. | Ensure provider selection in `/models` binds dynamically to active agent without refresh. | Test P1: Add API key, encrypt, test connection, verify masked representation. |
| **Integrated Terminal** | Working | Real sandbox command execution via `/api/terminal/exec` with allowlist and security tokens. | Add xterm.js PTY bridge or multi-session tab switching in BottomPanel for advanced terminal workflows. | Test T1: Execute `npm test`, verify exit code 0 and stdout capture. |
| **Live App Preview** | Working | Background process manager (`/api/terminal/process/start`) runs server and renders multi-device iframe. | Add auto-reconnect on port change and preview error boundary. | Test L1: Start app, inspect iframe viewport, stop server. |
| **Source Control & Git** | Working | Remote PAT connect, commit, push, working tree status, and project export JSON. | Add Git diff viewer tab in central editor for modified files. | Test G1: Connect GitHub, commit file change, verify commit SHA. |
| **Universal API Manager** | Working | Full 8-tab interface, AES-256 vault, SSRF guard, OpenAPI parser, and agent tool execution. | Ensure agent calls to Universal APIs surface in the chat timeline with approval triggers. | Test U1: Execute API call, inspect response latency and status code. |
| **Settings & Preferences** | Working | `SettingsModal` (`Ctrl+,`) with persistent `localStorage` store and non-blocking toast notifications. | Add keyboard shortcut customize panel in Settings. | Test S1: Update editor font size, theme, verify persistent reload. |
| **Problems & Diagnostics** | Working | Diagnostics linked to IDE store; clicking problem opens corresponding file. | Hook live Monaco markers (`monaco.editor.onDidChangeMarkers`) to `diagnosticsStore`. | Test D1: Introduce syntax error, verify badge count increments in bottom panel. |

---

## 2. Immediate Action Plan

1. **Step 1: Real Disk File Tree Synchronization (`apps/web/src/components/IdeLayout.tsx`)**
   - Connect `IdeLayout` to `/api/projects/:id/files` to fetch the real project files on mount and project switch.
   - Wire `handleSaveActive` directly to `/api/projects/:id/files/modify` so edits hit real disk storage.
   - Implement `onCreateFolder`, `onRenameFile`, and `onRefresh` using backend endpoints.

2. **Step 2: Monaco Editor Action Bridge (`apps/web/src/components/TopNavbar.tsx`)**
   - Bind Monaco editor ref globally in `ideStore` so TopNavbar's Edit (Undo/Redo/Find/Replace/Format), Selection (Select All), and Go (Go to Line) commands trigger actual editor commands.

3. **Step 3: Monaco Error Markers to Problems Panel**
   - Add Monaco marker listener to push actual syntax errors/warnings into `ideStore.diagnostics`.

4. **Step 4: Full Validation & Test Suite**
   - Run tests, typecheck, build, and record all evidence.
