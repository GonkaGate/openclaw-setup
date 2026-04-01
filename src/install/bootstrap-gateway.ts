import type { OpenClawConfig } from "../types/settings.js";
import { getGatewaySettings } from "./managed-settings-access.js";
import { toPlainObject } from "./object-utils.js";

export interface FreshInstallGatewayBootstrapResult {
  configuredLocalMode: boolean;
  settings: OpenClawConfig;
}

export function ensureFreshInstallLocalGateway(settings: OpenClawConfig): FreshInstallGatewayBootstrapResult {
  const existingGateway = toPlainObject(getGatewaySettings(settings));
  const existingMode = typeof existingGateway.mode === "string" && existingGateway.mode.trim().length > 0
    ? existingGateway.mode
    : undefined;

  if (existingMode) {
    return {
      configuredLocalMode: false,
      settings
    };
  }

  return {
    configuredLocalMode: true,
    settings: {
      ...settings,
      gateway: {
        ...existingGateway,
        mode: "local"
      }
    }
  };
}
