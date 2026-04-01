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
