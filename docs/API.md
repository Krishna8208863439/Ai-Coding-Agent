# NEXORA AI API Specification

**Version**: `1.0.0`  
**Base URL**: `/api`  

All protected endpoints require either:
1. `Authorization: Bearer <jwt_access_token>` header, or
2. `nexora_refresh` HTTP-only cookie for token rotation.

---

## 1. System & Phase Lifecycle
- `GET /api/health` — Platform health check, version `1.0.0`, environment, uptime.
- `GET /api/phases` — Complete 10-phase master progression status (all 10 marked `COMPLETE`).

## 2. Authentication & Identity
- `POST /api/auth/register` — Register account with Argon2id password hashing. Returns JWT + refresh cookie.
- `POST /api/auth/login` — Login with constant-time dummy verify to mitigate timing attacks.
- `POST /api/auth/refresh` — Cryptographically rotate refresh token with token-reuse detection.
- `POST /api/auth/logout` — Revoke active refresh token and invalidate HTTP-only cookie.
- `GET /api/auth/me` — Return current authenticated session profile.

## 3. Multi-Provider API Management & Model Library
- `GET /api/providers` — List configured LLM providers (API keys masked to 4 trailing chars).
- `POST /api/providers` — Add or update provider config; credentials encrypted with AES-256-GCM.
- `POST /api/providers/test` — Test provider connection against live LLM endpoints.
- `GET /api/providers/models` — Live model discovery across OpenAI, Gemini, Claude, Groq, Ollama.
- `DELETE /api/providers/:id` — Safely remove provider credentials.

## 4. AI Chat & Real-Time Streaming
- `POST /api/chat/stream` — Real-time Server-Sent Events (SSE) AI completions with token count.
- `GET /api/chat/conversations` — Fetch chat history and conversation threads.
- `GET /api/chat/conversations/:id` — Retrieve messages for a specific conversation.

## 5. Prompt-to-Project Generation
- `POST /api/projects/generate` — Autonomous prompt-to-project engine with directory & file scaffolding.
- `GET /api/projects` — List user generated projects.
- `GET /api/projects/:id/files` — Recursive directory file tree.
- `GET /api/projects/:id/files/content` — Read sanitized project file content.
- `POST /api/projects/:id/files/modify` — Modify workspace files with path-traversal guards.

## 6. Multi-Agent Orchestration
- `GET /api/agents/roles` — 7 engineering roles (Architect, Developer, Debugger, Tester, UI/UX, Security, PM).
- `GET /api/agents/runs` — Fetch agent execution runs and step timelines.
- `POST /api/agents/runs` — Dispatch autonomous multi-agent software engineering pipeline.
- `POST /api/agents/approvals/:id` — Human-in-the-loop approval gating for sensitive operations.

## 7. Sandbox Execution & Terminal
- `POST /api/terminal/exec` — Execute sandboxed commands against project workspace using strict allowlist.
- `GET /api/terminal/status` — Inspect terminal sandbox runner status and allowed command prefixes.

## 8. Testing & Debugging Engine
- `POST /api/testing/runs` — Trigger Vitest, Pytest, or Jest test suites; parse case-level results.
- `GET /api/testing/runs` — List test execution history.
- `GET /api/testing/runs/:id` — Retrieve detailed test case breakdown and execution traces.
- `DELETE /api/testing/runs/:id` — Clear test run records.
- `POST /api/testing/debug` — AI root-cause error diagnostics with actionable patch recommendations.
- `GET /api/testing/status` — Operational status and supported test frameworks.

## 9. GitHub Integration & Production Export
- `GET /api/github/status` — GitHub OAuth connection status and permissions.
- `POST /api/github/connect` — Connect GitHub account via personal access token or OAuth.
- `POST /api/github/disconnect` — Disconnect GitHub account.
- `GET /api/github/repos` — Fetch user repositories for remote syncing.
- `POST /api/github/push` — Guarded commit and push of workspace files to remote repository.
- `GET /api/github/export/:projectId` — Download structured JSON archive of all project workspace files.
