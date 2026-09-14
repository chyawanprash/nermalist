import type { EditorPreferences, Theme } from '$lib/types/app';

export type DialogName =
  | 'create-vault'
  | 'change-password'
  | 'delete-note'
  | 'delete-notes-bulk'
  | 'settings'
  | null;

const THEME_STORAGE_KEY = 'nermal:theme';
const EDITOR_PREFS_STORAGE_KEY = 'nermal:editor-preferences';

const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 16,
  lineHeight: 1.7,
  wordWrap: true,
};

/**
 * Pure UI/interaction state — panels, dialogs, theme. Nothing here is
 * sensitive, so (unlike vault/notes state) it's fine for `theme` to persist
 * across launches via localStorage.
 */
export interface NoteContextMenuState {
  noteId: string;
  x: number;
  y: number;
}

/** Which section of the sidebar/main pane is showing. */
export type MainView = 'notes' | 'drive' | 'projects';

class UiState {
  sidebarOpen = $state(true);
  mainView = $state<MainView>('notes');
  searchOpen = $state(false);
  commandPaletteOpen = $state(false);
  activeDialog = $state<DialogName>(null);
  theme = $state<Theme>(readStoredTheme());
  editorPreferences = $state<EditorPreferences>(readStoredEditorPreferences());
  noteContextMenu = $state<NoteContextMenuState | null>(null);
  /** Masks note titles/content on screen for screen-sharing/streaming. Resets on relaunch. */
  streamerMode = $state(false);

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  openNoteContextMenu(noteId: string, x: number, y: number) {
    this.noteContextMenu = { noteId, x, y };
  }

  closeNoteContextMenu() {
    this.noteContextMenu = null;
  }

  toggleStreamerMode() {
    this.streamerMode = !this.streamerMode;
  }

  openDialog(name: DialogName) {
    this.activeDialog = name;
  }

  closeDialog() {
    this.activeDialog = null;
  }

  closeAllOverlays() {
    this.searchOpen = false;
    this.commandPaletteOpen = false;
    this.activeDialog = null;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  }

  setEditorPreferences(prefs: Partial<EditorPreferences>) {
    this.editorPreferences = { ...this.editorPreferences, ...prefs };
    localStorage.setItem(EDITOR_PREFS_STORAGE_KEY, JSON.stringify(this.editorPreferences));
  }
}

function readStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function readStoredEditorPreferences(): EditorPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_EDITOR_PREFERENCES;
  try {
    const stored = localStorage.getItem(EDITOR_PREFS_STORAGE_KEY);
    if (!stored) return DEFAULT_EDITOR_PREFERENCES;
    return { ...DEFAULT_EDITOR_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_EDITOR_PREFERENCES;
  }
}

export function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

export const uiState = new UiState();
