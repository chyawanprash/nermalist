use std::path::PathBuf;

use tauri::State;

use super::{persist, validate_password_length, VaultError};
use crate::models::vault::{VaultInfo, VaultPayload, VaultSummary};
use crate::vault::crypto::{self, CryptoError, KdfParams};
use crate::vault::format::{self, VaultHeader};
use crate::vault::storage;
use crate::AppState;
use crate::OpenVault;

fn vault_info(path: &str, name: &str, note_count: usize) -> VaultInfo {
    VaultInfo {
        id: path.to_owned(),
        name: name.to_owned(),
        path: path.to_owned(),
        note_count,
        last_modified_at: chrono::Utc::now().to_rfc3339(),
    }
}

#[tauri::command]
pub fn create_vault(
    directory: String,
    name: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<VaultInfo, VaultError> {
    validate_password_length(&password)?;

    let path = PathBuf::from(&directory).join(format!("{name}.nermal"));

    if path.exists() {
        return Err(VaultError::SaveFailed(
            "a vault with this name already exists in this directory".into(),
        ));
    }

    let kdf_params = KdfParams::default();
    let salt = crypto::generate_salt();
    let nonce = crypto::generate_nonce();
    let key = crypto::derive_key(password.as_bytes(), &salt, &kdf_params)?;

    let payload = VaultPayload {
        name: name.clone(),
        notes: vec![],
        drive: vec![],
        projects: vec![],
    };
    let serialized =
        bincode::serialize(&payload).map_err(|e| VaultError::SaveFailed(e.to_string()))?;
    let compressed = vault_compression::compress(&serialized)?;
    let ciphertext = crypto::encrypt(&*key, &nonce, &compressed)?;

    let header = VaultHeader::new(kdf_params, salt, nonce);
    let file_data = format::encode_vault(&header, &ciphertext);
    storage::write_vault(&path, &file_data)
        .map_err(|e| VaultError::SaveFailed(e.to_string()))?;

    let path_str = path.to_string_lossy().to_string();
    let info = vault_info(&path_str, &name, 0);

    let mut guard = state.vault.lock().unwrap();
    *guard = Some(OpenVault {
        path,
        name,
        key,
        kdf_params,
        salt,
        notes: vec![],
        drive: vec![],
        projects: vec![],
    });

    Ok(info)
}

#[tauri::command]
pub fn open_vault(path: String) -> Result<VaultSummary, VaultError> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(VaultError::NotFound);
    }

    let file_data = storage::read_vault(&path_buf).map_err(|_| VaultError::NotFound)?;
    let (_header, _ciphertext) = format::decode_vault(&file_data)?;

    let name = path_buf
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Vault")
        .to_string();

    Ok(VaultSummary {
        id: path.clone(),
        name,
        path,
    })
}

#[tauri::command]
pub fn unlock_vault(
    path: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<VaultInfo, VaultError> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(VaultError::NotFound);
    }

    let file_data = storage::read_vault(&path_buf).map_err(|_| VaultError::NotFound)?;
    let (header, ciphertext) = format::decode_vault(&file_data)?;

    let key = crypto::derive_key(password.as_bytes(), &header.salt, &header.kdf_params)?;
    let plaintext = crypto::decrypt(&*key, &header.nonce, ciphertext)?;
    let decompressed =
        vault_compression::decompress(&plaintext).map_err(|_| CryptoError::DecryptionFailed)?;

    let payload: VaultPayload =
        bincode::deserialize(&decompressed).map_err(|_| CryptoError::DecryptionFailed)?;

    let name = payload.name.clone();
    let note_count = payload.notes.len();
    let path_str = path_buf.to_string_lossy().to_string();
    let info = vault_info(&path_str, &name, note_count);

    let mut guard = state.vault.lock().unwrap();
    *guard = Some(OpenVault {
        path: path_buf,
        name,
        key,
        kdf_params: header.kdf_params,
        salt: header.salt,
        notes: payload.notes,
        drive: payload.drive,
        projects: payload.projects,
    });

    Ok(info)
}

#[tauri::command]
pub fn lock_vault(state: State<'_, AppState>) -> Result<(), VaultError> {
    let mut guard = state.vault.lock().unwrap();
    if let Some(ref vault) = *guard {
        persist(vault)?;
    }
    *guard = None;
    Ok(())
}

#[tauri::command]
pub fn close_vault(state: State<'_, AppState>) -> Result<(), VaultError> {
    let mut guard = state.vault.lock().unwrap();
    if let Some(ref vault) = *guard {
        persist(vault)?;
    }
    *guard = None;
    Ok(())
}

#[tauri::command]
pub fn change_vault_password(
    current_password: String,
    new_password: String,
    state: State<'_, AppState>,
) -> Result<(), VaultError> {
    validate_password_length(&new_password)?;

    let mut guard = state.vault.lock().unwrap();
    let vault = guard.as_mut().ok_or(VaultError::NoVaultOpen)?;

    let verify_key =
        crypto::derive_key(current_password.as_bytes(), &vault.salt, &vault.kdf_params)?;
    if *verify_key != *vault.key {
        return Err(CryptoError::DecryptionFailed.into());
    }

    let new_salt = crypto::generate_salt();
    let new_kdf_params = KdfParams::default();
    let new_key = crypto::derive_key(new_password.as_bytes(), &new_salt, &new_kdf_params)?;

    vault.key = new_key;
    vault.salt = new_salt;
    vault.kdf_params = new_kdf_params;

    persist(vault)?;
    Ok(())
}

/// Export the currently unlocked vault to another location on disk as a
/// `.nermal` file, for backup/portability.
///
/// This never touches plaintext: it flushes any pending in-memory changes
/// to the vault's own encrypted file first, then copies those encrypted
/// bytes (header + ciphertext, unchanged) to `destination`. The exported
/// file is byte-for-byte the same encrypted format and requires the same
/// password to open.
#[tauri::command]
pub fn export_vault(destination: String, state: State<'_, AppState>) -> Result<(), VaultError> {
    let guard = state.vault.lock().unwrap();
    let vault = guard.as_ref().ok_or(VaultError::NoVaultOpen)?;

    persist(vault)?;

    let encrypted_bytes =
        storage::read_vault(&vault.path).map_err(|e| VaultError::SaveFailed(e.to_string()))?;

    storage::write_vault(&PathBuf::from(&destination), &encrypted_bytes)
        .map_err(|e| VaultError::SaveFailed(e.to_string()))?;

    Ok(())
}
