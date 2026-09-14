use serde::{Deserialize, Serialize};

/// One row of the env-var spreadsheet: `[key, value]`, max 2 columns.
pub type EnvRow = [String; 2];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub env_rows: Vec<EnvRow>,
    pub created_at: String,
}
