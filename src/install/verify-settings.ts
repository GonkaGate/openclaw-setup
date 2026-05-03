import { stat } from "node:fs/promises";
import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL } from "../constants/gateway.js";
import {
  getManagedModelSelectionByPrimaryRef,
  listSupportedPrimaryModelRefs,
  SUPPORTED_MODELS,
  toPrimaryModelRef,
  type ManagedModelSelection
} from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import {
  MANAGED_SETTINGS_PATHS,
  readManagedAllowlistEntryWhenPresent,
  readManagedSettingsView,
  type ManagedDefaultModelView,
  type ManagedOpenAiProviderView
} from "./managed-settings-access.js";
import { DEFAULT_OWNER_ONLY_MODE, formatUnixMode, hasOwnerOnlyPermissions } from "./file-permissions.js";
import { SettingsVerificationError, describeValue, getErrorMessage } from "./install-errors.js";
import type { ReadonlyPlainObject } from "./object-utils.js";
import { validateApiKey } from "./validate-api-key.js";

export interface VerifySettingsResult {
  configMode: number;
  selectedModel: SupportedModel;
}

export async function verifySettings(filePath: string, settings: OpenClawConfig): Promise<VerifySettingsResult> {
  const managed = readManagedSettingsView(settings, filePath);
  const provider = requireManagedOpenAIProvider(managed.openaiProvider, filePath);
  const baseUrl = requireNonEmptyString(provider.baseUrl, MANAGED_SETTINGS_PATHS.openaiBaseUrl, filePath);
  const api = requireNonEmptyString(provider.api, MANAGED_SETTINGS_PATHS.openaiApi, filePath);
  requireManagedApiKey(provider.apiKey, filePath);
  const providerModels = requirePresentArray(provider.models, MANAGED_SETTINGS_PATHS.openaiModels, filePath);
  const primaryModelRef = getPrimaryModelRef(managed.defaultModel, filePath);

  if (baseUrl !== GONKAGATE_OPENAI_BASE_URL) {
    throw new SettingsVerificationError({
      actual: baseUrl,
      expected: GONKAGATE_OPENAI_BASE_URL,
      fieldPath: MANAGED_SETTINGS_PATHS.openaiBaseUrl,
      filePath,
      kind: "mismatched_managed_value",
      message: `Expected "${MANAGED_SETTINGS_PATHS.openaiBaseUrl}" in ${filePath} to be "${GONKAGATE_OPENAI_BASE_URL}", found "${baseUrl}".`
    });
  }

  if (api !== GONKAGATE_OPENAI_API) {
    throw new SettingsVerificationError({
      actual: api,
      expected: GONKAGATE_OPENAI_API,
      fieldPath: MANAGED_SETTINGS_PATHS.openaiApi,
      filePath,
      kind: "mismatched_managed_value",
      message: `Expected "${MANAGED_SETTINGS_PATHS.openaiApi}" in ${filePath} to be "${GONKAGATE_OPENAI_API}", found "${api}".`
    });
  }

  const selectedModelState = getManagedModelSelectionByPrimaryRef(primaryModelRef);

  if (!selectedModelState) {
    throw new SettingsVerificationError({
      actual: primaryModelRef,
      expected: listSupportedPrimaryModelRefs().join(", "),
      fieldPath: MANAGED_SETTINGS_PATHS.primaryModel,
      filePath,
      kind: "mismatched_managed_value",
      message: `Expected "${MANAGED_SETTINGS_PATHS.primaryModel}" in ${filePath} to be one of: ${listSupportedPrimaryModelRefs().join(", ")}.`
    });
  }

  verifyOpenAiProviderModelCatalog(providerModels, filePath);
  verifyModelAllowlist(managed.allowlist, filePath);

  let configMode: number;

  try {
    configMode = (await stat(filePath)).mode & 0o777;
  } catch (error) {
    throw new SettingsVerificationError({
      filePath,
      kind: "permissions_check_failed",
      message: `Unable to inspect file permissions for ${filePath}.`,
      cause: error
    });
  }

  if (!hasOwnerOnlyPermissions(configMode)) {
    throw new SettingsVerificationError({
      actual: formatUnixMode(configMode),
      expected: formatUnixMode(DEFAULT_OWNER_ONLY_MODE),
      filePath,
      kind: "invalid_permissions",
      message: `Expected ${filePath} to use owner-only permissions, found ${formatUnixMode(configMode)}.`
    });
  }

  return {
    configMode,
    selectedModel: selectedModelState.selectedModel
  };
}

function requireManagedOpenAIProvider(
  openaiProvider: ManagedOpenAiProviderView | undefined,
  filePath: string
): ManagedOpenAiProviderView {
  if (!openaiProvider) {
    throw new SettingsVerificationError({
      fieldPath: MANAGED_SETTINGS_PATHS.openaiProvider,
      filePath,
      kind: "missing_managed_value",
      message:
        `Expected "${MANAGED_SETTINGS_PATHS.openaiProvider}" in ${filePath} to exist. Run "npx @gonkagate/openclaw" to apply GonkaGate settings.`
    });
  }

  return openaiProvider;
}

function getPrimaryModelRef(defaultModel: ManagedDefaultModelView | undefined, filePath: string): string {
  return requireNonEmptyString(defaultModel?.primary, MANAGED_SETTINGS_PATHS.primaryModel, filePath);
}

