import { OPENCLAW_PROVIDER_ID } from "../constants/gateway.js";
import { listSupportedPrimaryModelRefs } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { SettingsShapeError, describeValue } from "./install-errors.js";
import {
  asPlainObject,
  type PlainObject,
  type ReadonlyPlainObject
} from "./object-utils.js";

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

export interface ManagedDefaultModelView {
  readonly primary: unknown;
  readonly raw: ReadonlyPlainObject;
}

export interface ManagedOpenAiProviderView {
  readonly api: unknown;
  readonly apiKey: unknown;
  readonly baseUrl: unknown;
  readonly models: readonly unknown[] | undefined;
  readonly raw: ReadonlyPlainObject;
}

export interface ManagedSettingsView {
  readonly agents: ReadonlyPlainObject | undefined;
  readonly allowlist: ReadonlyPlainObject | undefined;
  readonly defaultModel: ManagedDefaultModelView | undefined;
  readonly defaults: ReadonlyPlainObject | undefined;
  readonly gateway: ReadonlyPlainObject | undefined;
  readonly models: ReadonlyPlainObject | undefined;
  readonly openaiProvider: ManagedOpenAiProviderView | undefined;
  readonly providers: ReadonlyPlainObject | undefined;
}

export function readManagedGateway(settings: OpenClawConfig, sourceLabel: string): ReadonlyPlainObject | undefined {
  return requirePlainObjectWhenPresent(settings.gateway, MANAGED_SETTINGS_PATHS.gateway, sourceLabel);
}

export function readManagedAllowlistEntryWhenPresent(
  allowlist: ReadonlyPlainObject | undefined,
  primaryModelRef: string,
  sourceLabel: string
): ReadonlyPlainObject | undefined {
  return requirePlainObjectWhenPresent(
    allowlist?.[primaryModelRef],
    `${MANAGED_SETTINGS_PATHS.allowlist}.${primaryModelRef}`,
    sourceLabel
  );
}

export function assertManagedSettingsShape(settings: OpenClawConfig, sourceLabel: string): void {
  void readManagedSettingsView(settings, sourceLabel);
}

export function readManagedSettingsView(settings: OpenClawConfig, sourceLabel: string): ManagedSettingsView {
  const models = requirePlainObjectWhenPresent(settings.models, MANAGED_SETTINGS_PATHS.models, sourceLabel);
  const providers = requirePlainObjectWhenPresent(models?.providers, MANAGED_SETTINGS_PATHS.providers, sourceLabel);
  const openaiProvider = readManagedOpenAiProviderView(providers?.[OPENCLAW_PROVIDER_ID], sourceLabel);

  const agents = requirePlainObjectWhenPresent(settings.agents, MANAGED_SETTINGS_PATHS.agents, sourceLabel);
  const defaults = requirePlainObjectWhenPresent(agents?.defaults, MANAGED_SETTINGS_PATHS.defaults, sourceLabel);
  const defaultModel = readManagedDefaultModelView(defaults?.model, sourceLabel);
  const allowlist = requirePlainObjectWhenPresent(defaults?.models, MANAGED_SETTINGS_PATHS.allowlist, sourceLabel);

  for (const primaryModelRef of listSupportedPrimaryModelRefs()) {
    void readManagedAllowlistEntryWhenPresent(allowlist, primaryModelRef, sourceLabel);
  }

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

function readManagedOpenAiProviderView(
  value: unknown,
  sourceLabel: string
): ManagedOpenAiProviderView | undefined {
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

function readManagedDefaultModelView(value: unknown, sourceLabel: string): ManagedDefaultModelView | undefined {
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
    throw new SettingsShapeError({
      actual: describeValue(value),
      expected: "JSON5 object",
      fieldPath,
      kind: "expected_object",
      message: `Expected "${fieldPath}" in ${sourceLabel} to be a JSON5 object when present.`,
      sourceLabel
    });
  }

  return objectValue;
}

function requireArrayWhenPresent(value: unknown, fieldPath: string, sourceLabel: string): readonly unknown[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new SettingsShapeError({
      actual: describeValue(value),
      expected: "JSON5 array",
      fieldPath,
      kind: "expected_array",
      message: `Expected "${fieldPath}" in ${sourceLabel} to be a JSON5 array when present.`,
      sourceLabel
    });
  }

  return value;
}
