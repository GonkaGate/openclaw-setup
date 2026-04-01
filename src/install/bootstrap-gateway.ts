import type { OpenClawConfig } from "../types/settings.js";
import { getManagedSettingsView } from "./managed-settings-access.js";
import { copyPlainObject } from "./object-utils.js";

interface ExistingGatewayModeResult {
  kind: "preserved_existing_mode";
  settings: OpenClawConfig;
}

interface AddedLocalGatewayModeResult {
  kind: "added_local_mode";
  settings: OpenClawConfig;
}

export type FreshInstallGatewayBootstrapResult = ExistingGatewayModeResult | AddedLocalGatewayModeResult;

export function ensureFreshInstallLocalGateway(settings: OpenClawConfig): FreshInstallGatewayBootstrapResult {
  const existingGateway = copyPlainObject(getManagedSettingsView(settings).gateway);
  const existingMode = typeof existingGateway.mode === "string" && existingGateway.mode.trim().length > 0
    ? existingGateway.mode
    : undefined;

  if (existingMode) {
    return {
      kind: "preserved_existing_mode",
      settings
    };
  }

  return {
    kind: "added_local_mode",
    settings: {
      ...settings,
      gateway: {
        ...existingGateway,
        mode: "local"
      }
    }
  };
}
