import type { OpenClawConfig } from "../types/settings.js";
import { readManagedGateway } from "./managed-settings-access.js";
import { copyPlainObject } from "./object-utils.js";

export interface FreshInstallGatewayBootstrapResult {
  addedLocalGatewayMode: boolean;
  settings: OpenClawConfig;
}

export function ensureFreshInstallLocalGateway(settings: OpenClawConfig): FreshInstallGatewayBootstrapResult {
  const existingGateway = copyPlainObject(readManagedGateway(settings, "the loaded OpenClaw config"));
  const existingMode = typeof existingGateway.mode === "string" && existingGateway.mode.trim().length > 0
    ? existingGateway.mode
    : undefined;

  if (existingMode) {
    return {
      addedLocalGatewayMode: false,
      settings
    };
  }

  return {
    addedLocalGatewayMode: true,
    settings: {
      ...settings,
      gateway: {
        ...existingGateway,
        mode: "local"
      }
    }
  };
}
