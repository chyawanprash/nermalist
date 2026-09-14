import type { Project } from '$lib/types/project';

/** All Projects for the currently unlocked vault, held only in memory. */
class ProjectsState {
  projects = $state<Project[]>([]);
  activeProjectId = $state<string | null>(null);

  activeProject = $derived(this.projects.find((p) => p.id === this.activeProjectId) ?? null);

  setAll(projects: Project[]) {
    this.projects = projects;
  }

  upsert(project: Project) {
    const index = this.projects.findIndex((p) => p.id === project.id);
    if (index === -1) {
      this.projects = [...this.projects, project];
    } else {
      this.projects = this.projects.map((p) => (p.id === project.id ? project : p));
    }
  }

  remove(id: string) {
    this.projects = this.projects.filter((p) => p.id !== id);
    if (this.activeProjectId === id) this.activeProjectId = null;
  }

  select(id: string | null) {
    this.activeProjectId = id;
  }

  clear() {
    this.projects = [];
    this.activeProjectId = null;
  }
}

export const projectsState = new ProjectsState();
