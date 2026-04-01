import { OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import type { OpenClawConfig } from "../types/settings.js";
import { asPlainObject } from "./object-utils.js";

export interface ManagedSettingsSurface {
  agents?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  defaultModel?: Record<string, unknown>;
  gateway?: Record<string, unknown>;
  models?: Record<string, unknown>;
  openaiModels?: unknown[];
  openaiProvider?: Record<string, unknown>;
  providers?: Record<string, unknown>;
  allowlist?: Record<string, unknown>;
}

export function getManagedSettingsSurface(settings: OpenClawConfig): ManagedSettingsSurface {
  const models = asPlainObject(settings.models);
  const providers = asPlainObject(models?.providers);
  const openaiProvider = asPlainObject(providers?.[OPENCLAW_PROVIDER_ID]);
  const agents = asPlainObject(settings.agents);
  const defaults = asPlainObject(agents?.defaults);
  const defaultModel = asPlainObject(defaults?.model);
  const allowlist = asPlainObject(defaults?.models);
  const gateway = asPlainObject(settings.gateway);
  const openaiModels = Array.isArray(openaiProvider?.models) ? openaiProvider.models : undefined;

  return {
    agents,
    defaults,
    defaultModel,
    gateway,
    models,
    openaiModels,
    openaiProvider,
    providers,
    allowlist
  };
}
