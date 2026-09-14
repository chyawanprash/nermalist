<script lang="ts">
  import { driveState } from '$lib/stores/drive.svelte';
  import { actions } from '$lib/actions';

  const file = $derived(driveState.activeFile);
</script>

<div class="flex h-full items-center justify-center">
  {#if file}
    <div class="flex flex-col items-center gap-3 text-center">
      <span class="text-5xl">📄</span>
      <p class="text-lg font-medium" style="color: var(--text-primary)">{file.name}</p>
      <p class="text-sm" style="color: var(--text-tertiary)">{file.mimeType ?? 'Unknown type'}</p>
      <button
        type="button"
        class="mt-2 rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 active:opacity-80"
        style="background: var(--color-accent-500); color: var(--text-on-accent)"
        onclick={() => actions.downloadDriveFile(file.id, file.name)}
      >
        Download
      </button>
    </div>
  {:else}
    <p class="text-sm" style="color: var(--text-tertiary)">Select a file from Drive to preview it.</p>
  {/if}
</div>
