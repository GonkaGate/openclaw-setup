import { OPENCLAW_PROVIDER_ID } from "./gateway.js";

export interface SupportedModelDefinition {
  key: string;
  displayName: string;
  modelId: string;
  description?: string;
  isDefault?: boolean;
}

const curatedModelRegistry = [
  {
    key: "qwen3-235b",
    displayName: "Qwen 3 235B Instruct",
    modelId: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    description: "Best default for complex reasoning on GonkaGate.",
    isDefault: true
  }
] as const satisfies readonly SupportedModelDefinition[];

const defaultModels = curatedModelRegistry.filter((model) => model.isDefault);

if (defaultModels.length !== 1) {
  throw new Error(`Expected exactly one default supported model, found ${defaultModels.length}.`);
}

export const SUPPORTED_MODELS = curatedModelRegistry;
export type SupportedModel = SupportedModelDefinition;
export type SupportedModelKey = SupportedModelDefinition["key"];
export const DEFAULT_MODEL = defaultModels[0];
export const DEFAULT_MODEL_KEY: SupportedModelKey = DEFAULT_MODEL.key;
export const SUPPORTED_MODEL_KEYS: SupportedModelKey[] = SUPPORTED_MODELS.map((model) => model.key);

export interface ManagedModelSelection {
  allowlistEntry: {
    alias: SupportedModelKey;
  };
  primaryModelRef: string;
  selectedModel: SupportedModel;
}

export function getSupportedModelByKey(key: string): SupportedModel | undefined {
  return SUPPORTED_MODELS.find((model) => model.key === key);
}

export function requireSupportedModel(key: string): SupportedModel {
  const model = getSupportedModelByKey(key);

  if (!model) {
    throw new Error(`Unsupported model key "${key}". Supported model keys: ${SUPPORTED_MODEL_KEYS.join(", ")}`);
  }

  return model;
}

export function toPrimaryModelRef(model: SupportedModel): string {
  return `${OPENCLAW_PROVIDER_ID}/${model.modelId}`;
}

export function toManagedModelSelection(selectedModel: SupportedModel): ManagedModelSelection {
  return {
    allowlistEntry: {
      alias: selectedModel.key
    },
    primaryModelRef: toPrimaryModelRef(selectedModel),
    selectedModel
  };
}

export function getSupportedModelByPrimaryRef(primaryModelRef: string): SupportedModel | undefined {
  return getManagedModelSelectionByPrimaryRef(primaryModelRef)?.selectedModel;
}

export function getManagedModelSelectionByPrimaryRef(primaryModelRef: string): ManagedModelSelection | undefined {
  const selectedModel = SUPPORTED_MODELS.find((model) => toPrimaryModelRef(model) === primaryModelRef);

  return selectedModel ? toManagedModelSelection(selectedModel) : undefined;
}

export function listSupportedPrimaryModelRefs(): string[] {
  return SUPPORTED_MODELS.map((model) => toPrimaryModelRef(model));
}
