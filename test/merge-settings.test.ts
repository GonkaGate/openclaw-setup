import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MODEL, SUPPORTED_MODELS, toPrimaryModelRef } from "../src/constants/models.js";
import { SettingsShapeError } from "../src/install/install-errors.js";
import { mergeSettingsWithGonkaGate } from "../src/install/merge-settings.js";

test("mergeSettingsWithGonkaGate adds an empty openai model catalog when the provider did not define one", () => {
  const merged = mergeSettingsWithGonkaGate({}, "gp-test-key", DEFAULT_MODEL);

  assert.deepEqual(merged.models, {
    providers: {
      openai: {
        api: "openai-completions",
        apiKey: "gp-test-key",
        baseUrl: "https://api.gonkagate.com/v1",
        models: []
      }
    }
  });
});

test("mergeSettingsWithGonkaGate preserves an existing openai model catalog and unrelated provider entries", () => {
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
    DEFAULT_MODEL
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
      models: existingCatalog
    }
  });
});

test("mergeSettingsWithGonkaGate keeps agents.defaults.models behavior scoped to existing allowlists", () => {
  for (const model of SUPPORTED_MODELS) {
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
      model
    );

    assert.deepEqual((merged.agents as Record<string, unknown>).defaults, {
      model: {
        primary: toPrimaryModelRef(model)
      },
      models: {
        "openai/legacy-model": {
          alias: "legacy"
        },
        [toPrimaryModelRef(model)]: {
          alias: model.key
        }
      }
    });
  }
});

test("mergeSettingsWithGonkaGate does not create agents.defaults.models when no allowlist existed", () => {
  for (const model of SUPPORTED_MODELS) {
    const merged = mergeSettingsWithGonkaGate({}, "gp-test-key", model);

    assert.deepEqual((merged.agents as Record<string, unknown>).defaults, {
      model: {
        primary: toPrimaryModelRef(model)
      }
    });
  }
});

test("mergeSettingsWithGonkaGate sets the selected curated primary ref for every supported model", () => {
  for (const model of SUPPORTED_MODELS) {
    const merged = mergeSettingsWithGonkaGate({}, "gp-test-key", model);
    const defaultModel = (
      ((merged.agents as Record<string, unknown>).defaults as Record<string, unknown>).model as Record<string, unknown>
    );

    assert.equal(defaultModel.primary, toPrimaryModelRef(model));
  }
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
    DEFAULT_MODEL
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
    DEFAULT_MODEL
  );

  assert.deepEqual((merged.agents as Record<string, unknown>).defaults, {
    model: {
      fallback: "openai/legacy-model",
      primary: "openai/qwen/qwen3-235b-a22b-instruct-2507-fp8",
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
    DEFAULT_MODEL
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

test("mergeSettingsWithGonkaGate rejects malformed managed allowlist entries for the selected model", () => {
  assert.throws(
    () =>
      mergeSettingsWithGonkaGate(
        {
          agents: {
            defaults: {
              models: {
                [toPrimaryModelRef(DEFAULT_MODEL)]: "not-an-object"
              }
            }
          }
        },
        "gp-test-key",
        DEFAULT_MODEL
      ),
    (error) => {
      assert.ok(error instanceof SettingsShapeError);
      assert.equal(error.fieldPath, `agents.defaults.models.${toPrimaryModelRef(DEFAULT_MODEL)}`);
      return true;
    }
  );
});
