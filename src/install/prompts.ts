import process from "node:process";
import { password, select } from "@inquirer/prompts";
import type { SupportedModel, SupportedModelKey } from "../constants/models.js";

export async function promptForApiKey(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Interactive setup requires a TTY so the API key can be entered securely.");
  }

  return password({
    message: "GonkaGate API key",
    mask: "*",
    validate: (value) => (value.trim().length > 0 ? true : "API key is required.")
  }).catch(rethrowPromptExit);
}

interface SelectChoice<Value> {
  value: Value;
  name: string;
  description?: string;
  short?: string;
}

interface SelectPromptConfig<Value> {
  message: string;
  choices: readonly SelectChoice<Value>[];
  default: Value;
  pageSize?: number;
  loop?: boolean;
  theme?: {
    indexMode?: "hidden" | "number";
  };
}

type SelectPrompt<Value> = (config: SelectPromptConfig<Value>) => Promise<Value>;

export function buildModelPromptConfig(
  models: readonly SupportedModel[],
  defaultModelKey: SupportedModelKey
): SelectPromptConfig<SupportedModelKey> {
  if (models.length === 0) {
    throw new Error("No supported GonkaGate models are configured.");
  }

  const defaultModel = requireModel(models, defaultModelKey);

  return {
    message: "Choose a GonkaGate model for OpenClaw",
    default: defaultModel.key,
    choices: models.map((model) => ({
      value: model.key,
      name: model.displayName,
      short: model.key,
      description: model.description ? `${model.description} Model ID: ${model.modelId}` : `Model ID: ${model.modelId}`
    })),
    pageSize: Math.min(models.length, 8),
    loop: false,
    theme: {
      indexMode: "number"
    }
  };
}

export async function promptForModel(
  models: readonly SupportedModel[],
  defaultModelKey: SupportedModelKey,
  selectPrompt: SelectPrompt<SupportedModelKey> = select as SelectPrompt<SupportedModelKey>
): Promise<SupportedModel> {
  const selectedModelKey = await selectPrompt(buildModelPromptConfig(models, defaultModelKey)).catch(rethrowPromptExit);
  return requireModel(models, selectedModelKey);
}

function requireModel(models: readonly SupportedModel[], key: SupportedModelKey): SupportedModel {
  const selectedModel = models.find((model) => model.key === key);

  if (!selectedModel) {
    throw new Error(`Configured model "${key}" is not present in the curated model registry.`);
  }

  return selectedModel;
}

function rethrowPromptExit(error: unknown): never {
  if (error instanceof Error && (error.name === "ExitPromptError" || error.name === "AbortPromptError")) {
    throw new Error("Installation cancelled.");
  }

  throw error;
}
