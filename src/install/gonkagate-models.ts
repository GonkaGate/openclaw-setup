import { setTimeout as delay } from "node:timers/promises";
import { GONKAGATE_OPENAI_BASE_URL } from "../constants/gateway.js";
import {
  toManagedModelSelection,
  type GonkaGateModel,
  type GonkaGateModelKey,
  type GonkaGatePrimaryModelRef,
  type ManagedAllowlistEntry
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

export interface LiveGonkaGateModel {
  id: string;
  name?: string;
}

export interface OpenClawProviderModelCatalogEntry {
  id: string;
  name: string;
}

export interface GonkaGateModelCatalogEntry {
  allowlistEntry: ManagedAllowlistEntry;
  model: GonkaGateModel;
  primaryModelRef: GonkaGatePrimaryModelRef;
  providerModel: OpenClawProviderModelCatalogEntry;
}

interface GonkaGateModelCatalog {
  models: readonly LiveGonkaGateModel[];
}

export async function fetchGonkaGateModelCatalog(
  apiKey: string,
  options: FetchGonkaGateModelsOptions = {}
): Promise<GonkaGateModelCatalogEntry[]> {
  const catalog = await requestGonkaGateModelCatalog(apiKey, options);
  return createGonkaGateModelCatalog(catalog.models);
}

export function createGonkaGateModelCatalog(
  liveModels: readonly LiveGonkaGateModel[]
): GonkaGateModelCatalogEntry[] {
  return liveModels.map((liveModel) => createCatalogEntry(liveModel));
}

export function requireModelInGonkaGateCatalog(
  modelId: string,
  catalog: readonly GonkaGateModelCatalogEntry[]
): GonkaGateModel {
  const selectedModel = catalog.find((entry) => entry.model.modelId === modelId)?.model;

  if (selectedModel) {
    return selectedModel;
  }

  throw new GonkaGateModelsError({
    actual: modelId,
    expected: catalog.map((entry) => entry.model.modelId).join(", "),
    kind: "missing_selected_model",
    message:
      `Selected model "${modelId}" was not returned by GonkaGate ${GONKAGATE_MODELS_ENDPOINT}. ` +
      "Choose a currently available model and rerun the installer."
  });
}

export function getPromptDefaultModelKey(
  catalog: readonly GonkaGateModelCatalogEntry[]
): GonkaGateModelKey {
  const firstAvailable = catalog[0];

  if (!firstAvailable) {
    throw new GonkaGateModelsError({
      expected: "at least one model id",
      kind: "empty_catalog",
      message: "No GonkaGate models are available for the model prompt."
    });
  }

  return firstAvailable.model.key;
}

async function requestGonkaGateModelCatalog(
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

  const seenIds = new Set<string>();
  const models: LiveGonkaGateModel[] = [];

  for (const [index, entry] of root.data.entries()) {
    const model = parseGonkaGateModelEntry(entry, index);

    if (!seenIds.has(model.id)) {
      seenIds.add(model.id);
      models.push(model);
    }
  }

  if (models.length === 0) {
    throw new GonkaGateModelsError({
      expected: "at least one model id",
      kind: "empty_catalog",
      message: `GonkaGate ${GONKAGATE_MODELS_ENDPOINT} returned no usable models.`
    });
  }

  return {
    models
  };
}

function parseGonkaGateModelEntry(value: unknown, index: number): LiveGonkaGateModel {
  const raw = asPlainObject(value);
  const fieldPrefix = `data[${index}]`;

  if (!raw) {
    throw invalidCatalogResponse(fieldPrefix, "object", value);
  }

  if (typeof raw.id !== "string" || raw.id.trim().length === 0) {
    throw invalidCatalogResponse(`${fieldPrefix}.id`, "non-empty string", raw.id);
  }

  const id = raw.id.trim();
  const name = parseOptionalNonEmptyString(raw.name, `${fieldPrefix}.name`);

  return {
    id,
    ...(name ? { name } : {})
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

function createCatalogEntry(liveModel: LiveGonkaGateModel): GonkaGateModelCatalogEntry {
  const model = {
    displayName: liveModel.name ?? liveModel.id,
    key: liveModel.id,
    modelId: liveModel.id
  };
  const modelSelection = toManagedModelSelection(model);

  return {
    allowlistEntry: modelSelection.allowlistEntry,
    model,
    primaryModelRef: modelSelection.primaryModelRef,
    providerModel: {
      id: liveModel.id,
      name: liveModel.name ?? liveModel.id
    }
  };
}
