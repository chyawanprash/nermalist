export type DriveEntryKind = 'folder' | 'file';

export interface DriveEntry {
  id: string;
  parentId: string | null;
  name: string;
  kind: DriveEntryKind;
  mimeType: string | null;
  size: number;
  createdAt: string;
}
