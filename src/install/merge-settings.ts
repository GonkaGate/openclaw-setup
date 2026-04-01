import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL, OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import { toManagedModelSelection } from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { readManagedSettingsSnapshot, type ManagedSettingsSnapshot } from "./managed-settings-access.js";
import { asPlainObject, copyPlainObject, type PlainObject } from "./object-utils.js";

export function mergeSettingsWithGonkaGate(
  settings: OpenClawConfig,
  apiKey: string,
  selectedModel: SupportedModel
): OpenClawConfig {
  const managedSettings = createManagedMergeState(readManagedSettingsSnapshot(settings, "the loaded OpenClaw config"));
  const selectedModelState = toManagedModelSelection(selectedModel);
  const managedAllowlist = mergeManagedAllowlistEntry(
    managedSettings.allowlist,
    selectedModelState.primaryModelRef,
    selectedModelState.allowlistEntry
  );

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

function createManagedMergeState(snapshot: ManagedSettingsSnapshot): {
  agents: PlainObject;
  allowlist: PlainObject | undefined;
  defaultModel: PlainObject;
  defaults: PlainObject;
  models: PlainObject;
  openaiModels: unknown[];
  openaiProvider: PlainObject;
  providers: PlainObject;
} {
  return {
    agents: copyPlainObject(snapshot.agents),
    allowlist: snapshot.allowlist ? { ...snapshot.allowlist } : undefined,
    defaultModel: copyPlainObject(snapshot.defaultModel?.raw),
    defaults: copyPlainObject(snapshot.defaults),
    models: copyPlainObject(snapshot.models),
    openaiModels: snapshot.openaiProvider?.models ? [...snapshot.openaiProvider.models] : [],
    openaiProvider: copyPlainObject(snapshot.openaiProvider?.raw),
    providers: copyPlainObject(snapshot.providers)
  };
}

function mergeManagedAllowlistEntry(
  allowlist: PlainObject | undefined,
  primaryModelRef: string,
  allowlistEntry: { alias: SupportedModel["key"] }
): PlainObject | undefined {
  if (!allowlist) {
    return undefined;
  }

  const existingAllowlistEntry = asPlainObject(allowlist[primaryModelRef]);

  return {
    ...allowlist,
    [primaryModelRef]: {
      ...copyPlainObject(existingAllowlistEntry),
      ...allowlistEntry
    }
  };
}
