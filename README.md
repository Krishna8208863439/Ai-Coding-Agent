# NEXORA AI

> **Universal AI Software Development Platform**  
> AI Coding IDE | Autonomous Multi-Agent System | Prompt-to-Project Generator  
> **Version 1.0.0 (Production Ready)**

---

## Overview

**NEXORA AI** is a full-featured, desktop-grade AI software engineering platform inspired by modern AI coding IDEs. It transforms natural language software development prompts into complete, runnable codebases using multi-provider LLM integrations, an autonomous multi-agent pipeline, an integrated Monaco code editor, sandboxed execution, testing analytics, and GitHub integration.

---

## Key Features

- **Multi-Provider LLM Integration**: First-class support for OpenAI, Google Gemini, Anthropic Claude, Groq, Mistral, DeepSeek, and custom OpenAI-compatible endpoints with dynamic model switching and token tracking.
- **Enterprise Credential Vault**: API keys encrypted at rest using AES-256-GCM and masked in all UI responses.
- **Prompt-to-Project Engine**: Scaffolds complete multi-file projects (React, Node.js, Python, Next.js, Java) with database schemas, configuration, and documentation.
- **7 Autonomous Agent Roles**:
  - 🏛️ **Architect**: Requirements analysis, stack selection, architecture design.
  - 💻 **Developer**: Source code generation, file tree creation, refactoring.
  - 🧪 **Tester**: Automated test case generation, test execution, coverage analysis.
  - 🔍 **Debugger**: Root cause analysis, stack trace inspection, automated patching.
  - 🎨 **UI/UX Designer**: Layout design, design system adherence, WCAG AA compliance.
  - 🛡️ **Security Specialist**: Dependency auditing, vulnerability detection, secret redaction.
  - 📋 **Project Manager**: Milestone tracking, task planning, execution summaries.
- **Advanced AI IDE**: Multi-tab code editor powered by Monaco Editor, syntax highlighting, diff viewer, and integrated AI Copilot panel.
- **Sandboxed Execution & Terminal**: In-browser terminal executing against isolated workspace directories with strict command allowlisting and injection defense.
- **Testing & Debugging Dashboard**: Vitest/Pytest/Jest runner with case-level analytics and automated root-cause diagnostics.
- **GitHub Integration & Bundle Export**: Remote branch syncing, commit history generation, and direct project archive downloads.

---

## Monorepo Layout

```
nexora/
├── apps/
│   ├── web/               # React 18, Vite, Tailwind CSS, Monaco Editor, Lucide
│   └── api/               # Express.js, TypeScript, Prisma ORM, Sandbox Manager
├── packages/
│   ├── shared/            # Common interfaces, DTOs, Zod schemas
│   ├── ui/                # Accessible design system components (WCAG AA)
│   ├── providers/         # Multi-provider LLM adapters (OpenAI, Gemini, Claude)
│   └── agents/            # Autonomous agent roles & orchestration engine
├── docker/
│   ├── node/              # Node.js 20 isolated container definition
│   └── python/            # Python 3.11 isolated container definition
└── docs/
    ├── ARCHITECTURE.md    # System design & module boundaries
    ├── DECISIONS.md       # Architectural Decision Records (ADR 001 - 007)
    ├── SECURITY.md        # Threat model & cryptographic policies
    └── API.md             # Complete REST API specification
```

---

## Quickstart

### Prerequisites
- **Node.js**: v20 or higher
- **pnpm**: v9 or higher
- **Docker**: (Optional, for containerized sandbox runners)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/nexora-ai.git
cd nexora-ai

# Install dependencies across all packages
pnpm install
```

### Environment Configuration
```bash
# Backend configuration
cp apps/api/.env.example apps/api/.env
```
Ensure `NEXORA_MASTER_KEY` (32 bytes hex) and `JWT_SECRET` are configured.

### Running Locally
```bash
# Start backend API (port 4000) and frontend client (port 5173) in dev mode
pnpm run dev
```

### Verification & Testing
```bash
# Typecheck all 6 workspace packages
pnpm run typecheck

# Run automated unit and integration tests
pnpm run test

# Build production artifacts
pnpm run build
```

---

## Architecture & Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Architectural Decision Records (ADR 001-007)](docs/DECISIONS.md)
- [Security Policy & Credential Isolation](docs/SECURITY.md)
- [API Reference](docs/API.md)

---

## License

MIT © NEXORA AI Team
