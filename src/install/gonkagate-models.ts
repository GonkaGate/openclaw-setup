import { setTimeout as delay } from "node:timers/promises";
import { GONKAGATE_OPENAI_BASE_URL } from "../constants/gateway.js";
import {
  SUPPORTED_MODELS,
  toManagedModelSelection,
  type ManagedAllowlistEntry,
  type SupportedModel,
  type SupportedModelKey,
  type SupportedPrimaryModelRef
} from "../constants/models.js";
import { GonkaGateModelsError, describeValue, getErrorMessage } from "./install-errors.js";
import { asPlainObject } from "./object-utils.js";

const GONKAGATE_MODELS_ENDPOINT = `${GONKAGATE_OPENAI_BASE_URL.replace(/\/$/, "")}/models`;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 250;
const DEFAULT_TIMEOUT_MS = 10_000;

interface GonkaGateModelsHttpResponse {
  json: () => Promise<unknown>;
  status: number;
}

export interface FetchGonkaGateModelsOptions {
  fetchImpl?: (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<GonkaGateModelsHttpResponse>;
  maxAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export interface GonkaGateModelCatalogEntry {
  contextLength?: number;
  id: string;
  name?: string;
}

export interface OpenClawProviderModelCatalogEntry {
  contextWindow?: number;
  id: string;
  name: string;
}

export interface CuratedGonkaGateModelCatalogEntry {
  allowlistEntry: ManagedAllowlistEntry;
  model: SupportedModel;
  primaryModelRef: SupportedPrimaryModelRef;
  providerModel: OpenClawProviderModelCatalogEntry;
}

interface GonkaGateModelCatalog {
  models: readonly GonkaGateModelCatalogEntry[];
}

export async function fetchCuratedGonkaGateModelCatalog(
  apiKey: string,
  options: FetchGonkaGateModelsOptions = {}
): Promise<CuratedGonkaGateModelCatalogEntry[]> {
  const catalog = await fetchGonkaGateModelCatalog(apiKey, options);
  const curatedCatalog = createCuratedGonkaGateModelCatalog(catalog.models);
  const curatedModelIds = new Set(curatedCatalog.map((entry) => entry.model.modelId));
  const missingSupportedModels = SUPPORTED_MODELS.filter((model) => !curatedModelIds.has(model.modelId));

  if (curatedCatalog.length === 0) {
    throw new GonkaGateModelsError({
      expected: Array.from(SUPPORTED_MODELS, (model) => model.modelId).join(", "),
      kind: "no_supported_models",
      message:
        `GonkaGate ${GONKAGATE_MODELS_ENDPOINT} did not return any curated supported models. ` +
        `Expected at least one of: ${Array.from(SUPPORTED_MODELS, (model) => model.modelId).join(", ")}.`
    });
  }

  if (missingSupportedModels.length > 0) {
    throw new GonkaGateModelsError({
      actual: catalog.models.map((model) => model.id).join(", "),
      expected: Array.from(SUPPORTED_MODELS, (model) => model.modelId).join(", "),
      kind: "missing_supported_models",
      message:
        `GonkaGate ${GONKAGATE_MODELS_ENDPOINT} did not return every curated supported model. ` +
        `Missing: ${missingSupportedModels.map((model) => model.modelId).join(", ")}.`
    });
  }

  return curatedCatalog;
}

export function createStaticCuratedGonkaGateModelCatalog(
  models: readonly SupportedModel[] = SUPPORTED_MODELS
): CuratedGonkaGateModelCatalogEntry[] {
  return Array.from(models, (model) => createCuratedCatalogEntry(model));
}

export function requireModelInGonkaGateCatalog(
  selectedModel: SupportedModel,
  catalog: readonly CuratedGonkaGateModelCatalogEntry[]
): void {
  if (catalog.some((entry) => entry.model.key === selectedModel.key)) {
    return;
  }

  throw new GonkaGateModelsError({
    actual: selectedModel.modelId,
    expected: catalog.length > 0
      ? catalog.map((entry) => entry.model.modelId).join(", ")
      : Array.from(SUPPORTED_MODELS, (model) => model.modelId).join(", "),
    kind: "missing_selected_model",
    message:
      `Selected curated model "${selectedModel.key}" (${selectedModel.modelId}) was not returned by ` +
      `GonkaGate ${GONKAGATE_MODELS_ENDPOINT}. Choose a currently available curated model and rerun the installer.`
  });
}

export function getPromptDefaultModelKey(
  catalog: readonly CuratedGonkaGateModelCatalogEntry[],
  preferredDefaultKey: SupportedModelKey
): SupportedModelKey {
  const preferredDefault = catalog.find((entry) => entry.model.key === preferredDefaultKey);

  if (preferredDefault) {
    return preferredDefault.model.key;
  }

  const firstAvailable = catalog[0];

  if (!firstAvailable) {
    throw new GonkaGateModelsError({
      expected: Array.from(SUPPORTED_MODELS, (model) => model.modelId).join(", "),
      kind: "no_supported_models",
      message: "No curated GonkaGate models are available for the model prompt."
    });
  }

  return firstAvailable.model.key;
}

async function fetchGonkaGateModelCatalog(
  apiKey: string,
  options: FetchGonkaGateModelsOptions
): Promise<GonkaGateModelCatalog> {
  const fetchImpl = options.fetchImpl ?? fetchGonkaGateModels;
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let lastCatalogUnavailable: GonkaGateModelsError<"catalog_unavailable"> | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: GonkaGateModelsHttpResponse;

    try {
      response = await fetchImpl(GONKAGATE_MODELS_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (error) {
      throw new GonkaGateModelsError({
        kind: "request_failed",
        message: `Unable to fetch GonkaGate models from ${GONKAGATE_MODELS_ENDPOINT}: ${getErrorMessage(error) ?? "unknown error"}.`,
        cause: error
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new GonkaGateModelsError({
        kind: "authentication_failed",
        message:
          `GonkaGate rejected the API key while fetching ${GONKAGATE_MODELS_ENDPOINT}. ` +
          "Check the gp-... key and rerun the installer.",
        status: response.status
      });
    }

    if (response.status === 503) {
      lastCatalogUnavailable = new GonkaGateModelsError({
        kind: "catalog_unavailable",
        message:
          `GonkaGate model catalog is temporarily unavailable (${GONKAGATE_MODELS_ENDPOINT} returned HTTP 503). ` +
          "Rerun the installer in a moment.",
        status: response.status
      });

      if (attempt < maxAttempts) {
        await delay(retryDelayMs);
        continue;
      }

      throw lastCatalogUnavailable;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new GonkaGateModelsError({
        kind: "request_failed",
        message: `GonkaGate ${GONKAGATE_MODELS_ENDPOINT} returned unexpected HTTP ${response.status}.`,
        status: response.status
      });
    }

    return parseGonkaGateModelCatalog(await readJsonResponse(response));
  }

  throw lastCatalogUnavailable ?? new GonkaGateModelsError({
    kind: "request_failed",
    message: `Unable to fetch GonkaGate models from ${GONKAGATE_MODELS_ENDPOINT}.`
  });
}

async function fetchGonkaGateModels(
  url: string,
  init: { headers: Record<string, string>; signal?: AbortSignal }
): Promise<GonkaGateModelsHttpResponse> {
  return fetch(url, init);
}

async function readJsonResponse(response: GonkaGateModelsHttpResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new GonkaGateModelsError({
      kind: "invalid_response",
      message: `GonkaGate ${GONKAGATE_MODELS_ENDPOINT} did not return valid JSON.`,
      cause: error
    });
  }
}

function parseGonkaGateModelCatalog(value: unknown): GonkaGateModelCatalog {
  const root = asPlainObject(value);

  if (!root) {
    throw invalidCatalogResponse("data", "object with a data array", value);
  }

  if (!Array.isArray(root.data)) {
    throw invalidCatalogResponse("data", "array", root.data);
  }

  return {
    models: root.data.map((entry, index) => parseGonkaGateModelEntry(entry, index))
  };
}

function parseGonkaGateModelEntry(value: unknown, index: number): GonkaGateModelCatalogEntry {
  const raw = asPlainObject(value);
  const fieldPrefix = `data[${index}]`;

  if (!raw) {
    throw invalidCatalogResponse(fieldPrefix, "object", value);
  }

  if (typeof raw.id !== "string" || raw.id.trim().length === 0) {
    throw invalidCatalogResponse(`${fieldPrefix}.id`, "non-empty string", raw.id);
  }

  const name = parseOptionalNonEmptyString(raw.name, `${fieldPrefix}.name`);
  const contextLength = parseOptionalPositiveInteger(raw.context_length, `${fieldPrefix}.context_length`);

  return {
    id: raw.id,
    ...(name ? { name } : {}),
    ...(contextLength ? { contextLength } : {})
  };
}

function parseOptionalNonEmptyString(value: unknown, fieldPath: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw invalidCatalogResponse(fieldPath, "string", value);
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalPositiveInteger(value: unknown, fieldPath: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw invalidCatalogResponse(fieldPath, "positive integer", value);
  }

  return value;
}

function invalidCatalogResponse(fieldPath: string, expected: string, actualValue: unknown): GonkaGateModelsError<"invalid_response"> {
  return new GonkaGateModelsError({
    actual: describeValue(actualValue),
    expected,
    kind: "invalid_response",
    message:
      `GonkaGate ${GONKAGATE_MODELS_ENDPOINT} returned an unexpected response. ` +
      `Expected "${fieldPath}" to be ${expected}, found ${describeValue(actualValue)}.`
  });
}

function createCuratedGonkaGateModelCatalog(
  liveModels: readonly GonkaGateModelCatalogEntry[]
): CuratedGonkaGateModelCatalogEntry[] {
  const liveById = new Map(liveModels.map((model) => [model.id, model]));

  return SUPPORTED_MODELS.flatMap((model) => {
    const liveModel = liveById.get(model.modelId);

    return liveModel ? [createCuratedCatalogEntry(model, liveModel)] : [];
  });
}

function createCuratedCatalogEntry(
  model: SupportedModel,
  liveModel?: GonkaGateModelCatalogEntry
): CuratedGonkaGateModelCatalogEntry {
  const modelSelection = toManagedModelSelection(model);

  return {
    allowlistEntry: modelSelection.allowlistEntry,
    model,
    primaryModelRef: modelSelection.primaryModelRef,
    providerModel: {
      id: model.modelId,
      name: liveModel?.name ?? model.displayName,
      ...(liveModel?.contextLength ? { contextWindow: liveModel.contextLength } : {})
    }
  };
}
