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

export function getModelsSettings(settings: OpenClawConfig): PlainObject | undefined {
  return asPlainObject(settings.models);
}

export function getModelsProvidersSettings(settings: OpenClawConfig): PlainObject | undefined {
  return asPlainObject(getModelsSettings(settings)?.providers);
}

export function getManagedOpenAIProvider(settings: OpenClawConfig): PlainObject | undefined {
  return asPlainObject(getModelsProvidersSettings(settings)?.[OPENCLAW_PROVIDER_ID]);
}

export function getAgentsSettings(settings: OpenClawConfig): PlainObject | undefined {
  return asPlainObject(settings.agents);
}

export function getAgentDefaultsSettings(settings: OpenClawConfig): PlainObject | undefined {
  return asPlainObject(getAgentsSettings(settings)?.defaults);
}

export function getDefaultModelSettings(settings: OpenClawConfig): PlainObject | undefined {
  return asPlainObject(getAgentDefaultsSettings(settings)?.model);
}

export function getModelAllowlist(settings: OpenClawConfig): PlainObject | undefined {
  return asPlainObject(getAgentDefaultsSettings(settings)?.models);
}

export function getGatewaySettings(settings: OpenClawConfig): PlainObject | undefined {
  return asPlainObject(settings.gateway);
}
