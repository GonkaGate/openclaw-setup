import { OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import type { OpenClawConfig } from "../types/settings.js";
import { asPlainObject, type PlainObject } from "./object-utils.js";

const OPENAI_PROVIDER_PATH = `models.providers.${OPENCLAW_PROVIDER_ID}` as const;

export const MANAGED_SETTINGS_PATHS = {
  agents: "agents",
  defaults: "agents.defaults",
  defaultModel: "agents.defaults.model",
  primaryModel: "agents.defaults.model.primary",
  allowlist: "agents.defaults.models",
  gateway: "gateway",
  models: "models",
  providers: "models.providers",
  openaiProvider: OPENAI_PROVIDER_PATH,
  openaiApi: `${OPENAI_PROVIDER_PATH}.api`,
  openaiApiKey: `${OPENAI_PROVIDER_PATH}.apiKey`,
  openaiBaseUrl: `${OPENAI_PROVIDER_PATH}.baseUrl`,
  openaiModels: `${OPENAI_PROVIDER_PATH}.models`
} as const;

export interface ManagedDefaultModelSnapshot {
  primary: unknown;
  raw: PlainObject;
}

export interface ManagedOpenAiProviderSnapshot {
  api: unknown;
  apiKey: unknown;
  baseUrl: unknown;
  models: unknown[] | undefined;
  raw: PlainObject;
}

export interface ManagedSettingsSnapshot {
  agents: PlainObject | undefined;
  allowlist: PlainObject | undefined;
  defaultModel: ManagedDefaultModelSnapshot | undefined;
  defaults: PlainObject | undefined;
  gateway: PlainObject | undefined;
  models: PlainObject | undefined;
  openaiProvider: ManagedOpenAiProviderSnapshot | undefined;
  providers: PlainObject | undefined;
}

export function readManagedGateway(settings: OpenClawConfig, sourceLabel: string): PlainObject | undefined {
  return requirePlainObjectWhenPresent(settings.gateway, MANAGED_SETTINGS_PATHS.gateway, sourceLabel);
}

export function assertManagedSettingsShape(settings: OpenClawConfig, sourceLabel: string): void {
  void readManagedSettingsSnapshot(settings, sourceLabel);
}

export function readManagedSettingsSnapshot(settings: OpenClawConfig, sourceLabel: string): ManagedSettingsSnapshot {
  const models = requirePlainObjectWhenPresent(settings.models, MANAGED_SETTINGS_PATHS.models, sourceLabel);
  const providers = requirePlainObjectWhenPresent(models?.providers, MANAGED_SETTINGS_PATHS.providers, sourceLabel);
  const openaiProvider = readManagedOpenAiProviderSnapshot(providers?.[OPENCLAW_PROVIDER_ID], sourceLabel);

  const agents = requirePlainObjectWhenPresent(settings.agents, MANAGED_SETTINGS_PATHS.agents, sourceLabel);
  const defaults = requirePlainObjectWhenPresent(agents?.defaults, MANAGED_SETTINGS_PATHS.defaults, sourceLabel);
  const defaultModel = readManagedDefaultModelSnapshot(defaults?.model, sourceLabel);
  const allowlist = requirePlainObjectWhenPresent(defaults?.models, MANAGED_SETTINGS_PATHS.allowlist, sourceLabel);

  return {
    agents,
    allowlist,
    defaultModel,
    defaults,
    gateway: readManagedGateway(settings, sourceLabel),
    models,
    openaiProvider,
    providers
  };
}

function readManagedOpenAiProviderSnapshot(
  value: unknown,
  sourceLabel: string
): ManagedOpenAiProviderSnapshot | undefined {
  const raw = requirePlainObjectWhenPresent(value, MANAGED_SETTINGS_PATHS.openaiProvider, sourceLabel);

  if (!raw) {
    return undefined;
  }

  return {
    api: raw.api,
    apiKey: raw.apiKey,
    baseUrl: raw.baseUrl,
    models: requireArrayWhenPresent(raw.models, MANAGED_SETTINGS_PATHS.openaiModels, sourceLabel),
    raw
  };
}

function readManagedDefaultModelSnapshot(value: unknown, sourceLabel: string): ManagedDefaultModelSnapshot | undefined {
  const raw = requirePlainObjectWhenPresent(value, MANAGED_SETTINGS_PATHS.defaultModel, sourceLabel);

  if (!raw) {
    return undefined;
  }

  return {
    primary: raw.primary,
    raw
  };
}

function requirePlainObjectWhenPresent(value: unknown, fieldPath: string, sourceLabel: string): PlainObject | undefined {
  if (value === undefined) {
    return undefined;
  }

  const objectValue = asPlainObject(value);

  if (!objectValue) {
    throw new Error(`Expected "${fieldPath}" in ${sourceLabel} to be a JSON5 object when present.`);
  }

  return objectValue;
}

function requireArrayWhenPresent(value: unknown, fieldPath: string, sourceLabel: string): unknown[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`Expected "${fieldPath}" in ${sourceLabel} to be a JSON5 array when present.`);
  }

  return [...value];
}
