import { access, constants, readFile } from "node:fs/promises";
import JSON5 from "json5";
import type { OpenClawConfig } from "../types/settings.js";
import { isPlainObject } from "./object-utils.js";

export interface LoadSettingsResult {
  exists: boolean;
  settings: OpenClawConfig;
}

export async function loadSettings(filePath: string): Promise<LoadSettingsResult> {
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return {
      exists: false,
      settings: {}
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
  assertPlainObjectWhenPresent(settings.models, `models`, filePath);
  assertPlainObjectWhenPresent(settings.agents, `agents`, filePath);

  const models = isPlainObject(settings.models) ? settings.models : undefined;
  const agents = isPlainObject(settings.agents) ? settings.agents : undefined;

  assertPlainObjectWhenPresent(models?.providers, `models.providers`, filePath);
  assertPlainObjectWhenPresent(agents?.defaults, `agents.defaults`, filePath);

  const providers = isPlainObject(models?.providers) ? models.providers : undefined;
  const defaults = isPlainObject(agents?.defaults) ? agents.defaults : undefined;
  const openaiProvider = isPlainObject(providers?.openai) ? providers.openai : undefined;

  assertPlainObjectWhenPresent(providers?.openai, `models.providers.openai`, filePath);
  assertPlainObjectWhenPresent(defaults?.model, `agents.defaults.model`, filePath);
  assertPlainObjectWhenPresent(defaults?.models, `agents.defaults.models`, filePath);
  assertArrayWhenPresent(openaiProvider?.models, `models.providers.openai.models`, filePath);
}

function assertPlainObjectWhenPresent(value: unknown, fieldPath: string, filePath: string): void {
  if (value !== undefined && !isPlainObject(value)) {
    throw new Error(`Expected "${fieldPath}" in ${filePath} to be a JSON5 object when present.`);
  }
}

function assertArrayWhenPresent(value: unknown, fieldPath: string, filePath: string): void {
  if (value !== undefined && !Array.isArray(value)) {
    throw new Error(`Expected "${fieldPath}" in ${filePath} to be a JSON5 array when present.`);
  }
}
