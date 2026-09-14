pub mod commands;
pub mod models;
pub mod vault;

use std::path::PathBuf;
use std::sync::Mutex;

use zeroize::Zeroizing;

use crate::vault::crypto::{KdfParams, KEY_LEN, SALT_LEN};
use models::drive::DriveEntry;
use models::note::Note;
use models::project::Project;

pub struct OpenVault {
    pub path: PathBuf,
    pub name: String,
    pub key: Zeroizing<[u8; KEY_LEN]>,
    pub kdf_params: KdfParams,
    pub salt: [u8; SALT_LEN],
    pub notes: Vec<Note>,
    pub drive: Vec<DriveEntry>,
    pub projects: Vec<Project>,
}

#[derive(Default)]
pub struct AppState {
    pub vault: Mutex<Option<OpenVault>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::vault::create_vault,
            commands::vault::open_vault,
            commands::vault::unlock_vault,
            commands::vault::lock_vault,
            commands::vault::close_vault,
            commands::vault::change_vault_password,
            commands::vault::export_vault,
            commands::notes::list_notes,
            commands::notes::get_note,
            commands::notes::create_note,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::drive::list_drive_entries,
            commands::drive::create_drive_folder,
            commands::drive::upload_drive_file,
            commands::drive::get_drive_file_data,
            commands::drive::export_drive_file,
            commands::drive::delete_drive_entry,
            commands::projects::list_projects,
            commands::projects::create_project,
            commands::projects::rename_project,
            commands::projects::update_project_env_rows,
            commands::projects::delete_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
