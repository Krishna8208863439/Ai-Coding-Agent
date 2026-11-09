import { AgentRole } from '@nexora/shared';

export interface AgentDefinition {
  role: AgentRole;
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];
}

export const AGENT_ROLES_CATALOG: Record<AgentRole, AgentDefinition> = {
  ARCHITECT: {
    role: 'ARCHITECT',
    name: 'Architect Agent',
    description: 'Analyzes user prompts, designs modular architectures, selects tech stack, plans tasks, and identifies technical risks.',
    systemPrompt: 'You are the Principal AI Architect. You formulate technical plans, define component boundaries, and plan engineering tasks.',
    allowedTools: ['list_files', 'read_file', 'create_task', 'ask_user'],
  },
  DEVELOPER: {
    role: 'DEVELOPER',
    name: 'Developer Agent',
    description: 'Implements production source code, creates files/directories, and builds full-stack logic.',
    systemPrompt: 'You are the Senior Full-Stack Developer. You implement clean, robust TypeScript, Node.js, and Python code.',
    allowedTools: ['write_file', 'apply_patch', 'read_file', 'list_files'],
  },
  TESTER: {
    role: 'TESTER',
    name: 'Tester Agent',
    description: 'Generates automated test suites, executes unit and integration tests, and reports coverage failures.',
    systemPrompt: 'You are the QA Test Specialist. You write comprehensive automated test cases with high edge-case coverage.',
    allowedTools: ['run_tests', 'read_file', 'list_files', 'write_file'],
  },
  DEBUGGER: {
    role: 'DEBUGGER',
    name: 'Debugger Agent',
    description: 'Inspects execution errors and failed test traces, diagnoses root causes, and prepares patches (max 3 retries).',
    systemPrompt: 'You are the Principal Debugger. You diagnose root causes from stack traces and craft targeted code patches.',
    allowedTools: ['read_file', 'apply_patch', 'run_tests'],
  },
  SECURITY: {
    role: 'SECURITY',
    name: 'Security Agent',
    description: 'Audits code for vulnerabilities, injection vectors, hardcoded secrets, and dependency CVEs.',
    systemPrompt: 'You are the Chief Cybersecurity Engineer. You inspect files for prompt injection, secrets, and auth bypasses.',
    allowedTools: ['read_file', 'list_files'],
  },
  UI_UX: {
    role: 'UI_UX',
    name: 'UI/UX Agent',
    description: 'Ensures dark mode contrast, visual hierarchy, mobile responsiveness, and WCAG AA accessibility compliance.',
    systemPrompt: 'You are the Senior Design Engineer. You refine components for aesthetic quality and WCAG AA accessibility.',
    allowedTools: ['read_file', 'write_file', 'apply_patch'],
  },
  PROJECT_MANAGER: {
    role: 'PROJECT_MANAGER',
    name: 'Project Manager Agent',
    description: 'Tracks milestones, manages task states, and coordinates agent handoffs.',
    systemPrompt: 'You are the Agile Project Manager. You track task progress, evaluate deliverables, and approve stage transitions.',
    allowedTools: ['create_task', 'update_task', 'ask_user'],
  },
};

export interface ToolExecutionRequest {
  tool: string;
  input: Record<string, unknown>;
  agentRole: AgentRole;
}

export interface ToolExecutionResult {
  tool: string;
  output: string;
  requiresApproval?: boolean;
  approvalType?: 'FILE_DELETE' | 'INSTALL_DEPS' | 'EXECUTE_CMD';
  approvalDetails?: Record<string, unknown>;
}

export class AgentToolRegistry {
  static requiresHumanApproval(tool: string, input: Record<string, unknown>): { requires: boolean; type?: 'FILE_DELETE' | 'INSTALL_DEPS' | 'EXECUTE_CMD' } {
    if (tool === 'delete_file') {
      return { requires: true, type: 'FILE_DELETE' };
    }
    if (tool === 'install_deps') {
      return { requires: true, type: 'INSTALL_DEPS' };
    }
    if (tool === 'run_command' && !['npm test', 'vitest run', 'pytest'].includes((input.command as string) || '')) {
      return { requires: true, type: 'EXECUTE_CMD' };
    }
    return { requires: false };
  }
}

