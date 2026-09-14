<script lang="ts">
  import { Modal } from 'flowbite-svelte';
  import { driveState } from '$lib/stores/drive.svelte';
  import { drive } from '$lib/tauri/drive';

  let { entryId, onclose }: { entryId: string | null; onclose: () => void } = $props();

  const entry = $derived(entryId ? (driveState.entries.find((e) => e.id === entryId) ?? null) : null);

  let exif = $state<Record<string, unknown> | null>(null);
  let exifStatus = $state<'idle' | 'loading' | 'none' | 'error'>('idle');
  let loadedForId: string | null = null;

  $effect(() => {
    if (!entry) return;
    if (loadedForId === entry.id) return;
    loadedForId = entry.id;
    exif = null;

    if (!entry.mimeType?.startsWith('image/')) {
      exifStatus = 'none';
      return;
    }

    exifStatus = 'loading';
    (async () => {
      try {
        const { default: exifr } = await import('exifr');
        const bytes = await drive.getFileData(entry.id);
        const tags = await exifr.parse(bytes);
        if (tags && Object.keys(tags).length > 0) {
          exif = tags;
          exifStatus = 'idle';
        } else {
          exifStatus = 'none';
        }
      } catch {
        exifStatus = 'error';
      }
    })();
  });

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatValue(value: unknown): string {
    if (value instanceof Date) return value.toLocaleString();
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  // Thumbnail/maker-note blobs are noisy and not useful to show.
  const HIDDEN_EXIF_KEYS = new Set(['thumbnail', 'ThumbnailOffset', 'ThumbnailLength', 'MakerNote', 'UserComment']);
</script>

<Modal open={entryId !== null} onclose={onclose} size="md" title={entry?.name ?? 'File info'}>
  {#if entry}
    <div class="space-y-4 text-sm">
      <table class="w-full">
        <tbody>
          <tr>
            <td class="py-1 pr-4 font-medium" style="color: var(--text-tertiary)">Type</td>
            <td style="color: var(--text-primary)">{entry.mimeType ?? 'Unknown'}</td>
          </tr>
          <tr>
            <td class="py-1 pr-4 font-medium" style="color: var(--text-tertiary)">Size</td>
            <td style="color: var(--text-primary)">{formatSize(entry.size)}</td>
          </tr>
          <tr>
            <td class="py-1 pr-4 font-medium" style="color: var(--text-tertiary)">Uploaded</td>
            <td style="color: var(--text-primary)">{new Date(entry.createdAt).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {#if entry.mimeType?.startsWith('image/')}
        <div>
          <h3 class="mb-1.5 text-xs font-semibold uppercase" style="color: var(--text-tertiary)">
            EXIF data
          </h3>
          {#if exifStatus === 'loading'}
            <p class="text-xs" style="color: var(--text-tertiary)">Reading…</p>
          {:else if exifStatus === 'error'}
            <p class="text-xs" style="color: var(--text-tertiary)">Could not read EXIF data.</p>
          {:else if exifStatus === 'none'}
            <p class="text-xs" style="color: var(--text-tertiary)">No EXIF data found.</p>
          {:else if exif}
            <table class="w-full">
              <tbody>
                {#each Object.entries(exif).filter(([k]) => !HIDDEN_EXIF_KEYS.has(k)) as [key, value] (key)}
                  <tr>
                    <td class="py-1 pr-4 align-top font-medium" style="color: var(--text-tertiary)">{key}</td>
                    <td class="break-all align-top" style="color: var(--text-primary)">{formatValue(value)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</Modal>
