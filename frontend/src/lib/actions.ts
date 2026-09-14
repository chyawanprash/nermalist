/**
 * Orchestration layer: calls the Tauri command wrappers, updates the
 * relevant stores, and normalizes failures into `appState.error`.
 * Components call these instead of touching `tauri/` or the stores
 * directly, so the "what happens on unlock" logic lives in one place.
 */
import { vault } from '$lib/tauri/vault';
import { notes } from '$lib/tauri/notes';
import { drive } from '$lib/tauri/drive';
import { projects } from '$lib/tauri/projects';
import { appState } from '$lib/stores/app.svelte';
import { vaultState } from '$lib/stores/vault.svelte';
import { notesState } from '$lib/stores/notes.svelte';
import { driveState } from '$lib/stores/drive.svelte';
import { projectsState } from '$lib/stores/projects.svelte';
import { uiState } from '$lib/stores/ui.svelte';
import type { EnvRow } from '$lib/types/project';
import { recentVaultsState } from '$lib/stores/recentVaults.svelte';
import type { AppError } from '$lib/types/app';
import type { CreateVaultInput, UnlockVaultInput, ChangePasswordInput } from '$lib/types/vault';
import { logAppError } from '$lib/tauri/errors';

function handle(context: string, error: unknown): void {
  const appError = error as AppError;
  logAppError(context, appError);
  appState.setError(appError);
}

