use tauri::State;

use super::{persist, VaultError};
use crate::models::project::{EnvRow, Project};
use crate::AppState;

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, VaultError> {
    let guard = state.vault.lock().unwrap();
    let vault = guard.as_ref().ok_or(VaultError::NoVaultOpen)?;
    Ok(vault.projects.clone())
}

#[tauri::command]
pub fn create_project(name: String, state: State<'_, AppState>) -> Result<Project, VaultError> {
    let mut guard = state.vault.lock().unwrap();
    let vault = guard.as_mut().ok_or(VaultError::NoVaultOpen)?;

    let project = Project {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        env_rows: vec![],
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    vault.projects.push(project.clone());
    persist(vault)?;
    Ok(project)
}

#[tauri::command]
pub fn rename_project(
    id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<Project, VaultError> {
    let mut guard = state.vault.lock().unwrap();
    let vault = guard.as_mut().ok_or(VaultError::NoVaultOpen)?;

    let project = vault
        .projects
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or(VaultError::ProjectNotFound(id))?;
    project.name = name;

    let result = project.clone();
    persist(vault)?;
    Ok(result)
}

#[tauri::command]
pub fn update_project_env_rows(
    id: String,
    rows: Vec<EnvRow>,
    state: State<'_, AppState>,
) -> Result<Project, VaultError> {
    let mut guard = state.vault.lock().unwrap();
    let vault = guard.as_mut().ok_or(VaultError::NoVaultOpen)?;

    let project = vault
        .projects
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or(VaultError::ProjectNotFound(id))?;
    project.env_rows = rows;

    let result = project.clone();
    persist(vault)?;
    Ok(result)
}

#[tauri::command]
pub fn delete_project(id: String, state: State<'_, AppState>) -> Result<(), VaultError> {
    let mut guard = state.vault.lock().unwrap();
    let vault = guard.as_mut().ok_or(VaultError::NoVaultOpen)?;

    let before = vault.projects.len();
    vault.projects.retain(|p| p.id != id);
    if vault.projects.len() == before {
        return Err(VaultError::ProjectNotFound(id));
    }

    persist(vault)?;
    Ok(())
}
