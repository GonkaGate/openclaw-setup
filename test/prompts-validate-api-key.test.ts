import assert from "node:assert/strict";
import test from "node:test";
import { INSTALL_ERROR_CODE, ApiKeyValidationError, PromptError } from "../src/install/install-errors.js";
import { buildModelPromptConfig, promptForApiKey, promptForModel } from "../src/install/prompts.js";
import { validateApiKey } from "../src/install/validate-api-key.js";
import { TEST_MODEL, withPatchedTty } from "./test-helpers.js";

test("model picker is configured with the first fetched model for enter-to-accept flow", () => {
  const promptConfig = buildModelPromptConfig([TEST_MODEL], TEST_MODEL.modelId);

  assert.equal(promptConfig.default, TEST_MODEL.modelId);
  assert.equal(promptConfig.theme?.indexMode, "number");
});

test("buildModelPromptConfig rejects an empty model catalog", () => {
  assert.throws(
    () => buildModelPromptConfig([], TEST_MODEL.modelId),
    (error) => {
      assert.ok(error instanceof PromptError);
      assert.equal(error.code, INSTALL_ERROR_CODE.promptFailed);
      assert.equal(error.kind, "no_models");
      return true;
    }
  );
});

test("buildModelPromptConfig rejects default model ids that are not present in the catalog", () => {
  assert.throws(
    () => buildModelPromptConfig([TEST_MODEL], "missing-model"),
    (error) => {
      assert.ok(error instanceof PromptError);
      assert.equal(error.kind, "model_catalog_mismatch");
      return true;
    }
  );
});

test("promptForModel returns the default model when the prompt resolves to the default id", async () => {
  const selectedModel = await promptForModel(
    [TEST_MODEL],
    TEST_MODEL.modelId,
    async (config) => config.default
  );

  assert.equal(selectedModel.key, TEST_MODEL.modelId);
  assert.equal(selectedModel.modelId, TEST_MODEL.modelId);
});

test("promptForModel rejects model ids that are not in the fetched catalog", async () => {
  await assert.rejects(
    promptForModel(
      [TEST_MODEL],
      TEST_MODEL.modelId,
      async () => "missing-model"
    ),
    (error) => {
      assert.ok(error instanceof PromptError);
      assert.equal(error.kind, "model_catalog_mismatch");
      return true;
    }
  );
});

test("promptForModel maps prompt cancellation errors to a friendly message", async () => {
  const cancellationErrors = ["ExitPromptError", "AbortPromptError"];

  for (const errorName of cancellationErrors) {
    await assert.rejects(
      promptForModel([TEST_MODEL], TEST_MODEL.modelId, async () => {
        const error = new Error("cancelled");
        error.name = errorName;
        throw error;
      }),
      (error) => {
        assert.ok(error instanceof PromptError);
        assert.equal(error.kind, "cancelled");
        assert.ok(error.cause instanceof Error);
        return true;
      }
    );
  }
});

test("promptForApiKey requires a TTY for secure entry", async () => {
  await withPatchedTty(false, false, async () => {
    await assert.rejects(
      promptForApiKey(),
      (error) => {
        assert.ok(error instanceof PromptError);
        assert.equal(error.kind, "missing_tty");
        return true;
      }
    );
  });
});

test("validateApiKey requires a gp- prefix", () => {
  assert.equal(validateApiKey(" gp-works "), "gp-works");
  assert.throws(
    () => validateApiKey("sk-test"),
    (error) => {
      assert.ok(error instanceof ApiKeyValidationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.apiKeyInvalid);
      assert.equal(error.kind, "wrong_prefix");
      return true;
    }
  );
});

test("validateApiKey rejects blank or malformed values and accepts the minimal valid format", () => {
  assert.throws(
    () => validateApiKey("   "),
    (error) => {
      assert.ok(error instanceof ApiKeyValidationError);
      assert.equal(error.kind, "missing");
      return true;
    }
  );
  assert.throws(
    () => validateApiKey("gp-test key"),
    (error) => {
      assert.ok(error instanceof ApiKeyValidationError);
      assert.equal(error.kind, "invalid_format");
      return true;
    }
  );
  assert.throws(
    () => validateApiKey("gp-$bad"),
    (error) => {
      assert.ok(error instanceof ApiKeyValidationError);
      assert.equal(error.kind, "invalid_format");
      return true;
    }
  );
  assert.equal(validateApiKey("gp-a"), "gp-a");
});
