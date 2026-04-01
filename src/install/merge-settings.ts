import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL, OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import { toManagedModelSelection } from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import {
  getAgentDefaultsSettings,
  getAgentsSettings,
  getDefaultModelSettings,
  getManagedOpenAIProvider,
  getModelAllowlist,
  getModelsProvidersSettings,
  getModelsSettings
} from "./managed-settings-access.js";
import { asPlainObject, copyArray, toPlainObject, type PlainObject } from "./object-utils.js";

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
          ...toPlainObject(existingAllowlistEntry),
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
  const models = toPlainObject(getModelsSettings(settings));
  const providers = toPlainObject(getModelsProvidersSettings(settings));
  const openaiProvider = toPlainObject(getManagedOpenAIProvider(settings));
  const agents = toPlainObject(getAgentsSettings(settings));
  const defaults = toPlainObject(getAgentDefaultsSettings(settings));
  const defaultModel = toPlainObject(getDefaultModelSettings(settings));
  const allowlist = getModelAllowlist(settings);
  const openaiModels = copyArray(Array.isArray(openaiProvider.models) ? openaiProvider.models : undefined);

  return {
    agents,
    defaults,
    defaultModel,
    models,
    openaiModels,
    openaiProvider,
    providers,
    allowlist: allowlist ? { ...allowlist } : undefined
  };
}
