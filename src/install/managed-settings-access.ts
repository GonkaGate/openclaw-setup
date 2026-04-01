import { OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import type { OpenClawConfig } from "../types/settings.js";
import { asPlainObject, copyPlainObject, type PlainObject } from "./object-utils.js";

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

export interface ManagedSettingsSnapshot {
  agents: PlainObject | undefined;
  allowlist: PlainObject | undefined;
  defaultModel: PlainObject | undefined;
  defaults: PlainObject | undefined;
  gateway: PlainObject | undefined;
  models: PlainObject | undefined;
  openaiModels: unknown[] | undefined;
  openaiProvider: PlainObject | undefined;
  providers: PlainObject | undefined;
}

export interface ManagedSettingsUpdateState {
  agents: PlainObject;
  defaults: PlainObject;
  defaultModel: PlainObject;
  gateway: PlainObject;
  models: PlainObject;
  openaiModels: unknown[];
  openaiProvider: PlainObject;
  providers: PlainObject;
  allowlist?: PlainObject;
}

export function readManagedGateway(settings: OpenClawConfig, sourceLabel: string): PlainObject | undefined {
  return requirePlainObjectWhenPresent(settings.gateway, MANAGED_SETTINGS_PATHS.gateway, sourceLabel);
}

export function readManagedSettings(settings: OpenClawConfig, sourceLabel: string): ManagedSettingsSnapshot {
  const models = requirePlainObjectWhenPresent(settings.models, MANAGED_SETTINGS_PATHS.models, sourceLabel);
  const providers = requirePlainObjectWhenPresent(models?.providers, MANAGED_SETTINGS_PATHS.providers, sourceLabel);
  const openaiProvider = requirePlainObjectWhenPresent(
    providers?.[OPENCLAW_PROVIDER_ID],
    MANAGED_SETTINGS_PATHS.openaiProvider,
    sourceLabel
  );

  const agents = requirePlainObjectWhenPresent(settings.agents, MANAGED_SETTINGS_PATHS.agents, sourceLabel);
  const defaults = requirePlainObjectWhenPresent(agents?.defaults, MANAGED_SETTINGS_PATHS.defaults, sourceLabel);
  const defaultModel = requirePlainObjectWhenPresent(defaults?.model, MANAGED_SETTINGS_PATHS.defaultModel, sourceLabel);
  const allowlist = requirePlainObjectWhenPresent(defaults?.models, MANAGED_SETTINGS_PATHS.allowlist, sourceLabel);

  return {
    agents,
    allowlist,
    defaultModel,
    defaults,
    gateway: readManagedGateway(settings, sourceLabel),
    models,
    openaiModels: requireArrayWhenPresent(openaiProvider?.models, MANAGED_SETTINGS_PATHS.openaiModels, sourceLabel),
    openaiProvider,
    providers
  };
}

export function readManagedSettingsForUpdate(settings: OpenClawConfig, sourceLabel: string): ManagedSettingsUpdateState {
  return toManagedSettingsUpdateState(readManagedSettings(settings, sourceLabel));
}

function toManagedSettingsUpdateState(snapshot: ManagedSettingsSnapshot): ManagedSettingsUpdateState {
  return {
    agents: copyPlainObject(snapshot.agents),
    defaults: copyPlainObject(snapshot.defaults),
    defaultModel: copyPlainObject(snapshot.defaultModel),
    gateway: copyPlainObject(snapshot.gateway),
    models: copyPlainObject(snapshot.models),
    openaiModels: snapshot.openaiModels ? [...snapshot.openaiModels] : [],
    openaiProvider: copyPlainObject(snapshot.openaiProvider),
    providers: copyPlainObject(snapshot.providers),
    allowlist: snapshot.allowlist ? { ...snapshot.allowlist } : undefined
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
