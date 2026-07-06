import assert from "node:assert/strict";
import { chmod, writeFile } from "node:fs/promises";
import test from "node:test";
import { toPrimaryModelRef } from "../src/constants/models.js";
import { formatUnixMode } from "../src/install/file-permissions.js";
import { INSTALL_ERROR_CODE, SettingsVerificationError } from "../src/install/install-errors.js";
import { loadSettings } from "../src/install/load-settings.js";
import { mergeSettingsWithGonkaGate } from "../src/install/merge-settings.js";
import { verifySettings } from "../src/install/verify-settings.js";
import { writeSettings } from "../src/install/write-settings.js";
import {
  TEST_MODEL,
  TEST_MODEL_BETA,
  createManagedConfigFixture,
  createTempFilePath,
  createTestModelCatalog
} from "./test-helpers.js";

const TEST_MODEL_CATALOG = createTestModelCatalog();

function expectedAllowlist() {
  return Object.fromEntries(
    TEST_MODEL_CATALOG.map((entry) => [entry.primaryModelRef, entry.allowlistEntry])
  );
}

test("verifySettings accepts the managed GonkaGate provider config with owner-only permissions", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-success-", 0o600);

  const result = await verifySettings(filePath, createManagedConfigFixture({
    includeAllowlist: true,
    selectedModel: TEST_MODEL_BETA
  }));

  assert.equal(result.selectedModel.modelId, TEST_MODEL_BETA.modelId);
  assert.equal(result.selectedModel.displayName, TEST_MODEL_BETA.displayName);
  assert.equal(result.configMode, 0o600);
});

test("merged configs roundtrip through write, load, and verify for fetched models", async () => {
  for (const model of [TEST_MODEL, TEST_MODEL_BETA]) {
    const filePath = await createTempFilePath(`openclaw-verify-roundtrip-${model.key.replaceAll("/", "-")}-`);
    const merged = mergeSettingsWithGonkaGate(
      {
        gateway: {
          auth: {
            mode: "token"
          }
        },
        workspace: {
          root: "~/.openclaw/workspace"
        }
      },
      "gp-test-key",
      model,
      TEST_MODEL_CATALOG
    );

    await writeSettings(filePath, merged);

    const loaded = await loadSettings(filePath);

    assert.equal(loaded.kind, "loaded");
    if (loaded.kind !== "loaded") {
      assert.fail("Expected loadSettings to return the written settings");
    }

    const result = await verifySettings(filePath, loaded.settings);

    assert.equal(result.selectedModel.modelId, model.modelId);
    assert.equal(result.configMode, 0o600);
  }
});

test("merged configs with an existing allowlist roundtrip through write, load, and verify", async () => {
  const filePath = await createTempFilePath("openclaw-verify-allowlist-roundtrip-");
  const merged = mergeSettingsWithGonkaGate(
    {
      agents: {
        defaults: {
          models: {
            "openai/legacy-model": {
              alias: "legacy"
            }
          }
        }
      },
      models: {
        providers: {
          openai: {
            headers: {
              "x-extra-header": "keep-me"
            }
          }
        }
      }
    },
    "gp-test-key",
    TEST_MODEL_BETA,
    TEST_MODEL_CATALOG
  );

  await writeSettings(filePath, merged);

  const loaded = await loadSettings(filePath);

  assert.equal(loaded.kind, "loaded");
  if (loaded.kind !== "loaded") {
    assert.fail("Expected loadSettings to return the written settings");
  }

  const result = await verifySettings(filePath, loaded.settings);

  assert.equal(result.selectedModel.modelId, TEST_MODEL_BETA.modelId);

  const defaults = ((loaded.settings.agents as Record<string, unknown>).defaults as Record<string, unknown>);
  const allowlist = defaults.models as Record<string, unknown>;
  const provider = (((loaded.settings.models as Record<string, unknown>).providers as Record<string, unknown>).openai as Record<string, unknown>);

  assert.deepEqual(allowlist[toPrimaryModelRef(TEST_MODEL_BETA)], {
    alias: TEST_MODEL_BETA.modelId
  });
  assert.deepEqual(provider.headers, {
    "x-extra-header": "keep-me"
  });
});

