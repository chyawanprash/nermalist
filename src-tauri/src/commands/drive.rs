use std::path::PathBuf;

use tauri::State;

use super::{persist, VaultError};
use crate::models::drive::{DriveEntry, DriveEntryKind, DriveEntryMeta};
use crate::AppState;

#[tauri::command]
pub fn list_drive_entries(state: State<'_, AppState>) -> Result<Vec<DriveEntryMeta>, VaultError> {
    let guard = state.vault.lock().unwrap();
    let vault = guard.as_ref().ok_or(VaultError::NoVaultOpen)?;
    Ok(vault.drive.iter().map(DriveEntryMeta::from).collect())
}

#[tauri::command]
pub fn create_drive_folder(
    name: String,
    parent_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<DriveEntryMeta, VaultError> {
    let mut guard = state.vault.lock().unwrap();
    let vault = guard.as_mut().ok_or(VaultError::NoVaultOpen)?;

    let entry = DriveEntry {
        id: uuid::Uuid::new_v4().to_string(),
        parent_id,
        name,
        kind: DriveEntryKind::Folder,
        mime_type: None,
        data: vec![],
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    vault.drive.push(entry);
    persist(vault)?;
    Ok(DriveEntryMeta::from(vault.drive.last().unwrap()))
}

#[tauri::command]
pub fn upload_drive_file(
    name: String,
    parent_id: Option<String>,
    mime_type: Option<String>,
    data: Vec<u8>,
    state: State<'_, AppState>,
) -> Result<DriveEntryMeta, VaultError> {
    let mut guard = state.vault.lock().unwrap();
    let vault = guard.as_mut().ok_or(VaultError::NoVaultOpen)?;

    let entry = DriveEntry {
        id: uuid::Uuid::new_v4().to_string(),
        parent_id,
        name,
        kind: DriveEntryKind::File,
        mime_type,
        data,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    vault.drive.push(entry);
    persist(vault)?;
    Ok(DriveEntryMeta::from(vault.drive.last().unwrap()))
}

#[tauri::command]
pub fn get_drive_file_data(id: String, state: State<'_, AppState>) -> Result<Vec<u8>, VaultError> {
    let guard = state.vault.lock().unwrap();
    let vault = guard.as_ref().ok_or(VaultError::NoVaultOpen)?;
    vault
        .drive
        .iter()
        .find(|e| e.id == id)
        .map(|e| e.data.clone())
        .ok_or(VaultError::DriveEntryNotFound(id))
}

/// Writes a Drive file's bytes to a destination on disk, for downloading.
#[tauri::command]
pub fn export_drive_file(
    id: String,
    destination: String,
    state: State<'_, AppState>,
) -> Result<(), VaultError> {
    let guard = state.vault.lock().unwrap();
    let vault = guard.as_ref().ok_or(VaultError::NoVaultOpen)?;

    let entry = vault
        .drive
        .iter()
        .find(|e| e.id == id)
        .ok_or(VaultError::DriveEntryNotFound(id))?;

    std::fs::write(PathBuf::from(&destination), &entry.data)
        .map_err(|e| VaultError::SaveFailed(e.to_string()))?;
    Ok(())
}

/// Deletes an entry. If it's a folder, deletes its whole subtree too.
#[tauri::command]
pub fn delete_drive_entry(id: String, state: State<'_, AppState>) -> Result<(), VaultError> {
    let mut guard = state.vault.lock().unwrap();
    let vault = guard.as_mut().ok_or(VaultError::NoVaultOpen)?;

    if !vault.drive.iter().any(|e| e.id == id) {
        return Err(VaultError::DriveEntryNotFound(id));
    }

    let mut to_remove = vec![id];
    let mut i = 0;
    while i < to_remove.len() {
        let parent = to_remove[i].clone();
        to_remove.extend(
            vault
                .drive
                .iter()
                .filter(|e| e.parent_id.as_deref() == Some(parent.as_str()))
                .map(|e| e.id.clone()),
        );
        i += 1;
    }

    vault.drive.retain(|e| !to_remove.contains(&e.id));
    persist(vault)?;
    Ok(())
}
