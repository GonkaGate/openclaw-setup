import { stat } from "node:fs/promises";
import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL } from "../constants/gateway.js";
import {
  getManagedModelSelectionByPrimaryRef,
  listSupportedPrimaryModelRefs
} from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { MANAGED_SETTINGS_PATHS, readManagedSettings } from "./managed-settings-access.js";
import { formatUnixMode, hasOwnerOnlyPermissions } from "./file-permissions.js";
import { asPlainObject, type PlainObject } from "./object-utils.js";
import { validateApiKey } from "./validate-api-key.js";

export interface VerifySettingsResult {
  configMode: number;
  selectedModel: SupportedModel;
}

export async function verifySettings(filePath: string, settings: OpenClawConfig): Promise<VerifySettingsResult> {
  const managed = readManagedSettings(settings, filePath);
  const provider = requireManagedOpenAIProvider(managed.openaiProvider, filePath);
  const baseUrl = requireNonEmptyString(provider.baseUrl, MANAGED_SETTINGS_PATHS.openaiBaseUrl, filePath);
  const api = requireNonEmptyString(provider.api, MANAGED_SETTINGS_PATHS.openaiApi, filePath);
  requireManagedApiKey(provider.apiKey, filePath);
  requirePresentArray(managed.openaiModels, MANAGED_SETTINGS_PATHS.openaiModels, filePath);
  const primaryModelRef = getPrimaryModelRef(managed.defaultModel, filePath);

  if (baseUrl !== GONKAGATE_OPENAI_BASE_URL) {
    throw new Error(
      `Expected "${MANAGED_SETTINGS_PATHS.openaiBaseUrl}" in ${filePath} to be "${GONKAGATE_OPENAI_BASE_URL}", found "${baseUrl}".`
    );
  }

  if (api !== GONKAGATE_OPENAI_API) {
    throw new Error(`Expected "${MANAGED_SETTINGS_PATHS.openaiApi}" in ${filePath} to be "${GONKAGATE_OPENAI_API}", found "${api}".`);
  }

  const selectedModelState = getManagedModelSelectionByPrimaryRef(primaryModelRef);

  if (!selectedModelState) {
    throw new Error(
      `Expected "${MANAGED_SETTINGS_PATHS.primaryModel}" in ${filePath} to be one of: ${listSupportedPrimaryModelRefs().join(", ")}.`
    );
  }

  verifyModelAllowlistWhenPresent(managed.allowlist, filePath, selectedModelState.selectedModel, selectedModelState.primaryModelRef);

  const configMode = (await stat(filePath)).mode & 0o777;

  if (!hasOwnerOnlyPermissions(configMode)) {
    throw new Error(`Expected ${filePath} to use owner-only permissions, found ${formatUnixMode(configMode)}.`);
  }

  return {
    configMode,
    selectedModel: selectedModelState.selectedModel
  };
}

function requireManagedOpenAIProvider(openaiProvider: PlainObject | undefined, filePath: string): PlainObject {
  if (!openaiProvider) {
    throw new Error(
      `Expected "${MANAGED_SETTINGS_PATHS.openaiProvider}" in ${filePath} to exist. Run "npx @gonkagate/openclaw" to apply GonkaGate settings.`
    );
  }

  return openaiProvider;
}

function getPrimaryModelRef(defaultModel: PlainObject | undefined, filePath: string): string {
  return requireNonEmptyString(defaultModel?.primary, MANAGED_SETTINGS_PATHS.primaryModel, filePath);
}

function requireManagedApiKey(value: unknown, filePath: string): string {
  const apiKey = requireNonEmptyString(value, MANAGED_SETTINGS_PATHS.openaiApiKey, filePath);

  try {
    const normalizedApiKey = validateApiKey(apiKey);

    if (normalizedApiKey !== apiKey) {
      throw new Error("Expected the saved API key to be trimmed with no leading or trailing whitespace.");
    }

    return normalizedApiKey;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid "${MANAGED_SETTINGS_PATHS.openaiApiKey}" in ${filePath}: ${message}`);
  }
}

function verifyModelAllowlistWhenPresent(
  allowlist: PlainObject | undefined,
  filePath: string,
  selectedModel: SupportedModel,
  primaryModelRef: string
): void {
  if (!allowlist) {
    return;
  }

  const allowlistEntry = asPlainObject(allowlist[primaryModelRef]);
  const allowlistEntryPath = `${MANAGED_SETTINGS_PATHS.allowlist}.${primaryModelRef}`;

  if (!allowlistEntry) {
    throw new Error(
      `Expected "${allowlistEntryPath}" in ${filePath} to exist when "${MANAGED_SETTINGS_PATHS.allowlist}" is present.`
    );
  }

  if (allowlistEntry.alias !== selectedModel.key) {
    throw new Error(`Expected "${allowlistEntryPath}.alias" in ${filePath} to be "${selectedModel.key}".`);
  }
}

function requireNonEmptyString(value: unknown, fieldPath: string, filePath: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected "${fieldPath}" in ${filePath} to be a non-empty string.`);
  }

  return value;
}

function requirePresentArray(value: unknown[] | undefined, fieldPath: string, filePath: string): unknown[] {
  if (!value) {
    throw new Error(`Expected "${fieldPath}" in ${filePath} to be a JSON5 array.`);
  }

  return value;
}
