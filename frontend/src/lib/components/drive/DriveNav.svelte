<script lang="ts">
  import { PlusOutline, ArrowUpOutline, TrashBinOutline, InfoCircleOutline } from 'flowbite-svelte-icons';
  import { driveState } from '$lib/stores/drive.svelte';
  import { actions } from '$lib/actions';
  import DriveFileInfoDialog from './DriveFileInfoDialog.svelte';

  let fileInput: HTMLInputElement | undefined = $state();
  let isDragOver = $state(false);
  let infoEntryId = $state<string | null>(null);

  function onFilesPicked(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) actions.uploadDriveFiles(files);
    (e.target as HTMLInputElement).value = '';
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    isDragOver = true;
  }

  function onDragLeave() {
    isDragOver = false;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) actions.uploadDriveFiles(files);
  }

  function newFolder() {
    const name = prompt('Folder name');
    if (name && name.trim()) actions.createDriveFolder(name.trim());
  }

  function openEntry(id: string, kind: string) {
    if (kind === 'folder') {
      driveState.openFolder(id);
    } else {
      driveState.selectFile(id);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<div class="flex flex-col gap-2 p-2.5">
  <div class="flex items-center gap-1.5">
    {#if driveState.currentFolderId !== null}
      <button
        type="button"
        class="flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
        style="border-color: var(--border-subtle); color: var(--text-tertiary); background: var(--surface-panel)"
        title="Up one level"
        onclick={() =>
          driveState.openFolder(driveState.breadcrumbs.at(-2)?.id ?? null)}
      >
        <ArrowUpOutline class="h-3.5 w-3.5" />
      </button>
    {/if}
    <span class="min-w-0 flex-1 truncate text-xs" style="color: var(--text-tertiary)">
      {driveState.breadcrumbs.length > 0
        ? driveState.breadcrumbs.map((b) => b.name).join(' / ')
        : 'Drive'}
    </span>
  </div>

  <div class="flex items-center gap-1.5">
    <button
      type="button"
      class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 active:opacity-80"
      style="background: var(--color-accent-500); color: var(--text-on-accent)"
      onclick={() => fileInput?.click()}
    >
      <PlusOutline class="h-3.5 w-3.5" />
      Upload
    </button>
    <button
      type="button"
      class="flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
      style="border-color: var(--border-subtle); color: var(--text-tertiary); background: var(--surface-panel)"
      title="New folder"
      onclick={newFolder}
    >
      +Folder
    </button>
  </div>
  <input bind:this={fileInput} type="file" multiple class="hidden" onchange={onFilesPicked} />
</div>

<div
  class="min-h-0 flex-1 overflow-y-auto rounded-md px-1.5 pb-2.5 transition-colors"
  style={isDragOver ? 'background: var(--surface-hover); outline: 2px dashed var(--color-accent-500); outline-offset: -2px' : ''}
  role="region"
  aria-label="Drive files"
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
>
  {#if isDragOver}
    <p class="px-2 py-4 text-center text-xs" style="color: var(--text-secondary)">
      Drop to upload
    </p>
  {:else}
  {#each driveState.inCurrentFolder as entry (entry.id)}
    <div
      class="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
      style={driveState.activeFileId === entry.id ? 'background: var(--surface-hover)' : ''}
    >
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        style="color: var(--text-secondary)"
        onclick={() => openEntry(entry.id, entry.kind)}
      >
        <span>{entry.kind === 'folder' ? '📁' : '📄'}</span>
        <span class="min-w-0 flex-1 truncate">{entry.name}</span>
        {#if entry.kind === 'file'}
          <span class="shrink-0 text-xs" style="color: var(--text-tertiary)"
            >{formatSize(entry.size)}</span
          >
        {/if}
      </button>
      {#if entry.kind === 'file'}
        <button
          type="button"
          class="hidden shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:bg-[var(--surface-hover)] group-hover:flex"
          style="color: var(--text-tertiary)"
          title="Info"
          onclick={() => (infoEntryId = entry.id)}
        >
          <InfoCircleOutline class="h-3.5 w-3.5" />
        </button>
      {/if}
      <button
        type="button"
        class="hidden shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:bg-[var(--surface-hover)] group-hover:flex"
        style="color: var(--color-danger-500)"
        title="Delete"
        onclick={() => actions.deleteDriveEntry(entry.id)}
      >
        <TrashBinOutline class="h-3.5 w-3.5" />
      </button>
    </div>
  {:else}
    <p class="px-2 py-4 text-center text-xs" style="color: var(--text-tertiary)">
      Empty. Upload files, drag and drop, or create a folder.
    </p>
  {/each}
  {/if}
</div>

<DriveFileInfoDialog entryId={infoEntryId} onclose={() => (infoEntryId = null)} />
