import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL, OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import { toPrimaryModelRef } from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { isPlainObject } from "./object-utils.js";

export function mergeSettingsWithGonkaGate(
  settings: OpenClawConfig,
  apiKey: string,
  selectedModel: SupportedModel
): OpenClawConfig {
  const existingModels = isPlainObject(settings.models) ? { ...settings.models } : {};
  const existingProviders = isPlainObject(existingModels.providers) ? { ...existingModels.providers } : {};
  const existingOpenAI = isPlainObject(existingProviders[OPENCLAW_PROVIDER_ID])
    ? { ...existingProviders[OPENCLAW_PROVIDER_ID] }
    : {};
  const existingOpenAIModels = Array.isArray(existingOpenAI.models) ? [...existingOpenAI.models] : [];
  const existingAgents = isPlainObject(settings.agents) ? { ...settings.agents } : {};
  const existingDefaults = isPlainObject(existingAgents.defaults) ? { ...existingAgents.defaults } : {};
  const existingDefaultModel = isPlainObject(existingDefaults.model) ? { ...existingDefaults.model } : {};
  const existingAllowlist = isPlainObject(existingDefaults.models) ? { ...existingDefaults.models } : undefined;
  const primaryModelRef = toPrimaryModelRef(selectedModel);
  const managedAllowlist = existingAllowlist
    ? {
        ...existingAllowlist,
        [primaryModelRef]: {
          ...(isPlainObject(existingAllowlist[primaryModelRef]) ? existingAllowlist[primaryModelRef] : {}),
          alias: selectedModel.key
        }
      }
    : undefined;

  return {
    ...settings,
    models: {
      ...existingModels,
      providers: {
        ...existingProviders,
        [OPENCLAW_PROVIDER_ID]: {
          ...existingOpenAI,
          models: existingOpenAIModels,
          baseUrl: GONKAGATE_OPENAI_BASE_URL,
          apiKey,
          api: GONKAGATE_OPENAI_API
        }
      }
    },
    agents: {
      ...existingAgents,
      defaults: {
        ...existingDefaults,
        ...(managedAllowlist ? { models: managedAllowlist } : {}),
        model: {
          ...existingDefaultModel,
          primary: primaryModelRef
        }
      }
    }
  };
}
