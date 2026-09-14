/** One row of the env-var spreadsheet: `[key, value]`, max 2 columns. */
export type EnvRow = [string, string];

export interface Project {
  id: string;
  name: string;
  envRows: EnvRow[];
  createdAt: string;
}
