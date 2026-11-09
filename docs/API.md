# NEXORA AI API Specification

## Base URL
`/api`

## Endpoints

### 1. System Health
- **Endpoint**: `GET /api/health`
- **Description**: Returns current health status, version, and server uptime.
- **Response**:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2026-11-09T14:10:00.000Z",
  "uptime": 120
}
```

### 2. Platform Phases
- **Endpoint**: `GET /api/phases`
- **Description**: Returns active phase status and complete 10-phase master progression.
- **Response**:
```json
{
  "activePhase": 1,
  "phaseName": "Foundation and UI Architecture",
  "allPhases": [
    { "phase": 1, "name": "Foundation and UI", "status": "ACTIVE" },
    { "phase": 2, "name": "Authentication and Database", "status": "LOCKED" },
    ...
  ]
}
```

