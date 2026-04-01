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

export interface ManagedSettingsView {
  agentsValue: unknown;
  agents: PlainObject | undefined;
  allowlistValue: unknown;
  allowlist: PlainObject | undefined;
  defaultModelValue: unknown;
  defaultModel: PlainObject | undefined;
  defaultsValue: unknown;
  defaults: PlainObject | undefined;
  gatewayValue: unknown;
  gateway: PlainObject | undefined;
  modelsValue: unknown;
  models: PlainObject | undefined;
  openaiModelsValue: unknown;
  openaiProviderValue: unknown;
  openaiProvider: PlainObject | undefined;
  providersValue: unknown;
  providers: PlainObject | undefined;
}

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

export function getManagedSettingsView(settings: OpenClawConfig): ManagedSettingsView {
  const modelsValue = settings.models;
  const models = asPlainObject(modelsValue);
  const providersValue = models?.providers;
  const providers = asPlainObject(providersValue);
  const openaiProviderValue = providers?.[OPENCLAW_PROVIDER_ID];
  const openaiProvider = asPlainObject(openaiProviderValue);
  const openaiModelsValue = openaiProvider?.models;

  const agentsValue = settings.agents;
  const agents = asPlainObject(agentsValue);
  const defaultsValue = agents?.defaults;
  const defaults = asPlainObject(defaultsValue);
  const defaultModelValue = defaults?.model;
  const defaultModel = asPlainObject(defaultModelValue);
  const allowlistValue = defaults?.models;
  const allowlist = asPlainObject(allowlistValue);

  const gatewayValue = settings.gateway;
  const gateway = asPlainObject(gatewayValue);

  return {
    agentsValue,
    agents,
    allowlistValue,
    allowlist,
    defaultModelValue,
    defaultModel,
    defaultsValue,
    defaults,
    gatewayValue,
    gateway,
    modelsValue,
    models,
    openaiModelsValue,
    openaiProviderValue,
    openaiProvider,
    providersValue,
    providers
  };
}

export function readManagedSettings(settings: OpenClawConfig, sourceLabel: string): ManagedSettingsSnapshot {
  const view = getManagedSettingsView(settings);

  return {
    agents: requirePlainObjectWhenPresent(view.agentsValue, MANAGED_SETTINGS_PATHS.agents, sourceLabel),
    allowlist: requirePlainObjectWhenPresent(view.allowlistValue, MANAGED_SETTINGS_PATHS.allowlist, sourceLabel),
    defaultModel: requirePlainObjectWhenPresent(view.defaultModelValue, MANAGED_SETTINGS_PATHS.defaultModel, sourceLabel),
    defaults: requirePlainObjectWhenPresent(view.defaultsValue, MANAGED_SETTINGS_PATHS.defaults, sourceLabel),
    gateway: requirePlainObjectWhenPresent(view.gatewayValue, MANAGED_SETTINGS_PATHS.gateway, sourceLabel),
    models: requirePlainObjectWhenPresent(view.modelsValue, MANAGED_SETTINGS_PATHS.models, sourceLabel),
    openaiModels: requireArrayWhenPresent(view.openaiModelsValue, MANAGED_SETTINGS_PATHS.openaiModels, sourceLabel),
    openaiProvider: requirePlainObjectWhenPresent(view.openaiProviderValue, MANAGED_SETTINGS_PATHS.openaiProvider, sourceLabel),
    providers: requirePlainObjectWhenPresent(view.providersValue, MANAGED_SETTINGS_PATHS.providers, sourceLabel)
  };
}

export function createManagedSettingsUpdateState(snapshot: ManagedSettingsSnapshot): ManagedSettingsUpdateState {
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
