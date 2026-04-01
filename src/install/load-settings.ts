import { readFile } from "node:fs/promises";
import JSON5 from "json5";
import type { OpenClawConfig } from "../types/settings.js";
import { getManagedSettingsView, MANAGED_SETTINGS_PATHS } from "./managed-settings-access.js";
import { asPlainObject, isPlainObject } from "./object-utils.js";

export interface LoadedSettingsResult {
  kind: "loaded";
  settings: OpenClawConfig;
}

export interface MissingSettingsResult {
  kind: "missing";
}

export type LoadSettingsResult = LoadedSettingsResult | MissingSettingsResult;

export async function loadSettings(filePath: string): Promise<LoadSettingsResult> {
  let raw: string;

  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return {
        kind: "missing"
      };
    }

    throw error;
  }

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
    kind: "loaded",
    settings: parsed
  };
}

export function requireLoadedSettings(result: LoadSettingsResult, missingMessage: string): LoadedSettingsResult {
  if (result.kind === "missing") {
    throw new Error(missingMessage);
  }

  return result;
}

function validateManagedSurface(settings: OpenClawConfig, filePath: string): void {
  const managed = getManagedSettingsView(settings);

  assertPlainObjectWhenPresent(managed.modelsValue, MANAGED_SETTINGS_PATHS.models, filePath);
  assertPlainObjectWhenPresent(managed.agentsValue, MANAGED_SETTINGS_PATHS.agents, filePath);
  assertPlainObjectWhenPresent(managed.providersValue, MANAGED_SETTINGS_PATHS.providers, filePath);
  assertPlainObjectWhenPresent(managed.defaultsValue, MANAGED_SETTINGS_PATHS.defaults, filePath);
  assertPlainObjectWhenPresent(managed.openaiProviderValue, MANAGED_SETTINGS_PATHS.openaiProvider, filePath);
  assertPlainObjectWhenPresent(managed.defaultModelValue, MANAGED_SETTINGS_PATHS.defaultModel, filePath);
  assertPlainObjectWhenPresent(managed.allowlistValue, MANAGED_SETTINGS_PATHS.allowlist, filePath);
  assertArrayWhenPresent(managed.openaiModelsValue, MANAGED_SETTINGS_PATHS.openaiModels, filePath);
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

function isNodeErrorWithCode(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
