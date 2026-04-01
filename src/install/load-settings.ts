import { access, constants, readFile } from "node:fs/promises";
import JSON5 from "json5";
import type { OpenClawConfig } from "../types/settings.js";
import { getManagedSettingsSurface } from "./managed-settings-surface.js";
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
  const surface = getManagedSettingsSurface(settings);
  assertPlainObjectWhenPresent(settings.models, `models`, filePath);
  assertPlainObjectWhenPresent(settings.agents, `agents`, filePath);
  assertPlainObjectWhenPresent(surface.models?.providers, `models.providers`, filePath);
  assertPlainObjectWhenPresent(surface.agents?.defaults, `agents.defaults`, filePath);
  assertPlainObjectWhenPresent(surface.providers?.openai, `models.providers.openai`, filePath);
  assertPlainObjectWhenPresent(surface.defaults?.model, `agents.defaults.model`, filePath);
  assertPlainObjectWhenPresent(surface.defaults?.models, `agents.defaults.models`, filePath);
  assertArrayWhenPresent(surface.openaiProvider?.models, `models.providers.openai.models`, filePath);
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
