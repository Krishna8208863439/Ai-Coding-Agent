# NEXORA AI Security Architecture

## 1. Credential Security & Encryption
- API keys for all providers (OpenAI, Anthropic, Gemini, Groq, Mistral, Ollama) are encrypted at rest using AES-256-GCM authenticated encryption.
- Keys are never stored in browser localStorage, session cookies, or client bundles.
- Only masked representations (e.g. `sk-...abcd`) are transmitted to the frontend.

## 2. Sandbox Isolation & Container Restrictions
- Sandboxed containers execute under dedicated non-root users (`uid=1001`).
- Root filesystems are mounted read-only (`--read-only`), with only the project workspace directory mounted writable.
- Default network access is disabled (`--network none`) for code execution.
- Docker socket (`/var/run/docker.sock`) is never mounted inside user containers.
- Strict CPU limits (`--cpus=1.5`) and memory limits (`--memory=1g`) enforced via cgroups.

## 3. Web & Network Security
- Content Security Policy (CSP) and security headers configured via Helmet.
- Strict CORS policies restricted to explicit client origins.
- Rate limiting on authentication and sensitive endpoints.

