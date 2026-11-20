import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = util.promisify(exec);

export interface NativeDialogResult {
  path?: string;
  cancelled?: boolean;
  error?: string;
}

/**
 * Triggers the host OS native folder selection dialog.
 */
export async function openNativeFolderDialog(): Promise<NativeDialogResult> {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // Windows PowerShell FolderBrowserDialog with single-threaded apartment (STA)
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $f = New-Object System.Windows.Forms.FolderBrowserDialog
        $f.Description = "Select a folder to open in NEXORA AI"
        $f.ShowNewFolderButton = $true
        $result = $f.ShowDialog()
        if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $f.SelectedPath
        } else {
          Write-Output "__CANCELLED__"
        }
      `.replace(/\r?\n\s*/g, ' ');

      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -STA -Command "${psScript}"`,
        { timeout: 60000 }
      );

      const trimmed = stdout.trim();
      if (!trimmed || trimmed.includes('__CANCELLED__')) {
        return { cancelled: true };
      }

      if (fs.existsSync(trimmed)) {
        return { path: path.resolve(trimmed) };
      }

      return { cancelled: true };
    } else if (platform === 'darwin') {
      // macOS AppleScript
      const script = `osascript -e 'POSIX path of (choose folder with prompt "Select folder for NEXORA AI:")'`;
      const { stdout } = await execAsync(script, { timeout: 60000 });
      const chosen = stdout.trim();
      if (chosen && fs.existsSync(chosen)) {
        return { path: chosen };
      }
      return { cancelled: true };
    } else {
      // Linux: Try zenity first, then kdialog
      try {
        const { stdout } = await execAsync('zenity --file-selection --directory --title="Select Folder for NEXORA AI"', {
          timeout: 60000,
        });
        const chosen = stdout.trim();
        if (chosen && fs.existsSync(chosen)) {
          return { path: chosen };
        }
      } catch {
        try {
          const { stdout } = await execAsync('kdialog --getexistingdirectory', { timeout: 60000 });
          const chosen = stdout.trim();
          if (chosen && fs.existsSync(chosen)) {
            return { path: chosen };
          }
        } catch {
          return {
            error: 'NO_NATIVE_DIALOG_AVAILABLE',
          };
        }
      }
      return { cancelled: true };
    }
  } catch (err: any) {
    return {
      error: 'NATIVE_DIALOG_FAILED',
    };
  }
}
