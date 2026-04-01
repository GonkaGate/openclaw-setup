import type { OpenClawConfig } from "../types/settings.js";
import { readManagedGateway } from "./managed-settings-access.js";
import { copyPlainObject } from "./object-utils.js";

export interface FreshInstallGatewayBootstrapResult {
  addedLocalGatewayMode: boolean;
  settings: OpenClawConfig;
}

export function hasGatewayModeSetting(gateway: Record<string, unknown> | undefined): boolean {
  return gateway !== undefined && Object.hasOwn(gateway, "mode");
}

export function ensureFreshInstallLocalGateway(settings: OpenClawConfig): FreshInstallGatewayBootstrapResult {
  const existingGateway = copyPlainObject(readManagedGateway(settings, "the loaded OpenClaw config"));

  if (hasGatewayModeSetting(existingGateway)) {
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
