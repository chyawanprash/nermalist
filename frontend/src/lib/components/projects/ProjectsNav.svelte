<script lang="ts">
  import { PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
  import { projectsState } from '$lib/stores/projects.svelte';
  import { actions } from '$lib/actions';

  function newProject() {
    const name = prompt('Project name');
    if (name && name.trim()) actions.createProject(name.trim());
  }
</script>

<div class="flex flex-col gap-2 p-2.5">
  <button
    type="button"
    class="flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 active:opacity-80"
    style="background: var(--color-accent-500); color: var(--text-on-accent)"
    onclick={newProject}
  >
    <PlusOutline class="h-3.5 w-3.5" />
    New Project
  </button>
</div>

<div class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2.5">
  {#each projectsState.projects as project (project.id)}
    <div
      class="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
      style={projectsState.activeProjectId === project.id
        ? 'background: var(--surface-hover)'
        : ''}
    >
      <button
        type="button"
        class="min-w-0 flex-1 truncate text-left"
        style="color: var(--text-secondary)"
        onclick={() => projectsState.select(project.id)}
      >
        {project.name}
      </button>
      <button
        type="button"
        class="hidden shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:bg-[var(--surface-hover)] group-hover:flex"
        style="color: var(--color-danger-500)"
        title="Delete"
        onclick={() => actions.deleteProject(project.id)}
      >
        <TrashBinOutline class="h-3.5 w-3.5" />
      </button>
    </div>
  {:else}
    <p class="px-2 py-4 text-center text-xs" style="color: var(--text-tertiary)">
      No projects yet.
    </p>
  {/each}
</div>
