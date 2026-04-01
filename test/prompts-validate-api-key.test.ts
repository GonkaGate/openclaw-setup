import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MODEL, DEFAULT_MODEL_KEY } from "../src/constants/models.js";
import { buildModelPromptConfig, promptForApiKey, promptForModel } from "../src/install/prompts.js";
import { validateApiKey } from "../src/install/validate-api-key.js";
import { withPatchedTty } from "./test-helpers.js";

test("model picker is configured with the default model for enter-to-accept flow", () => {
  const promptConfig = buildModelPromptConfig([DEFAULT_MODEL], DEFAULT_MODEL_KEY);

  assert.equal(promptConfig.default, DEFAULT_MODEL_KEY);
  assert.equal(promptConfig.theme?.indexMode, "number");
});

test("buildModelPromptConfig rejects an empty curated model registry", () => {
  assert.throws(() => buildModelPromptConfig([], DEFAULT_MODEL_KEY), /No supported GonkaGate models are configured/);
});

test("buildModelPromptConfig rejects default model keys that are not present in the registry", () => {
  assert.throws(
    () => buildModelPromptConfig([DEFAULT_MODEL], "missing-model" as typeof DEFAULT_MODEL_KEY),
    /not present in the curated model registry/
  );
});

test("promptForModel returns the default model when the prompt resolves to the default key", async () => {
  const selectedModel = await promptForModel(
    [DEFAULT_MODEL],
    DEFAULT_MODEL_KEY,
    async (config) => config.default
  );

  assert.equal(selectedModel.key, DEFAULT_MODEL_KEY);
  assert.equal(selectedModel.modelId, DEFAULT_MODEL.modelId);
});

test("promptForModel rejects model keys that are not in the curated registry", async () => {
  await assert.rejects(
    promptForModel(
      [DEFAULT_MODEL],
      DEFAULT_MODEL_KEY,
      async () => "missing-model" as typeof DEFAULT_MODEL_KEY
    ),
    /not present in the curated model registry/
  );
});

test("promptForModel maps prompt cancellation errors to a friendly message", async () => {
  const cancellationErrors = ["ExitPromptError", "AbortPromptError"];

  for (const errorName of cancellationErrors) {
    await assert.rejects(
      promptForModel([DEFAULT_MODEL], DEFAULT_MODEL_KEY, async () => {
        const error = new Error("cancelled");
        error.name = errorName;
        throw error;
      }),
      /Installation cancelled\./
    );
  }
});

test("promptForApiKey requires a TTY for secure entry", async () => {
  await withPatchedTty(false, false, async () => {
    await assert.rejects(promptForApiKey(), /requires a TTY/);
  });
});

test("validateApiKey requires a gp- prefix", () => {
  assert.equal(validateApiKey(" gp-works "), "gp-works");
  assert.throws(() => validateApiKey("sk-test"), /starts with "gp-"/);
});

test("validateApiKey rejects blank or malformed values and accepts the minimal valid format", () => {
  assert.throws(() => validateApiKey("   "), /API key is required/);
  assert.throws(() => validateApiKey("gp-test key"), /format looks invalid/);
  assert.throws(() => validateApiKey("gp-$bad"), /format looks invalid/);
  assert.equal(validateApiKey("gp-a"), "gp-a");
});
