import { stat } from "node:fs/promises";
import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL } from "../constants/gateway.js";
import {
  getManagedModelSelectionByPrimaryRef,
  listSupportedPrimaryModelRefs
} from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import {
  getDefaultModelSettings,
  getManagedOpenAIProvider,
  getModelAllowlist,
  MANAGED_SETTINGS_PATHS
} from "./managed-settings-access.js";
import { formatUnixMode, hasOwnerOnlyPermissions } from "./file-permissions.js";
import { asPlainObject, type PlainObject } from "./object-utils.js";
import { validateApiKey } from "./validate-api-key.js";

export interface VerifySettingsResult {
  configMode: number;
  selectedModel: SupportedModel;
}

export async function verifySettings(filePath: string, settings: OpenClawConfig): Promise<VerifySettingsResult> {
  const provider = requireManagedOpenAIProvider(settings, filePath);
  const baseUrl = requireNonEmptyString(provider.baseUrl, MANAGED_SETTINGS_PATHS.openaiBaseUrl, filePath);
  const api = requireNonEmptyString(provider.api, MANAGED_SETTINGS_PATHS.openaiApi, filePath);
  const apiKey = requireNonEmptyString(provider.apiKey, MANAGED_SETTINGS_PATHS.openaiApiKey, filePath);
  requireArray(provider.models, MANAGED_SETTINGS_PATHS.openaiModels, filePath);
  const primaryModelRef = getPrimaryModelRef(settings, filePath);

  if (baseUrl !== GONKAGATE_OPENAI_BASE_URL) {
    throw new Error(
      `Expected "${MANAGED_SETTINGS_PATHS.openaiBaseUrl}" in ${filePath} to be "${GONKAGATE_OPENAI_BASE_URL}", found "${baseUrl}".`
    );
  }

  if (api !== GONKAGATE_OPENAI_API) {
    throw new Error(`Expected "${MANAGED_SETTINGS_PATHS.openaiApi}" in ${filePath} to be "${GONKAGATE_OPENAI_API}", found "${api}".`);
  }

  try {
    validateApiKey(apiKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid "${MANAGED_SETTINGS_PATHS.openaiApiKey}" in ${filePath}: ${message}`);
  }

  const selectedModelState = getManagedModelSelectionByPrimaryRef(primaryModelRef);

  if (!selectedModelState) {
    throw new Error(
      `Expected "${MANAGED_SETTINGS_PATHS.primaryModel}" in ${filePath} to be one of: ${listSupportedPrimaryModelRefs().join(", ")}.`
    );
  }

  verifyModelAllowlistWhenPresent(getModelAllowlist(settings), filePath, selectedModelState.selectedModel, selectedModelState.primaryModelRef);

  const configMode = (await stat(filePath)).mode & 0o777;

  if (!hasOwnerOnlyPermissions(configMode)) {
    throw new Error(`Expected ${filePath} to use owner-only permissions, found ${formatUnixMode(configMode)}.`);
  }

  return {
    configMode,
    selectedModel: selectedModelState.selectedModel
  };
}

function requireManagedOpenAIProvider(settings: OpenClawConfig, filePath: string): PlainObject {
  const openaiProvider = getManagedOpenAIProvider(settings);

  if (!openaiProvider) {
    throw new Error(
      `Expected "${MANAGED_SETTINGS_PATHS.openaiProvider}" in ${filePath} to exist. Run "npx @gonkagate/openclaw" to apply GonkaGate settings.`
    );
  }

  return openaiProvider;
}

function getPrimaryModelRef(settings: OpenClawConfig, filePath: string): string {
  const defaultModel = getDefaultModelSettings(settings);

  return requireNonEmptyString(defaultModel?.primary, MANAGED_SETTINGS_PATHS.primaryModel, filePath);
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

function requireArray(value: unknown, fieldPath: string, filePath: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected "${fieldPath}" in ${filePath} to be a JSON5 array.`);
  }

  return value;
}
