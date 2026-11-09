# Architectural Decision Records (ADRs)

## ADR 001: Monorepo Architecture with pnpm Workspaces
- **Status**: Accepted
- **Context**: NEXORA AI consists of frontend client, backend API, shared types, UI primitives, LLM adapters, and containerized sandbox services.
- **Decision**: Adopt pnpm workspaces with strict dependency boundaries to ensure type consistency and rapid build execution across apps and packages.
- **Consequences**: Fast symlinked dependencies, strict package hoisting prevention, and clean modular boundaries.

## ADR 002: Strict 10-Phase Gating with Evidence Verification
- **Status**: Accepted
- **Context**: Building an autonomous AI software development platform requires absolute reliability and verifiable progression.
- **Decision**: Enforce strict phase gates where future capabilities are disabled and visually designated "Coming in Phase N" until activated and proven through automated tests, typechecking, and production builds.
- **Consequences**: No mock or broken unfinished controls exposed to the user. Every phase produces audited artifacts and commits.

## ADR 003: UI Framework and Styling
- **Status**: Accepted
- **Context**: The platform demands a responsive, accessible dark-themed developer IDE aesthetic.
- **Decision**: Standardize on React 18, Vite, Tailwind CSS, Lucide icons, and custom modular UI components conforming to WCAG AA contrast standards.

## ADR 004: Credential Security with AES-256-GCM
- **Status**: Accepted
- **Context**: Users configure API keys for OpenAI, Anthropic, Gemini, Groq, and custom endpoints that must never be exposed.
- **Decision**: Encrypt all secrets at rest using AES-256-GCM with a server-side master key (`NEXORA_MASTER_KEY`). API responses return only masked values with trailing 4 characters. Frontend client code and browser local storage never store plaintext keys.

## ADR 005: Strict Sandbox Isolation & Command Allowlisting
- **Status**: Accepted
- **Context**: Autonomous agents and developers execute terminal commands inside user workspaces.
- **Decision**: Implement a dual-layer security model:
  1. `WorkspaceManager.sanitizePath()` strictly confines filesystem I/O to the project sandbox directory, blocking path traversal attacks (`../`).
  2. `SandboxManager` enforces an explicit command allowlist (e.g. `npm test`, `node`, `python`, `pytest`) while rejecting shell injection operators (`&&`, `||`, `;`, `|`, `` ` ``, `$()`).

## ADR 006: Autonomous Multi-Agent Pipeline with Human-in-the-Loop
- **Status**: Accepted
- **Context**: Full prompt-to-project development involves planning, coding, testing, debugging, and security review.
- **Decision**: Implement 7 specialized agent roles (Architect, Developer, Debugger, Tester, UI/UX, Security, PM). High-risk operations (destructive edits, package installation, remote push) trigger human approval gates before execution.

## ADR 007: Monaco Editor & Client State Architecture
- **Status**: Accepted
- **Context**: Developers need desktop-grade code editing with syntax highlighting and multi-tab workflows.
- **Decision**: Embed Monaco Editor via `@monaco-editor/react` paired with Zustand stores (`ideStore`, `chatStore`, `authStore`) for low-overhead client-side reactivity.
