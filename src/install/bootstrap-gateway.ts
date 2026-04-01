import type { OpenClawConfig } from "../types/settings.js";
import { isPlainObject } from "./object-utils.js";

export interface FreshInstallGatewayBootstrapResult {
  configuredLocalMode: boolean;
  settings: OpenClawConfig;
}

export function ensureFreshInstallLocalGateway(settings: OpenClawConfig): FreshInstallGatewayBootstrapResult {
  const existingGateway = isPlainObject(settings.gateway) ? { ...settings.gateway } : {};
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
