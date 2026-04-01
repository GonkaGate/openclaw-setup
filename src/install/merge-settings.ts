import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL, OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import { toManagedModelSelection } from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { createManagedSettingsUpdateState, readManagedSettings } from "./managed-settings-access.js";
import { asPlainObject, copyPlainObject } from "./object-utils.js";

export function mergeSettingsWithGonkaGate(
  settings: OpenClawConfig,
  apiKey: string,
  selectedModel: SupportedModel
): OpenClawConfig {
  const managedSettings = createManagedSettingsUpdateState(readManagedSettings(settings, "the loaded OpenClaw config"));
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
