<script lang="ts">
  import { appState } from '$lib/stores/app.svelte';
  import { uiState } from '$lib/stores/ui.svelte';
  import { notesState } from '$lib/stores/notes.svelte';
  import { actions } from '$lib/actions';
  import { SHORTCUTS } from '$lib/config/shortcuts';
  import { matchesShortcut, isTypingTarget } from '$lib/utils/keyboard';
  import { updateState } from '$lib/stores/update.svelte';

  import WelcomeScreen from './WelcomeScreen.svelte';
  import TopBar from './TopBar.svelte';
  import UpdateBanner from './UpdateBanner.svelte';
  import UnlockVault from '$lib/components/vault/UnlockVault.svelte';
  import Sidebar from '$lib/components/notes/Sidebar.svelte';
  import NoteContextMenu from '$lib/components/notes/NoteContextMenu.svelte';
  import DeleteNotesBulkDialog from '$lib/components/notes/DeleteNotesBulkDialog.svelte';
  import NoteEditor from '$lib/components/editor/NoteEditor.svelte';
  import DriveFilePreview from '$lib/components/drive/DriveFilePreview.svelte';
  import EnvTable from '$lib/components/projects/EnvTable.svelte';
  import CreateVaultDialog from '$lib/components/vault/CreateVaultDialog.svelte';
  import ChangePasswordDialog from '$lib/components/vault/ChangePasswordDialog.svelte';
  import SearchDialog from '$lib/components/search/SearchDialog.svelte';
  import CommandPalette from '$lib/components/dialogs/CommandPalette.svelte';
  import SettingsDialog from '$lib/components/dialogs/SettingsDialog.svelte';
  import ErrorToast from '$lib/components/common/ErrorToast.svelte';

  function runShortcut(id: string) {
    switch (id) {
      case 'new-note':
        actions.createNote();
        break;
      case 'command-palette':
        uiState.commandPaletteOpen = !uiState.commandPaletteOpen;
        break;
      case 'save':
        actions.flushPendingSave();
        break;
      case 'lock-vault':
        actions.lockVault();
        break;
      case 'settings':
        uiState.openDialog('settings');
        break;
    }
  }

  /** Suppresses the WebView's native "Reload / Inspect Element" menu, but leaves
   * it available on editable elements so Cut/Copy/Paste still work. */
  function oncontextmenu(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('input, textarea, [contenteditable="true"]')) {
      e.preventDefault();
    }
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (uiState.activeDialog === null && notesState.selectionMode) {
        notesState.exitSelectionMode();
        return;
      }
      uiState.closeAllOverlays();
      return;
    }
    if (appState.screen !== 'vault-unlocked') return;

    for (const shortcut of SHORTCUTS) {
      if (!shortcut.allowWhileTyping && isTypingTarget(e.target)) continue;
      if (matchesShortcut(e, shortcut.keys)) {
        e.preventDefault();
        runShortcut(shortcut.id);
        return;
      }
    }
  }

  $effect(() => {
    updateState.loadCurrentVersion();
    updateState.checkIfDue();
  });
</script>

<svelte:window {onkeydown} {oncontextmenu} />

<div class="h-screen w-screen overflow-hidden" style="background: var(--surface-app)">
  {#if appState.isInitializing}
    <div class="flex h-full items-center justify-center">
      <p class="text-sm" style="color: var(--text-tertiary)">Loading…</p>
    </div>
  {:else if appState.screen === 'no-vault'}
    <WelcomeScreen />
  {:else if appState.screen === 'vault-locked'}
    <UnlockVault />
  {:else}
    <div class="flex h-full flex-col">
      <TopBar />
      <UpdateBanner />
      <div class="flex min-h-0 flex-1">
        {#if uiState.sidebarOpen}
          <Sidebar />
        {/if}
        <main class="min-w-0 flex-1">
          {#if uiState.mainView === 'drive'}
            <DriveFilePreview />
          {:else if uiState.mainView === 'projects'}
            <EnvTable />
          {:else}
            <NoteEditor />
          {/if}
        </main>
      </div>
    </div>
  {/if}
</div>

<NoteContextMenu />
<DeleteNotesBulkDialog />
<CreateVaultDialog />
<ChangePasswordDialog />
<SearchDialog />
<CommandPalette />
<SettingsDialog />
<ErrorToast />
