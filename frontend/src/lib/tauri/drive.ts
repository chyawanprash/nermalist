import { invoke } from '@tauri-apps/api/core';
import { save as saveDialog } from '@tauri-apps/plugin-dialog';
import type { DriveEntry } from '$lib/types/drive';
import { toAppError } from './errors';

export const drive = {
  /** `list_drive_entries() -> DriveEntryMeta[]` */
  async list(): Promise<DriveEntry[]> {
    try {
      return await invoke<DriveEntry[]>('list_drive_entries');
    } catch (err) {
      throw toAppError(err);
    }
  },

  /** `create_drive_folder(name: string, parentId?: string) -> DriveEntryMeta` */
  async createFolder(name: string, parentId: string | null): Promise<DriveEntry> {
    try {
      return await invoke<DriveEntry>('create_drive_folder', { name, parentId });
    } catch (err) {
      throw toAppError(err);
    }
  },

  /** `upload_drive_file(name, parentId?, mimeType?, data: number[]) -> DriveEntryMeta` */
  async uploadFile(
    name: string,
    parentId: string | null,
    mimeType: string | null,
    data: Uint8Array,
  ): Promise<DriveEntry> {
    try {
      return await invoke<DriveEntry>('upload_drive_file', {
        name,
        parentId,
        mimeType,
        data: Array.from(data),
      });
    } catch (err) {
      throw toAppError(err);
    }
  },

  /** `get_drive_file_data(id: string) -> number[]` */
  async getFileData(id: string): Promise<Uint8Array> {
    try {
      const bytes = await invoke<number[]>('get_drive_file_data', { id });
      return new Uint8Array(bytes);
    } catch (err) {
      throw toAppError(err);
    }
  },

  /** `delete_drive_entry(id: string) -> void` */
  async delete(id: string): Promise<void> {
    try {
      await invoke('delete_drive_entry', { id });
    } catch (err) {
      throw toAppError(err);
    }
  },

  /** Native "choose where to save" dialog, defaulting to the entry's own name. */
  async pickExportDestination(suggestedName: string): Promise<string | null> {
    const result = await saveDialog({ defaultPath: suggestedName });
    return typeof result === 'string' ? result : null;
  },

  /** `export_drive_file(id: string, destination: string) -> void` */
  async exportToDisk(id: string, destination: string): Promise<void> {
    try {
      await invoke('export_drive_file', { id, destination });
    } catch (err) {
      throw toAppError(err);
    }
  },
};
