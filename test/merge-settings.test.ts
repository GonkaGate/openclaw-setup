import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MODEL } from "../src/constants/models.js";
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

test("mergeSettingsWithGonkaGate preserves an existing openai model catalog and unrelated provider keys", () => {
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
    DEFAULT_MODEL
  );

  assert.deepEqual((merged.agents as Record<string, unknown>).defaults, {
    model: {
      primary: "openai/qwen/qwen3-235b-a22b-instruct-2507-fp8"
    },
    models: {
      "openai/legacy-model": {
        alias: "legacy"
      },
      "openai/qwen/qwen3-235b-a22b-instruct-2507-fp8": {
        alias: "qwen3-235b"
      }
    }
  });
});

test("mergeSettingsWithGonkaGate does not create agents.defaults.models when no allowlist existed", () => {
  const merged = mergeSettingsWithGonkaGate({}, "gp-test-key", DEFAULT_MODEL);

  assert.deepEqual((merged.agents as Record<string, unknown>).defaults, {
    model: {
      primary: "openai/qwen/qwen3-235b-a22b-instruct-2507-fp8"
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
