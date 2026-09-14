import { invoke } from '@tauri-apps/api/core';
import type { EnvRow, Project } from '$lib/types/project';
import { toAppError } from './errors';

export const projects = {
  /** `list_projects() -> Project[]` */
  async list(): Promise<Project[]> {
    try {
      return await invoke<Project[]>('list_projects');
    } catch (err) {
      throw toAppError(err);
    }
  },

  /** `create_project(name: string) -> Project` */
  async create(name: string): Promise<Project> {
    try {
      return await invoke<Project>('create_project', { name });
    } catch (err) {
      throw toAppError(err);
    }
  },

  /** `rename_project(id: string, name: string) -> Project` */
  async rename(id: string, name: string): Promise<Project> {
    try {
      return await invoke<Project>('rename_project', { id, name });
    } catch (err) {
      throw toAppError(err);
    }
  },

  /** `update_project_env_rows(id: string, rows: EnvRow[]) -> Project` */
  async updateEnvRows(id: string, rows: EnvRow[]): Promise<Project> {
    try {
      return await invoke<Project>('update_project_env_rows', { id, rows });
    } catch (err) {
      throw toAppError(err);
    }
  },

  /** `delete_project(id: string) -> void` */
  async delete(id: string): Promise<void> {
    try {
      await invoke('delete_project', { id });
    } catch (err) {
      throw toAppError(err);
    }
  },
};
