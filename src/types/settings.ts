export interface OpenClawConfig {
  models?: Record<string, unknown>;
  agents?: Record<string, unknown>;
  gateway?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SettingsTarget {
  path: string;
}
