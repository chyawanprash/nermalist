<script lang="ts">
  import { PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
  import { projectsState } from '$lib/stores/projects.svelte';
  import { actions } from '$lib/actions';
  import type { EnvRow } from '$lib/types/project';

  const project = $derived(projectsState.activeProject);

  let rows = $state<EnvRow[]>([]);
  let pasteText = $state('');
  let loadedForId: string | null = null;

  $effect(() => {
    if (project && project.id !== loadedForId) {
      rows = project.envRows.length > 0 ? project.envRows.map((r) => [...r] as EnvRow) : [];
      pasteText = '';
      loadedForId = project.id;
    }
  });

  function save() {
    if (project) actions.saveProjectEnvRows(project.id, rows);
  }

  /** Parses `KEY=value` lines (the `=` is the delimiter and never kept) into the table. */
  function fillFromPaste() {
    const parsed: EnvRow[] = pasteText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const eq = line.indexOf('=');
        return eq === -1 ? ([line, ''] as EnvRow) : ([line.slice(0, eq), line.slice(eq + 1)] as EnvRow);
      });
    if (parsed.length === 0) return;
    rows = [...rows, ...parsed];
    pasteText = '';
    save();
  }

  function addRow() {
    rows = [...rows, ['', '']];
  }

  function removeRow(index: number) {
    rows = rows.filter((_, i) => i !== index);
    save();
  }

  function updateCell(index: number, col: 0 | 1, value: string) {
    rows = rows.map((r, i) => (i === index ? ([col === 0 ? value : r[0], col === 1 ? value : r[1]] as EnvRow) : r));
  }
</script>

{#if project}
  <div class="flex h-full flex-col gap-4 overflow-y-auto p-6">
    <h1 class="text-lg font-semibold" style="color: var(--text-primary)">{project.name}</h1>

    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-medium" style="color: var(--text-secondary)" for="env-paste">
        Paste env vars (KEY=value per line)
      </label>
      <textarea
        id="env-paste"
        class="w-full rounded-md border p-2 text-sm font-mono"
        style="border-color: var(--border-subtle); background: var(--surface-panel); color: var(--text-primary)"
        rows="3"
        placeholder={'Env1=jkfgk\nEnv2=jkfgk\nEnv3=jkfgk'}
        bind:value={pasteText}
        onchange={fillFromPaste}
      ></textarea>
    </div>

    <table class="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th class="border-b px-2 py-1.5 text-left font-medium" style="border-color: var(--border-subtle); color: var(--text-tertiary)">Key</th>
          <th class="border-b px-2 py-1.5 text-left font-medium" style="border-color: var(--border-subtle); color: var(--text-tertiary)">Value</th>
          <th class="border-b" style="border-color: var(--border-subtle); width: 2rem"></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row, i (i)}
          <tr>
            <td class="border-b p-0" style="border-color: var(--border-subtle)">
              <input
                class="w-full bg-transparent px-2 py-1.5 font-mono outline-none"
                style="color: var(--text-primary)"
                value={row[0]}
                oninput={(e) => updateCell(i, 0, (e.target as HTMLInputElement).value)}
                onblur={save}
              />
            </td>
            <td class="border-b p-0" style="border-color: var(--border-subtle)">
              <input
                class="w-full bg-transparent px-2 py-1.5 font-mono outline-none"
                style="color: var(--text-primary)"
                value={row[1]}
                oninput={(e) => updateCell(i, 1, (e.target as HTMLInputElement).value)}
                onblur={save}
              />
            </td>
            <td class="border-b text-center" style="border-color: var(--border-subtle)">
              <button
                type="button"
                class="rounded-md p-1 transition-colors hover:bg-[var(--surface-hover)]"
                style="color: var(--color-danger-500)"
                title="Delete row"
                onclick={() => removeRow(i)}
              >
                <TrashBinOutline class="h-3.5 w-3.5" />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <button
      type="button"
      class="flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
      style="border-color: var(--border-subtle); color: var(--text-secondary)"
      onclick={addRow}
    >
      <PlusOutline class="h-3.5 w-3.5" />
      Add row
    </button>
  </div>
{:else}
  <div class="flex h-full items-center justify-center">
    <p class="text-sm" style="color: var(--text-tertiary)">Select or create a project.</p>
  </div>
{/if}
