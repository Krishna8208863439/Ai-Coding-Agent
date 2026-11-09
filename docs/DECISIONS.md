# Architectural Decision Records (ADRs)

## ADR 001: Monorepo Architecture with pnpm Workspaces
- **Status**: Accepted
- **Context**: NEXORA AI consists of frontend client, backend API, shared types, UI primitives, LLM adapters, and containerized sandbox services.
- **Decision**: Adopt pnpm workspaces with strict dependency boundaries to ensure type consistency and rapid build execution across apps and packages.
- **Consequences**: Fast symlinked dependencies, strict package hoisting prevention, and clean modular boundaries.

## ADR 002: Strict 10-Phase Gating with Human Verification
- **Status**: Accepted
- **Context**: Building an autonomous AI software development platform requires absolute reliability and verifiable progression.
- **Decision**: Enforce strict phase gates where future capabilities are disabled and visually designated "Coming in Phase N" until explicitly authorized by user approval.
- **Consequences**: No mock or broken unfinished controls exposed to the user. Every phase has automated and manual verification evidence.

## ADR 003: UI Framework and Styling
- **Status**: Accepted
- **Context**: The platform demands a responsive, accessible dark-themed developer IDE aesthetic.
- **Decision**: Standardize on React 18, Vite, Tailwind CSS, Lucide icons, and custom modular UI components conforming to WCAG AA contrast standards.

