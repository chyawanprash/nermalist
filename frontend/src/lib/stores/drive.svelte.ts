import type { DriveEntry } from '$lib/types/drive';

/** All Drive entries for the currently unlocked vault, held only in memory. */
class DriveState {
  entries = $state<DriveEntry[]>([]);
  currentFolderId = $state<string | null>(null);
  activeFileId = $state<string | null>(null);

  activeFile = $derived(this.entries.find((e) => e.id === this.activeFileId) ?? null);

  inCurrentFolder = $derived(
    this.entries
      .filter((e) => e.parentId === this.currentFolderId)
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1)),
  );

  breadcrumbs = $derived.by(() => {
    const trail: DriveEntry[] = [];
    let id = this.currentFolderId;
    while (id) {
      const entry = this.entries.find((e) => e.id === id);
      if (!entry) break;
      trail.unshift(entry);
      id = entry.parentId;
    }
    return trail;
  });

  setAll(entries: DriveEntry[]) {
    this.entries = entries;
  }

  upsert(entry: DriveEntry) {
    const index = this.entries.findIndex((e) => e.id === entry.id);
    if (index === -1) {
      this.entries = [...this.entries, entry];
    } else {
      this.entries = this.entries.map((e) => (e.id === entry.id ? entry : e));
    }
  }

  remove(id: string) {
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.currentFolderId === id) this.currentFolderId = null;
    if (this.activeFileId === id) this.activeFileId = null;
  }

  openFolder(id: string | null) {
    this.currentFolderId = id;
    this.activeFileId = null;
  }

  selectFile(id: string | null) {
    this.activeFileId = id;
  }

  clear() {
    this.entries = [];
    this.currentFolderId = null;
    this.activeFileId = null;
  }
}

export const driveState = new DriveState();