test("verifySettings rejects configs that point OpenClaw at the wrong base URL", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-base-url-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      openaiProvider: {
        baseUrl: "https://example.com/v1"
      }
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsVerificationFailed);
      assert.equal(error.kind, "mismatched_managed_value");
      assert.equal(error.fieldPath, "models.providers.openai.baseUrl");
      assert.equal(error.actual, "https://example.com/v1");
      return true;
    }
  );
});

test("verifySettings rejects configs that use the wrong OpenClaw API adapter", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-api-adapter-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      openaiProvider: {
        api: "responses"
      }
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsVerificationFailed);
      assert.equal(error.kind, "mismatched_managed_value");
      assert.equal(error.fieldPath, "models.providers.openai.api");
      assert.equal(error.actual, "responses");
      return true;
    }
  );
});

test("verifySettings rejects malformed GonkaGate API keys", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-api-key-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      openaiProvider: {
        apiKey: "not-a-gonka-key"
      }
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsVerificationFailed);
      assert.equal(error.kind, "invalid_api_key");
      assert.equal(error.fieldPath, "models.providers.openai.apiKey");
      assert.ok(error.cause instanceof Error);
      assert.match(error.message, /Invalid "models\.providers\.openai\.apiKey"/);
      return true;
    }
  );
});

test("verifySettings rejects saved API keys with leading or trailing whitespace", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-api-key-whitespace-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      openaiProvider: {
        apiKey: " gp-test-key "
      }
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsVerificationFailed);
      assert.equal(error.kind, "invalid_api_key");
      assert.equal(error.fieldPath, "models.providers.openai.apiKey");
      assert.ok(error.cause instanceof SettingsVerificationError);
      assert.match(error.message, /leading or trailing whitespace/);
      return true;
    }
  );
});

test("verifySettings rejects primary model refs that are not openai model refs", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-model-ref-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      primaryModelRef: "anthropic/acme/model-alpha"
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "mismatched_managed_value");
      assert.equal(error.fieldPath, "agents.defaults.model.primary");
      assert.equal(error.actual, "anthropic/acme/model-alpha");
      return true;
    }
  );
});

test("verifySettings rejects missing allowlist entry for the selected model", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-allowlist-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      allowlist: {},
      includeAllowlist: true
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "missing_allowlist_entry");
      assert.match(error.fieldPath ?? "", /agents\.defaults\.models\./);
      return true;
    }
  );
});

test("verifySettings rejects configs without the model switcher allowlist", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-missing-allowlist-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      includeAllowlist: false
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "missing_managed_value");
      assert.equal(error.fieldPath, "agents.defaults.models");
      return true;
    }
  );
});

test("verifySettings rejects mismatched allowlist aliases for the selected model", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-alias-", 0o600);
  const allowlist = expectedAllowlist();
  allowlist[toPrimaryModelRef(TEST_MODEL)] = {
    alias: "wrong-alias"
  };

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      allowlist,
      includeAllowlist: true,
      selectedModel: TEST_MODEL
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "mismatched_allowlist_alias");
      assert.match(error.fieldPath ?? "", /alias/);
      assert.equal(error.actual, "wrong-alias");
      return true;
    }
  );
});

test("verifySettings rejects configs whose openai model catalog omits the selected model id", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-provider-model-entry-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      openaiProvider: {
        models: [
          {
            id: "other/model",
            name: "Other Model"
          }
        ]
      }
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "missing_provider_model_entry");
      assert.equal(error.fieldPath, "models.providers.openai.models");
      return true;
    }
  );
});

test("verifySettings rejects configs whose permissions are not owner-only", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-mode-", 0o644);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture()),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "invalid_permissions");
      assert.equal(error.actual, formatUnixMode(0o644));
      return true;
    }
  );
});

test("verifySettings rejects configs that are not owner-read-write only", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-readonly-mode-", 0o400);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture()),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "invalid_permissions");
      assert.equal(error.actual, formatUnixMode(0o400));
      return true;
    }
  );
});

test("verifySettings rejects configs whose managed openai provider omits the models array", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-provider-models-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      includeOpenAiModels: false
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "missing_managed_value");
      assert.equal(error.fieldPath, "models.providers.openai.models");
      return true;
    }
  );
});

async function createManagedConfigFile(prefix: string, mode: number): Promise<string> {
  const filePath = await createTempFilePath(prefix);
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, mode);
  return filePath;
}
