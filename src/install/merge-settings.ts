import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL, OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import { toPrimaryModelRef } from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { getManagedSettingsSurface } from "./managed-settings-surface.js";
import { asPlainObject, clonePlainObject } from "./object-utils.js";

export function mergeSettingsWithGonkaGate(
  settings: OpenClawConfig,
  apiKey: string,
  selectedModel: SupportedModel
): OpenClawConfig {
  const surface = getManagedSettingsSurface(settings);
  const existingModels = clonePlainObject(surface.models);
  const existingProviders = clonePlainObject(surface.providers);
  const existingOpenAI = clonePlainObject(surface.openaiProvider);
  const existingOpenAIModels = surface.openaiModels ? [...surface.openaiModels] : [];
  const existingAgents = clonePlainObject(surface.agents);
  const existingDefaults = clonePlainObject(surface.defaults);
  const existingDefaultModel = clonePlainObject(surface.defaultModel);
  const existingAllowlist = surface.allowlist ? { ...surface.allowlist } : undefined;
  const primaryModelRef = toPrimaryModelRef(selectedModel);
  const managedAllowlist = existingAllowlist
    ? {
        ...existingAllowlist,
        [primaryModelRef]: {
          ...clonePlainObject(asPlainObject(surface.allowlist?.[primaryModelRef])),
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