function requireManagedApiKey(value: unknown, filePath: string): string {
  const apiKey = requireNonEmptyString(value, MANAGED_SETTINGS_PATHS.openaiApiKey, filePath);

  try {
    const normalizedApiKey = validateApiKey(apiKey);

    if (normalizedApiKey !== apiKey) {
      throw new SettingsVerificationError({
        actual: apiKey,
        expected: "a trimmed GonkaGate API key",
        fieldPath: MANAGED_SETTINGS_PATHS.openaiApiKey,
        filePath,
        kind: "invalid_api_key",
        message: "Expected the saved API key to be trimmed with no leading or trailing whitespace."
      });
    }

    return normalizedApiKey;
  } catch (error) {
    const message = getErrorMessage(error) ?? "Unknown validation error.";

    throw new SettingsVerificationError({
      fieldPath: MANAGED_SETTINGS_PATHS.openaiApiKey,
      filePath,
      kind: "invalid_api_key",
      message: `Invalid "${MANAGED_SETTINGS_PATHS.openaiApiKey}" in ${filePath}: ${message}`,
      cause: error
    });
  }
}

function verifyModelAllowlist(
  allowlist: ReadonlyPlainObject | undefined,
  filePath: string
): void {
  if (!allowlist) {
    throw new SettingsVerificationError({
      fieldPath: MANAGED_SETTINGS_PATHS.allowlist,
      filePath,
      kind: "missing_managed_value",
      message:
        `Expected "${MANAGED_SETTINGS_PATHS.allowlist}" in ${filePath} to exist so OpenClaw /models can list curated GonkaGate models.`
    });
  }

  for (const model of SUPPORTED_MODELS) {
    verifyModelAllowlistEntry(allowlist, filePath, getRequiredManagedModelSelection(model));
  }
}

function verifyModelAllowlistEntry(
  allowlist: ReadonlyPlainObject,
  filePath: string,
  selectedModelState: ManagedModelSelection
): void {
  const allowlistEntry = readManagedAllowlistEntryWhenPresent(
    allowlist,
    selectedModelState.primaryModelRef,
    filePath
  );
  const allowlistEntryPath = `${MANAGED_SETTINGS_PATHS.allowlist}.${selectedModelState.primaryModelRef}`;

  if (!allowlistEntry) {
    throw new SettingsVerificationError({
      fieldPath: allowlistEntryPath,
      filePath,
      kind: "missing_allowlist_entry",
      message: `Expected "${allowlistEntryPath}" in ${filePath} to exist when "${MANAGED_SETTINGS_PATHS.allowlist}" is present.`
    });
  }

  for (const [fieldName, expectedValue] of typedObjectEntries(selectedModelState.allowlistEntry)) {
    const actualValue = allowlistEntry[fieldName];

    if (actualValue !== expectedValue) {
      throw new SettingsVerificationError({
        actual: typeof actualValue === "string" ? actualValue : describeValue(actualValue),
        expected: String(expectedValue),
        fieldPath: `${allowlistEntryPath}.${fieldName}`,
        filePath,
        kind: fieldName === "alias" ? "mismatched_allowlist_alias" : "mismatched_managed_value",
        message: `Expected "${allowlistEntryPath}.${fieldName}" in ${filePath} to be "${expectedValue}".`
      });
    }
  }
}

function verifyOpenAiProviderModelCatalog(providerModels: readonly unknown[], filePath: string): void {
  for (const model of SUPPORTED_MODELS) {
    const expectedModelId = model.modelId;
    const modelEntry = providerModels.find((entry) => {
      const objectEntry = typeof entry === "object" && entry !== null && !Array.isArray(entry)
        ? entry as ReadonlyPlainObject
        : undefined;

      return objectEntry?.id === expectedModelId;
    });

    if (!modelEntry) {
      throw new SettingsVerificationError({
        expected: expectedModelId,
        fieldPath: MANAGED_SETTINGS_PATHS.openaiModels,
        filePath,
        kind: "missing_provider_model_entry",
        message:
          `Expected "${MANAGED_SETTINGS_PATHS.openaiModels}" in ${filePath} to include model id "${expectedModelId}" ` +
          "so OpenClaw /models can expose the curated GonkaGate catalog."
      });
    }
  }
}

function getRequiredManagedModelSelection(model: SupportedModel): ManagedModelSelection {
  const modelSelection = getManagedModelSelectionByPrimaryRef(toPrimaryModelRef(model));

  if (!modelSelection) {
    throw new Error(`Curated model "${model.key}" does not resolve to a managed OpenClaw model ref.`);
  }

  return modelSelection;
}

function requireNonEmptyString(value: unknown, fieldPath: string, filePath: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SettingsVerificationError({
      actual: describeValue(value),
      expected: "non-empty string",
      fieldPath,
      filePath,
      kind: "missing_managed_value",
      message: `Expected "${fieldPath}" in ${filePath} to be a non-empty string.`
    });
  }

  return value;
}

function requirePresentArray(value: readonly unknown[] | undefined, fieldPath: string, filePath: string): readonly unknown[] {
  if (!value) {
    throw new SettingsVerificationError({
      actual: describeValue(value),
      expected: "JSON5 array",
      fieldPath,
      filePath,
      kind: "missing_managed_value",
      message: `Expected "${fieldPath}" in ${filePath} to be a JSON5 array.`
    });
  }

  return value;
}

function typedObjectEntries<Entry extends object>(value: Entry): [keyof Entry, Entry[keyof Entry]][] {
  return Object.entries(value as Record<string, unknown>) as [keyof Entry, Entry[keyof Entry]][];
}
