import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL, OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import { toManagedModelSelection } from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { getManagedSettingsView } from "./managed-settings-access.js";
import { asPlainObject, copyPlainObject, type PlainObject } from "./object-utils.js";

interface ManagedSettingsForUpdate {
  agents: PlainObject;
  defaults: PlainObject;
  defaultModel: PlainObject;
  models: PlainObject;
  openaiModels: unknown[];
  openaiProvider: PlainObject;
  providers: PlainObject;
  allowlist?: PlainObject;
}

export function mergeSettingsWithGonkaGate(
  settings: OpenClawConfig,
  apiKey: string,
  selectedModel: SupportedModel
): OpenClawConfig {
  const managedSettings = normalizeManagedSettingsForUpdate(settings);
  const selectedModelState = toManagedModelSelection(selectedModel);
  const existingAllowlistEntry = asPlainObject(managedSettings.allowlist?.[selectedModelState.primaryModelRef]);
  const managedAllowlist = managedSettings.allowlist
    ? {
        ...managedSettings.allowlist,
        [selectedModelState.primaryModelRef]: {
          ...copyPlainObject(existingAllowlistEntry),
          ...selectedModelState.allowlistEntry
        }
      }
    : undefined;

  return {
    ...settings,
    models: {
      ...managedSettings.models,
      providers: {
        ...managedSettings.providers,
        [OPENCLAW_PROVIDER_ID]: {
          ...managedSettings.openaiProvider,
          models: managedSettings.openaiModels,
          baseUrl: GONKAGATE_OPENAI_BASE_URL,
          apiKey,
          api: GONKAGATE_OPENAI_API
        }
      }
    },
    agents: {
      ...managedSettings.agents,
      defaults: {
        ...managedSettings.defaults,
        ...(managedAllowlist ? { models: managedAllowlist } : {}),
        model: {
          ...managedSettings.defaultModel,
          primary: selectedModelState.primaryModelRef
        }
      }
    }
  };
}

function normalizeManagedSettingsForUpdate(settings: OpenClawConfig): ManagedSettingsForUpdate {
  const managed = getManagedSettingsView(settings);
  const allowlist = managed.allowlist;
  const openaiModels = Array.isArray(managed.openaiModelsValue) ? [...managed.openaiModelsValue] : [];

  return {
    agents: copyPlainObject(managed.agents),
    defaults: copyPlainObject(managed.defaults),
    defaultModel: copyPlainObject(managed.defaultModel),
    models: copyPlainObject(managed.models),
    openaiModels,
    openaiProvider: copyPlainObject(managed.openaiProvider),
    providers: copyPlainObject(managed.providers),
    allowlist: allowlist ? { ...allowlist } : undefined
  };
}
