import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL, OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import type { ManagedAllowlistEntry, SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import {
  createStaticCuratedGonkaGateModelCatalog,
  type CuratedGonkaGateModelCatalogEntry,
  type OpenClawProviderModelCatalogEntry
} from "./gonkagate-models.js";
import { readManagedAllowlistEntryWhenPresent, readManagedSettingsView } from "./managed-settings-access.js";
import {
  asPlainObject,
  clonePlainArray,
  clonePlainObject,
  copyPlainObject,
  type PlainObject,
  type ReadonlyPlainObject
} from "./object-utils.js";

export function mergeSettingsWithGonkaGate(
  settings: OpenClawConfig,
  apiKey: string,
  selectedModel: SupportedModel,
  modelCatalog: readonly CuratedGonkaGateModelCatalogEntry[] = createStaticCuratedGonkaGateModelCatalog()
): OpenClawConfig {
  const managedSettings = readManagedSettingsView(settings, "the loaded OpenClaw config");
  const selectedModelState = requireCatalogEntryForSelectedModel(selectedModel, modelCatalog);
  const managedAllowlist = mergeManagedAllowlistEntries(
    managedSettings.allowlist ? clonePlainObject(managedSettings.allowlist) : {},
    managedSettings.allowlist,
    modelCatalog
  );
  const openAiModels = mergeOpenAiProviderModelCatalog(
    managedSettings.openaiProvider?.models ? clonePlainArray(managedSettings.openaiProvider.models) : [],
    modelCatalog
  );

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
        models: managedAllowlist,
        model: {
          ...copyPlainObject(managedSettings.defaultModel?.raw),
          primary: selectedModelState.primaryModelRef
        }
      }
    }
  };
}

function requireCatalogEntryForSelectedModel(
  selectedModel: SupportedModel,
  modelCatalog: readonly CuratedGonkaGateModelCatalogEntry[]
): CuratedGonkaGateModelCatalogEntry {
  const selectedModelState = modelCatalog.find((entry) => entry.model.key === selectedModel.key);

  if (!selectedModelState) {
    throw new Error(`Selected model "${selectedModel.key}" is missing from the GonkaGate model catalog.`);
  }

  return selectedModelState;
}

function mergeManagedAllowlistEntries(
  allowlist: PlainObject,
  existingAllowlist: ReadonlyPlainObject | undefined,
  modelCatalog: readonly CuratedGonkaGateModelCatalogEntry[]
): PlainObject {
  let mergedAllowlist = allowlist;

  for (const catalogEntry of modelCatalog) {
    mergedAllowlist = mergeManagedAllowlistEntry(
      mergedAllowlist,
      catalogEntry.primaryModelRef,
      readManagedAllowlistEntryWhenPresent(
        existingAllowlist,
        catalogEntry.primaryModelRef,
        "the loaded OpenClaw config"
      ),
      catalogEntry.allowlistEntry
    );
  }

  return mergedAllowlist;
}

function mergeManagedAllowlistEntry(
  allowlist: PlainObject,
  primaryModelRef: string,
  existingAllowlistEntry: ReadonlyPlainObject | undefined,
  allowlistEntry: ManagedAllowlistEntry
): PlainObject {
  return {
    ...allowlist,
    [primaryModelRef]: {
      ...copyPlainObject(existingAllowlistEntry),
      ...allowlistEntry
    }
  };
}

function mergeOpenAiProviderModelCatalog(
  existingModels: unknown[],
  modelCatalog: readonly CuratedGonkaGateModelCatalogEntry[]
): unknown[] {
  const mergedModels = [...existingModels];

  for (const catalogEntry of modelCatalog) {
    upsertProviderModelCatalogEntry(mergedModels, catalogEntry.providerModel);
  }

  return mergedModels;
}

function upsertProviderModelCatalogEntry(
  catalog: unknown[],
  providerModel: OpenClawProviderModelCatalogEntry
): void {
  const existingIndex = catalog.findIndex((entry) => asPlainObject(entry)?.id === providerModel.id);

  if (existingIndex === -1) {
    catalog.push({ ...providerModel });
    return;
  }

  const existingEntry = asPlainObject(catalog[existingIndex]);

  catalog[existingIndex] = {
    ...copyPlainObject(existingEntry),
    ...providerModel
  };
}
