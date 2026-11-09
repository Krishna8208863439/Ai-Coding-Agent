import { describe, it, expect } from 'vitest';
import { WorkspaceManager } from '../lib/workspaceManager';
import { generateProjectFiles, TemplateFile } from '../lib/projectTemplates';

describe('Prompt-to-Project Generation Engine', () => {
  it('generates complete template files for React project', () => {
    const files: TemplateFile[] = generateProjectFiles('Hospital CRM', 'react', 'Build a patient booking app');
    expect(files.some((f: TemplateFile) => f.path === 'package.json')).toBe(true);
    expect(files.some((f: TemplateFile) => f.path === 'src/App.jsx')).toBe(true);
    expect(files.some((f: TemplateFile) => f.path === 'README.md')).toBe(true);
  });

  it('generates complete template files for Python Flask project', () => {
    const files: TemplateFile[] = generateProjectFiles('Diagnostic Engine', 'python', 'Predict disease risks');
    expect(files.some((f: TemplateFile) => f.path === 'app.py')).toBe(true);
    expect(files.some((f: TemplateFile) => f.path === 'requirements.txt')).toBe(true);
    expect(files.some((f: TemplateFile) => f.path === 'README.md')).toBe(true);
  });

  it('prevents path traversal attacks with WorkspaceManager.sanitizePath', () => {
    const projId = 'test-proj-123';
    expect(() => {
      WorkspaceManager.sanitizePath(projId, '../../etc/passwd');
    }).toThrow(/Security Violation/);

    expect(() => {
      WorkspaceManager.sanitizePath(projId, '../../../Windows/System32');
    }).toThrow(/Security Violation/);
  });
});
