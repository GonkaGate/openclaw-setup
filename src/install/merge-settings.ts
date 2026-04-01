import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL, OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import { toManagedModelSelection } from "../constants/models.js";
import type { ManagedAllowlistEntry, SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { readManagedAllowlistEntryWhenPresent, readManagedSettingsView } from "./managed-settings-access.js";
import { clonePlainArray, clonePlainObject, copyPlainObject, type PlainObject, type ReadonlyPlainObject } from "./object-utils.js";

export function mergeSettingsWithGonkaGate(
  settings: OpenClawConfig,
  apiKey: string,
  selectedModel: SupportedModel
): OpenClawConfig {
  const managedSettings = readManagedSettingsView(settings, "the loaded OpenClaw config");
  const selectedModelState = toManagedModelSelection(selectedModel);
  const managedAllowlist = mergeManagedAllowlistEntry(
    managedSettings.allowlist ? clonePlainObject(managedSettings.allowlist) : undefined,
    selectedModelState.primaryModelRef,
    readManagedAllowlistEntryWhenPresent(
      managedSettings.allowlist,
      selectedModelState.primaryModelRef,
      "the loaded OpenClaw config"
    ),
    selectedModelState.allowlistEntry
  );
  const openAiModels = managedSettings.openaiProvider?.models
    ? clonePlainArray(managedSettings.openaiProvider.models)
    : [];

  return {
    ...settings,
    models: {
      ...copyPlainObject(managedSettings.models),
      providers: {
        ...copyPlainObject(managedSettings.providers),
        [OPENCLAW_PROVIDER_ID]: {
          ...copyPlainObject(managedSettings.openaiProvider?.raw),
          models: openAiModels,
          baseUrl: GONKAGATE_OPENAI_BASE_URL,
          apiKey,
          api: GONKAGATE_OPENAI_API
        }
      }
    },
    agents: {
      ...copyPlainObject(managedSettings.agents),
      defaults: {
        ...copyPlainObject(managedSettings.defaults),
        ...(managedAllowlist ? { models: managedAllowlist } : {}),
        model: {
          ...copyPlainObject(managedSettings.defaultModel?.raw),
          primary: selectedModelState.primaryModelRef
        }
      }
    }
  };
}

function mergeManagedAllowlistEntry(
  allowlist: PlainObject | undefined,
  primaryModelRef: string,
  existingAllowlistEntry: ReadonlyPlainObject | undefined,
  allowlistEntry: ManagedAllowlistEntry
): PlainObject | undefined {
  if (!allowlist) {
    return undefined;
  }

  return {
    ...allowlist,
    [primaryModelRef]: {
      ...copyPlainObject(existingAllowlistEntry),
      ...allowlistEntry
    }
  };
}
