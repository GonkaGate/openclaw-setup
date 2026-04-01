import { access, constants, readFile } from "node:fs/promises";
import JSON5 from "json5";
import { OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import type { OpenClawConfig } from "../types/settings.js";
import {
  getAgentDefaultsSettings,
  getAgentsSettings,
  getModelsSettings,
  MANAGED_SETTINGS_PATHS
} from "./managed-settings-access.js";
import { asPlainObject, isPlainObject } from "./object-utils.js";

export interface ExistingSettingsResult {
  exists: true;
  settings: OpenClawConfig;
}

export interface MissingSettingsResult {
  exists: false;
}

export type LoadSettingsResult = ExistingSettingsResult | MissingSettingsResult;

export async function loadSettings(filePath: string): Promise<LoadSettingsResult> {
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return {
      exists: false
    };
  }

  const raw = await readFile(filePath, "utf8");
  let parsed: unknown;

  try {
    parsed = JSON5.parse(raw);
  } catch {
    throw new Error(`Failed to parse JSON5 in ${filePath}. Fix or restore that file before rerunning the installer.`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`Expected ${filePath} to contain a JSON5 object.`);
  }

  validateManagedSurface(parsed, filePath);

  return {
    exists: true,
    settings: parsed
  };
}

function validateManagedSurface(settings: OpenClawConfig, filePath: string): void {
  assertPlainObjectWhenPresent(settings.models, MANAGED_SETTINGS_PATHS.models, filePath);
  assertPlainObjectWhenPresent(settings.agents, MANAGED_SETTINGS_PATHS.agents, filePath);
  const models = getModelsSettings(settings);
  const agents = getAgentsSettings(settings);

  assertPlainObjectWhenPresent(models?.providers, MANAGED_SETTINGS_PATHS.providers, filePath);
  assertPlainObjectWhenPresent(agents?.defaults, MANAGED_SETTINGS_PATHS.defaults, filePath);
  const providers = asPlainObject(models?.providers);
  const defaults = getAgentDefaultsSettings(settings);

  assertPlainObjectWhenPresent(providers?.[OPENCLAW_PROVIDER_ID], MANAGED_SETTINGS_PATHS.openaiProvider, filePath);
  assertPlainObjectWhenPresent(defaults?.model, MANAGED_SETTINGS_PATHS.defaultModel, filePath);
  assertPlainObjectWhenPresent(defaults?.models, MANAGED_SETTINGS_PATHS.allowlist, filePath);
  const openaiProvider = asPlainObject(providers?.[OPENCLAW_PROVIDER_ID]);

  assertArrayWhenPresent(openaiProvider?.models, MANAGED_SETTINGS_PATHS.openaiModels, filePath);
}

function assertPlainObjectWhenPresent(value: unknown, fieldPath: string, filePath: string): void {
  if (value !== undefined && !asPlainObject(value)) {
    throw new Error(`Expected "${fieldPath}" in ${filePath} to be a JSON5 object when present.`);
  }
}

function assertArrayWhenPresent(value: unknown, fieldPath: string, filePath: string): void {
  if (value !== undefined && !Array.isArray(value)) {
    throw new Error(`Expected "${fieldPath}" in ${filePath} to be a JSON5 array when present.`);
  }
}
