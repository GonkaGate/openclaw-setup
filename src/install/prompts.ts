import process from "node:process";
import { password, select } from "@inquirer/prompts";
import type { GonkaGateModel, GonkaGateModelKey } from "../constants/models.js";
import { PromptError } from "./install-errors.js";

export async function promptForApiKey(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new PromptError("missing_tty", "Interactive setup requires a TTY so the API key can be entered securely.");
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
  models: readonly GonkaGateModel[],
  defaultModelKey: GonkaGateModelKey
): SelectPromptConfig<GonkaGateModelKey> {
  if (models.length === 0) {
    throw new PromptError("no_models", "No GonkaGate models are available.");
  }

  const defaultModel = requireModel(models, defaultModelKey);

  return {
    message: "Choose a GonkaGate model for OpenClaw",
    default: defaultModel.key,
    choices: models.map((model) => ({
      value: model.key,
      name: model.displayName,
      short: model.key,
      description: `Model ID: ${model.modelId}`
    })),
    pageSize: Math.min(models.length, 8),
    loop: false,
    theme: {
      indexMode: "number"
    }
  };
}

export async function promptForModel(
  models: readonly GonkaGateModel[],
  defaultModelKey: GonkaGateModelKey,
  selectPrompt: SelectPrompt<GonkaGateModelKey> = select as SelectPrompt<GonkaGateModelKey>
): Promise<GonkaGateModel> {
  const selectedModelKey = await selectPrompt(buildModelPromptConfig(models, defaultModelKey)).catch(rethrowPromptExit);
  return requireModel(models, selectedModelKey);
}

function requireModel(models: readonly GonkaGateModel[], key: GonkaGateModelKey): GonkaGateModel {
  const selectedModel = models.find((model) => model.key === key);

  if (!selectedModel) {
    throw new PromptError(
      "model_catalog_mismatch",
      `Selected model "${key}" is not present in the fetched GonkaGate model catalog.`
    );
  }

  return selectedModel;
}

function rethrowPromptExit(error: unknown): never {
  if (error instanceof Error && (error.name === "ExitPromptError" || error.name === "AbortPromptError")) {
    throw new PromptError("cancelled", "Installation cancelled.", { cause: error });
  }

  throw error;
}
