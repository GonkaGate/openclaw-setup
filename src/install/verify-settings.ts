import { stat } from "node:fs/promises";
import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL, OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import {
  getSupportedModelByPrimaryRef,
  SUPPORTED_MODELS,
  toPrimaryModelRef
} from "../constants/models.js";
import type { SupportedModel } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { getManagedSettingsSurface, type ManagedSettingsSurface } from "./managed-settings-surface.js";
import { asPlainObject } from "./object-utils.js";
import { validateApiKey } from "./validate-api-key.js";

export interface VerifySettingsResult {
  configMode: number;
  selectedModel: SupportedModel;
}

export async function verifySettings(filePath: string, settings: OpenClawConfig): Promise<VerifySettingsResult> {
  const surface = getManagedSettingsSurface(settings);
  const provider = getManagedOpenAIProvider(surface, filePath);
  const baseUrl = requireNonEmptyString(provider.baseUrl, "models.providers.openai.baseUrl", filePath);
  const api = requireNonEmptyString(provider.api, "models.providers.openai.api", filePath);
  const apiKey = requireNonEmptyString(provider.apiKey, "models.providers.openai.apiKey", filePath);
  requireArray(provider.models, "models.providers.openai.models", filePath);
  const primaryModelRef = getPrimaryModelRef(surface, filePath);

  if (baseUrl !== GONKAGATE_OPENAI_BASE_URL) {
    throw new Error(
      `Expected "models.providers.openai.baseUrl" in ${filePath} to be "${GONKAGATE_OPENAI_BASE_URL}", found "${baseUrl}".`
    );
  }

  if (api !== GONKAGATE_OPENAI_API) {
    throw new Error(`Expected "models.providers.openai.api" in ${filePath} to be "${GONKAGATE_OPENAI_API}", found "${api}".`);
  }

  try {
    validateApiKey(apiKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid "models.providers.openai.apiKey" in ${filePath}: ${message}`);
  }

  const selectedModel = getSupportedModelByPrimaryRef(primaryModelRef);

  if (!selectedModel) {
    const allowedRefs = SUPPORTED_MODELS.map((model) => toPrimaryModelRef(model)).join(", ");
    throw new Error(`Expected "agents.defaults.model.primary" in ${filePath} to be one of: ${allowedRefs}.`);
  }

  verifyModelAllowlistWhenPresent(surface, filePath, selectedModel, primaryModelRef);

  const configMode = (await stat(filePath)).mode & 0o777;

  if (!hasOwnerOnlyPermissions(configMode)) {
    throw new Error(`Expected ${filePath} to use owner-only permissions, found ${formatUnixMode(configMode)}.`);
  }

  return {
    configMode,
    selectedModel
  };
}

export function formatUnixMode(mode: number): string {
  return `0o${mode.toString(8).padStart(3, "0")}`;
}

function getManagedOpenAIProvider(surface: ManagedSettingsSurface, filePath: string): Record<string, unknown> {
  if (!surface.openaiProvider) {
    throw new Error(
      `Expected "models.providers.${OPENCLAW_PROVIDER_ID}" in ${filePath} to exist. Run "npx @gonkagate/openclaw" to apply GonkaGate settings.`
    );
  }

  return surface.openaiProvider;
}

function getPrimaryModelRef(surface: ManagedSettingsSurface, filePath: string): string {
  return requireNonEmptyString(surface.defaultModel?.primary, "agents.defaults.model.primary", filePath);
}

function verifyModelAllowlistWhenPresent(
  surface: ManagedSettingsSurface,
  filePath: string,
  selectedModel: SupportedModel,
  primaryModelRef: string
): void {
  if (!surface.allowlist) {
    return;
  }

  const allowlistEntry = asPlainObject(surface.allowlist[primaryModelRef]);

  if (!allowlistEntry) {
    throw new Error(
      `Expected "agents.defaults.models.${primaryModelRef}" in ${filePath} to exist when "agents.defaults.models" is present.`
    );
  }

  if (allowlistEntry.alias !== selectedModel.key) {
    throw new Error(
      `Expected "agents.defaults.models.${primaryModelRef}.alias" in ${filePath} to be "${selectedModel.key}".`
    );
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

function hasOwnerOnlyPermissions(mode: number): boolean {
  return (mode & 0o077) === 0 && (mode & 0o700) !== 0;
}
