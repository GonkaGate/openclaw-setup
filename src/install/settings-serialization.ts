import type { OpenClawConfig } from "../types/settings.js";

export function serializeSettings(settings: OpenClawConfig): string {
  return `${JSON.stringify(settings, null, 2)}\n`;
}
