# NEXORA AI System Architecture

## Overview
NEXORA AI is a full-featured AI software development workspace engineered for multi-agent autonomous engineering, sandbox container execution, and multi-provider LLM integrations.

## Monorepo Layout
```
nexora/
├── apps/
│   ├── web/               # React 18, Vite, Tailwind CSS, App Shell, Monaco, xterm.js
│   ├── api/               # Express.js, TypeScript, Pino logging, WebSockets, Prisma
│   └── sandbox-runner/    # Docker-isolated execution runner service (Phase 8)
├── packages/
│   ├── shared/            # Shared interfaces, types, constants, DTOs
│   ├── ui/                # Reusable design system primitives (Button, Card, Badge)
│   ├── providers/         # Multi-provider LLM adapters (Phase 3)
│   └── agents/            # Autonomous agent roles & orchestration engine (Phase 6)
├── docker/                # Isolated container definitions (Node.js, Python, Java)
├── docs/                  # Architecture, ADRs, Security & API Documentation
```

## Module Responsibilities
- **`apps/web`**: Single-page application providing the desktop-grade AI IDE experience. Built with React 18, Vite, Tailwind CSS, Lucide Icons, and accessible responsive layouts.
- **`apps/api`**: REST and WebSocket backend providing authentication, provider credential management (AES-256-GCM), workspace management, agent orchestration, and audit logging.
- **`packages/shared`**: Single source of truth for TypeScript types shared across client, server, and agents.
- **`packages/ui`**: Component library adhering to WCAG AA accessibility standards, dark theme design tokens, and modular composition.

