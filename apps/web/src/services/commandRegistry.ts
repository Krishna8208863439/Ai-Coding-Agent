export interface CommandContext {
  editorFocus?: boolean;
  terminalFocus?: boolean;
  folderOpen?: boolean;
  hasSelection?: boolean;
  isSaving?: boolean;
  [key: string]: unknown;
}

export interface CommandDefinition {
  id: string;
  title: string;
  category: string;
  keybinding?: string;
  whenClause?: (context: CommandContext) => boolean;
  handler: (context?: CommandContext) => void | Promise<void>;
  disabled?: (context: CommandContext) => boolean;
  disabledReason?: string;
}

class CommandRegistryService {
  private commands = new Map<string, CommandDefinition>();
  private listeners = new Set<() => void>();

  register(command: CommandDefinition): () => void {
    this.commands.set(command.id, command);
    this.notify();
    return () => {
      this.commands.delete(command.id);
      this.notify();
    };
  }

  registerMany(commands: CommandDefinition[]): () => void {
    commands.forEach((c) => this.commands.set(c.id, c));
    this.notify();
    return () => {
      commands.forEach((c) => this.commands.delete(c.id));
      this.notify();
    };
  }

  get(id: string): CommandDefinition | undefined {
    return this.commands.get(id);
  }

  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  getFiltered(context: CommandContext): CommandDefinition[] {
    return Array.from(this.commands.values()).filter((c) => {
      if (!c.whenClause) return true;
      try {
        return c.whenClause(context);
      } catch {
        return false;
      }
    });
  }

  async execute(id: string, context?: CommandContext): Promise<boolean> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      console.warn(`[CommandRegistry] Command "${id}" not found.`);
      return false;
    }

    if (context && cmd.disabled && cmd.disabled(context)) {
      console.warn(`[CommandRegistry] Command "${id}" is disabled: ${cmd.disabledReason || 'Condition not met'}`);
      return false;
    }

    try {
      await cmd.handler(context);
      return true;
    } catch (err) {
      console.error(`[CommandRegistry] Error executing "${id}":`, err);
      return false;
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const commandRegistry = new CommandRegistryService();
