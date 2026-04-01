import assert from "node:assert/strict";
import { chmod, writeFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULT_MODEL, toPrimaryModelRef } from "../src/constants/models.js";
import { formatUnixMode } from "../src/install/file-permissions.js";
import { verifySettings } from "../src/install/verify-settings.js";
import { createTempFilePath } from "./test-helpers.js";

test("verifySettings accepts the managed GonkaGate provider config with owner-only permissions", async () => {
  const filePath = await createTempFilePath("openclaw-verify-success-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o600);

  const result = await verifySettings(filePath, {
    models: {
      providers: {
        openai: {
          baseUrl: "https://api.gonkagate.com/v1",
          api: "openai-completions",
          apiKey: "gp-test-key",
          models: []
        }
      }
    },
    agents: {
      defaults: {
        model: {
          primary: toPrimaryModelRef(DEFAULT_MODEL)
        },
        models: {
          [toPrimaryModelRef(DEFAULT_MODEL)]: {
            alias: DEFAULT_MODEL.key
          }
        }
      }
    }
  });

  assert.equal(result.selectedModel.key, DEFAULT_MODEL.key);
  assert.equal(result.configMode, 0o600);
});

test("verifySettings rejects configs that point OpenClaw at the wrong base URL", async () => {
  const filePath = await createTempFilePath("openclaw-verify-base-url-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o600);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://example.com/v1",
            api: "openai-completions",
            apiKey: "gp-test-key",
            models: []
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: toPrimaryModelRef(DEFAULT_MODEL)
          }
        }
      }
    }),
    /models\.providers\.openai\.baseUrl/
  );
});

test("verifySettings rejects configs that use the wrong OpenClaw API adapter", async () => {
  const filePath = await createTempFilePath("openclaw-verify-api-adapter-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o600);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.gonkagate.com/v1",
            api: "responses",
            apiKey: "gp-test-key",
            models: []
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: toPrimaryModelRef(DEFAULT_MODEL)
          }
        }
      }
    }),
    /models\.providers\.openai\.api/
  );
});

test("verifySettings rejects malformed GonkaGate API keys", async () => {
  const filePath = await createTempFilePath("openclaw-verify-api-key-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o600);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.gonkagate.com/v1",
            api: "openai-completions",
            apiKey: "not-a-gonka-key",
            models: []
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: toPrimaryModelRef(DEFAULT_MODEL)
          }
        }
      }
    }),
    /Invalid "models\.providers\.openai\.apiKey"/
  );
});

test("verifySettings rejects saved API keys with leading or trailing whitespace", async () => {
  const filePath = await createTempFilePath("openclaw-verify-api-key-whitespace-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o600);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.gonkagate.com/v1",
            api: "openai-completions",
            apiKey: " gp-test-key ",
            models: []
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: toPrimaryModelRef(DEFAULT_MODEL)
          }
        }
      }
    }),
    /leading or trailing whitespace/
  );
});

test("verifySettings rejects unsupported primary model refs", async () => {
  const filePath = await createTempFilePath("openclaw-verify-model-ref-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o600);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.gonkagate.com/v1",
            api: "openai-completions",
            apiKey: "gp-test-key",
            models: []
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: "openai/not-supported"
          }
        }
      }
    }),
    /agents\.defaults\.model\.primary/
  );
});

test("verifySettings rejects missing allowlist entries when agents.defaults.models is present", async () => {
  const filePath = await createTempFilePath("openclaw-verify-allowlist-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o600);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.gonkagate.com/v1",
            api: "openai-completions",
            apiKey: "gp-test-key",
            models: []
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: toPrimaryModelRef(DEFAULT_MODEL)
          },
          models: {}
        }
      }
    }),
    /agents\.defaults\.models\./
  );
});

test("verifySettings rejects mismatched allowlist aliases when agents.defaults.models is present", async () => {
  const filePath = await createTempFilePath("openclaw-verify-alias-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o600);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.gonkagate.com/v1",
            api: "openai-completions",
            apiKey: "gp-test-key",
            models: []
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: toPrimaryModelRef(DEFAULT_MODEL)
          },
          models: {
            [toPrimaryModelRef(DEFAULT_MODEL)]: {
              alias: "wrong-alias"
            }
          }
        }
      }
    }),
    /alias/
  );
});

test("verifySettings rejects configs whose permissions are not owner-only", async () => {
  const filePath = await createTempFilePath("openclaw-verify-mode-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o644);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.gonkagate.com/v1",
            api: "openai-completions",
            apiKey: "gp-test-key",
            models: []
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: toPrimaryModelRef(DEFAULT_MODEL)
          }
        }
      }
    }),
    new RegExp(formatUnixMode(0o644))
  );
});

test("verifySettings rejects configs that are not owner-read-write only", async () => {
  const filePath = await createTempFilePath("openclaw-verify-readonly-mode-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o400);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.gonkagate.com/v1",
            api: "openai-completions",
            apiKey: "gp-test-key",
            models: []
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: toPrimaryModelRef(DEFAULT_MODEL)
          }
        }
      }
    }),
    new RegExp(formatUnixMode(0o400))
  );
});

test("verifySettings rejects configs whose managed openai provider omits the models array", async () => {
  const filePath = await createTempFilePath("openclaw-verify-provider-models-");
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, 0o600);

  await assert.rejects(
    verifySettings(filePath, {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.gonkagate.com/v1",
            api: "openai-completions",
            apiKey: "gp-test-key"
          }
        }
      },
      agents: {
        defaults: {
          model: {
            primary: toPrimaryModelRef(DEFAULT_MODEL)
          }
        }
      }
    }),
    /models\.providers\.openai\.models/
  );
});
