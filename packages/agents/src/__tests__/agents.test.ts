import { describe, it, expect } from 'vitest';
import { AGENT_ROLES_CATALOG, AgentToolRegistry } from '../index';

describe('Autonomous AI Agent Orchestration', () => {
  it('registers all 7 specialized engineering roles', () => {
    const roles = Object.keys(AGENT_ROLES_CATALOG);
    expect(roles).toHaveLength(7);
    expect(roles).toContain('ARCHITECT');
    expect(roles).toContain('DEVELOPER');
    expect(roles).toContain('TESTER');
    expect(roles).toContain('DEBUGGER');
    expect(roles).toContain('SECURITY');
    expect(roles).toContain('UI_UX');
    expect(roles).toContain('PROJECT_MANAGER');
  });

  it('enforces human-in-the-loop approval for destructive actions', () => {
    const deleteCheck = AgentToolRegistry.requiresHumanApproval('delete_file', { path: 'src/core.ts' });
    expect(deleteCheck.requires).toBe(true);
    expect(deleteCheck.type).toBe('FILE_DELETE');

    const installCheck = AgentToolRegistry.requiresHumanApproval('install_deps', { package: 'axios' });
    expect(installCheck.requires).toBe(true);
    expect(installCheck.type).toBe('INSTALL_DEPS');

    const safeCheck = AgentToolRegistry.requiresHumanApproval('read_file', { path: 'src/core.ts' });
    expect(safeCheck.requires).toBe(false);
  });
});