export const actions = {
  async createVault(input: CreateVaultInput): Promise<boolean> {
    appState.startLoading('Creating vault…');
    try {
      const info = await vault.create(input);
      vaultState.setUnlocked(info);
      recentVaultsState.touch(info);
      await this.loadWorkspace();
      appState.goTo('vault-unlocked');
      return true;
    } catch (err) {
      handle('createVault', err);
      return false;
    } finally {
      appState.stopLoading();
    }
  },

  async openVaultFlow(): Promise<void> {
    const path = await vault.pickVaultFile();
    if (!path) return;
    await this.openVaultByPath(path);
  },

  /** Reopens a vault whose path is already known, e.g. from the recent-vaults list. */
  async openVaultByPath(path: string): Promise<void> {
    appState.startLoading('Opening vault…');
    try {
      const summary = await vault.open(path);
      vaultState.selectLocked(summary);
      recentVaultsState.touch(summary);
      appState.goTo('vault-locked');
    } catch (err) {
      const appError = err as AppError;
      if (appError.code === 'VAULT_NOT_FOUND') recentVaultsState.remove(path);
      handle('openVault', err);
    } finally {
      appState.stopLoading();
    }
  },

  async unlockVault(input: UnlockVaultInput): Promise<boolean> {
    vaultState.isUnlocking = true;
    appState.clearError();
    try {
      const info = await vault.unlock(input);
      vaultState.setUnlocked(info);
      recentVaultsState.touch(info);
      await this.loadWorkspace();
      appState.goTo('vault-unlocked');
      return true;
    } catch (err) {
      handle('unlockVault', err);
      return false;
    } finally {
      vaultState.isUnlocking = false;
    }
  },

  async lockVault(): Promise<void> {
    await this.flushPendingSave();
    try {
      await vault.lock();
    } catch (err) {
      handle('lockVault', err);
    }
    notesState.clear();
    driveState.clear();
    projectsState.clear();
    vaultState.relock();
    uiState.closeAllOverlays();
    appState.goTo('vault-locked');
  },

  async closeVault(): Promise<void> {
    await this.flushPendingSave();
    try {
      await vault.close();
    } catch (err) {
      handle('closeVault', err);
    }
    notesState.clear();
    driveState.clear();
    projectsState.clear();
    vaultState.reset();
    uiState.closeAllOverlays();
    appState.goTo('no-vault');
  },

  /** Export the currently unlocked vault as a `.nermal` backup file. Returns false if cancelled or failed. */
  async exportVault(): Promise<boolean> {
    if (!vaultState.current) return false;
    const destination = await vault.pickExportDestination(vaultState.current.name);
    if (!destination) return false;

    appState.startLoading('Exporting vault…');
    try {
      await this.flushPendingSave();
      await vault.export(destination);
      return true;
    } catch (err) {
      handle('exportVault', err);
      return false;
    } finally {
      appState.stopLoading();
    }
  },

  async changePassword(input: ChangePasswordInput): Promise<boolean> {
    appState.startLoading('Changing password…');
    try {
      await vault.changePassword(input);
      return true;
    } catch (err) {
      handle('changePassword', err);
      return false;
    } finally {
      appState.stopLoading();
    }
  },

  async loadNotes(): Promise<void> {
    try {
      const list = await notes.list();
      notesState.setAll(list);
    } catch (err) {
      handle('loadNotes', err);
    }
  },

  async loadWorkspace(): Promise<void> {
    await Promise.all([this.loadNotes(), this.loadDrive(), this.loadProjects()]);
  },

  async loadDrive(): Promise<void> {
    try {
      const entries = await drive.list();
      driveState.setAll(entries);
    } catch (err) {
      handle('loadDrive', err);
    }
  },

  async createDriveFolder(name: string): Promise<void> {
    try {
      const entry = await drive.createFolder(name, driveState.currentFolderId);
      driveState.upsert(entry);
    } catch (err) {
      handle('createDriveFolder', err);
    }
  },

  async uploadDriveFiles(files: FileList | File[]): Promise<void> {
    for (const file of Array.from(files)) {
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const entry = await drive.uploadFile(
          file.name,
          driveState.currentFolderId,
          file.type || null,
          data,
        );
        driveState.upsert(entry);
      } catch (err) {
        handle('uploadDriveFiles', err);
      }
    }
  },

  async deleteDriveEntry(id: string): Promise<void> {
    try {
      await drive.delete(id);
      driveState.remove(id);
    } catch (err) {
      handle('deleteDriveEntry', err);
    }
  },

  async downloadDriveFile(id: string, name: string): Promise<void> {
    const destination = await drive.pickExportDestination(name);
    if (!destination) return;
    try {
      await drive.exportToDisk(id, destination);
    } catch (err) {
      handle('downloadDriveFile', err);
    }
  },

  async loadProjects(): Promise<void> {
    try {
      const list = await projects.list();
      projectsState.setAll(list);
    } catch (err) {
      handle('loadProjects', err);
    }
  },

  async createProject(name: string): Promise<void> {
    try {
      const project = await projects.create(name);
      projectsState.upsert(project);
      projectsState.select(project.id);
    } catch (err) {
      handle('createProject', err);
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await projects.delete(id);
      projectsState.remove(id);
    } catch (err) {
      handle('deleteProject', err);
    }
  },

  async saveProjectEnvRows(id: string, rows: EnvRow[]): Promise<void> {
    try {
      const project = await projects.updateEnvRows(id, rows);
      projectsState.upsert(project);
    } catch (err) {
      handle('saveProjectEnvRows', err);
    }
  },

  async createNote(): Promise<void> {
    try {
      const note = await notes.create();
      notesState.upsert(note);
      notesState.select(note.id);
    } catch (err) {
      handle('createNote', err);
    }
  },

  async saveNote(id: string, title: string, content: string): Promise<void> {
    notesState.markSaving();
    try {
      const note = await notes.update({ id, title, content });
      notesState.upsert(note);
      notesState.markSaved();
    } catch (err) {
      notesState.markSaveError();
      handle('saveNote', err);
    }
  },

  async deleteNote(id: string): Promise<void> {
    try {
      await notes.delete(id);
      notesState.remove(id);
    } catch (err) {
      handle('deleteNote', err);
    }
  },

  /** Best-effort bulk delete: removes every note that succeeds, surfaces one error if any fail. */
  async deleteNotes(ids: string[]): Promise<void> {
    const deleted: string[] = [];
    let lastErr: unknown = null;
    for (const id of ids) {
      try {
        await notes.delete(id);
        deleted.push(id);
      } catch (err) {
        lastErr = err;
      }
    }
    if (deleted.length > 0) notesState.removeMany(deleted);
    notesState.exitSelectionMode();
    if (lastErr) handle('deleteNotes', lastErr);
  },

  /** Placeholder the editor overrides via `registerFlush`; ensures Cmd+S / lock / close never drop input. */
  flushPendingSave: (() => Promise.resolve()) as () => Promise<void>,

  registerFlush(fn: () => Promise<void>) {
    this.flushPendingSave = fn;
  },
};
