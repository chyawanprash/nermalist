use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DriveEntryKind {
    Folder,
    File,
}

/// Stored inside the vault payload. Files carry their bytes here — the
/// whole vault is one encrypted blob, so there's no separate file storage.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveEntry {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub kind: DriveEntryKind,
    pub mime_type: Option<String>,
    pub data: Vec<u8>,
    pub created_at: String,
}

/// Returned to the frontend for listing — omits `data` so browsing a folder
/// doesn't ship every file's bytes over IPC.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveEntryMeta {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub kind: DriveEntryKind,
    pub mime_type: Option<String>,
    pub size: usize,
    pub created_at: String,
}

impl From<&DriveEntry> for DriveEntryMeta {
    fn from(entry: &DriveEntry) -> Self {
        Self {
            id: entry.id.clone(),
            parent_id: entry.parent_id.clone(),
            name: entry.name.clone(),
            kind: entry.kind,
            mime_type: entry.mime_type.clone(),
            size: entry.data.len(),
            created_at: entry.created_at.clone(),
        }
    }
}
