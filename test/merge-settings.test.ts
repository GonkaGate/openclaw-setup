import assert from "node:assert/strict";
import test from "node:test";
import { toPrimaryModelRef } from "../src/constants/models.js";
import { SettingsShapeError } from "../src/install/install-errors.js";
import { mergeSettingsWithGonkaGate } from "../src/install/merge-settings.js";
import { TEST_MODEL, TEST_MODEL_BETA, createTestModelCatalog } from "./test-helpers.js";

const TEST_MODEL_CATALOG = createTestModelCatalog();

function expectedAllowlist() {
  return Object.fromEntries(
    TEST_MODEL_CATALOG.map((entry) => [entry.primaryModelRef, entry.allowlistEntry])
  );
}

function expectedProviderModels() {
  return TEST_MODEL_CATALOG.map((entry) => entry.providerModel);
}

test("mergeSettingsWithGonkaGate adds every fetched openai model catalog entry", () => {
  const merged = mergeSettingsWithGonkaGate({}, "gp-test-key", TEST_MODEL, TEST_MODEL_CATALOG);

  assert.deepEqual(merged.models, {
    providers: {
      openai: {
        api: "openai-completions",
        apiKey: "gp-test-key",
        baseUrl: "https://api.gonkagate.com/v1",
        models: expectedProviderModels()
      }
    }
  });
});

test("mergeSettingsWithGonkaGate merges fetched openai models and unrelated provider entries", () => {
  const existingCatalog = [
    {
      id: "existing-model",
      name: "Existing Model"
    }
  ];
  const merged = mergeSettingsWithGonkaGate(
    {
      models: {
        providers: {
          custom: {
            apiKey: "custom-secret",
            baseUrl: "https://models.example.com/v1"
          },
          openai: {
            headers: {
              "x-extra-header": "keep-me"
            },
            models: existingCatalog
          }
        }
      }
    },
    "gp-test-key",
    TEST_MODEL,
    TEST_MODEL_CATALOG
  );

  assert.deepEqual((merged.models as Record<string, unknown>).providers, {
    custom: {
      apiKey: "custom-secret",
      baseUrl: "https://models.example.com/v1"
    },
    openai: {
      api: "openai-completions",
      apiKey: "gp-test-key",
      baseUrl: "https://api.gonkagate.com/v1",
      headers: {
        "x-extra-header": "keep-me"
      },
      models: [
        ...existingCatalog,
        ...expectedProviderModels()
      ]
    }
  });
});

test("mergeSettingsWithGonkaGate creates agents.defaults.models for the fetched switcher catalog", () => {
  for (const model of [TEST_MODEL, TEST_MODEL_BETA]) {
    const merged = mergeSettingsWithGonkaGate({}, "gp-test-key", model, TEST_MODEL_CATALOG);

    assert.deepEqual((merged.agents as Record<string, unknown>).defaults, {
      models: expectedAllowlist(),
      model: {
        primary: toPrimaryModelRef(model)
      }
    });
  }
});

test("mergeSettingsWithGonkaGate merges fetched entries into existing agents.defaults.models allowlists", () => {
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
      }
    },
    "gp-test-key",
    TEST_MODEL_BETA,
    TEST_MODEL_CATALOG
  );

  assert.deepEqual((merged.agents as Record<string, unknown>).defaults, {
    model: {
      primary: toPrimaryModelRef(TEST_MODEL_BETA)
    },
    models: {
      "openai/legacy-model": {
        alias: "legacy"
      },
      ...expectedAllowlist()
    }
  });
});

test("mergeSettingsWithGonkaGate preserves unrelated top-level settings", () => {
  const merged = mergeSettingsWithGonkaGate(
    {
      theme: "solarized",
      workspace: {
        root: "~/.openclaw/workspace"
      }
    },
    "gp-test-key",
    TEST_MODEL,
    TEST_MODEL_CATALOG
  );

  assert.equal(merged.theme, "solarized");
  assert.deepEqual(merged.workspace, {
    root: "~/.openclaw/workspace"
  });
});

test("mergeSettingsWithGonkaGate preserves unrelated agents.defaults.model keys", () => {
  const merged = mergeSettingsWithGonkaGate(
    {
      agents: {
        defaults: {
          model: {
            fallback: "openai/legacy-model",
            temperature: 0.2
          }
        }
      }
    },
    "gp-test-key",
    TEST_MODEL,
    TEST_MODEL_CATALOG
  );

  assert.deepEqual((merged.agents as Record<string, unknown>).defaults, {
    models: expectedAllowlist(),
    model: {
      fallback: "openai/legacy-model",
      primary: toPrimaryModelRef(TEST_MODEL),
      temperature: 0.2
    }
  });
});

test("mergeSettingsWithGonkaGate preserves special object keys as data without mutating prototypes", () => {
  const merged = mergeSettingsWithGonkaGate(
    JSON.parse(`{
      "models": {
        "providers": {
          "openai": {
            "models": [],
            "headers": {
              "__proto__": {
                "polluted": true
              }
            }
          }
        }
      }
    }`),
    "gp-test-key",
    TEST_MODEL,
    TEST_MODEL_CATALOG
  );

  const providers = (merged.models as Record<string, unknown>).providers as Record<string, unknown>;
  const openaiProvider = providers.openai as Record<string, unknown>;
  const headers = openaiProvider.headers as Record<string, unknown>;

  assert.equal(Object.prototype.hasOwnProperty.call(headers, "__proto__"), true);
  assert.deepEqual(headers.__proto__, {
    polluted: true
  });
  assert.equal((Object.getPrototypeOf(headers) as { polluted?: boolean } | null)?.polluted, undefined);
});

test("mergeSettingsWithGonkaGate rejects malformed managed allowlist entries for fetched models", () => {
  assert.throws(
    () =>
      mergeSettingsWithGonkaGate(
        {
          agents: {
            defaults: {
              models: {
                [toPrimaryModelRef(TEST_MODEL)]: "not-an-object"
              }
            }
          }
        },
        "gp-test-key",
        TEST_MODEL,
        TEST_MODEL_CATALOG
      ),
    (error) => {
      assert.ok(error instanceof SettingsShapeError);
      assert.equal(error.fieldPath, `agents.defaults.models.${toPrimaryModelRef(TEST_MODEL)}`);
      return true;
    }
  );
});
