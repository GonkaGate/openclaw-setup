import assert from "node:assert/strict";
import { chmod, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { parseCliOptions, parseCliRequest, run } from "../src/cli.js";
import { DEFAULT_MODEL, DEFAULT_MODEL_KEY, toPrimaryModelRef } from "../src/constants/models.js";
import { getSettingsTarget } from "../src/install/settings-paths.js";
import { createTempFilePath, withCapturedConsoleLog, withMutedConsoleLog } from "./test-helpers.js";

const silentOutput = {
  writeOut: () => {},
  writeErr: () => {}
};

type RunDependencies = NonNullable<Parameters<typeof run>[1]>;

function createHealthyRuntimeResult() {
  return {
    resolvedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL),
    status: "healthy" as const
  };
}

function createRuntimeFailureResult(
  status: "gateway_unavailable" | "runtime_unhealthy" | "model_resolution_failed",
  message: string
) {
  return {
    message,
    status
  };
}

interface RunHarnessState {
  backupCalls: number;
  backupPaths: string[];
  configValidationCalls: number;
  configValidationPaths: string[];
  ensureCalls: number;
  gatewayBootstrapCalls: number;
  loadCalls: number;
  loadPaths: string[];
  prewriteValidationCalls: number;
  prewriteValidationPaths: string[];
  promptApiKeyCalls: number;
  promptModelCalls: number;
  runtimeVerifyCalls: number;
  runtimeVerifyInputs: Array<{
    expectedPrimaryModelRef: string;
    filePath: string;
  }>;
  setupCalls: number;
  validateCalls: number;
  verifyCalls: number;
  verifyPaths: string[];
  writeCalls: number;
  writePaths: string[];
  order: string[];
  writtenSettings?: Record<string, unknown>;
}

function createRunHarness(overrides: Partial<RunDependencies> = {}): {
  dependencies: RunDependencies;
  state: RunHarnessState;
} {
  const state: RunHarnessState = {
    backupCalls: 0,
    backupPaths: [],
    configValidationCalls: 0,
    configValidationPaths: [],
    ensureCalls: 0,
    gatewayBootstrapCalls: 0,
    loadCalls: 0,
    loadPaths: [],
    prewriteValidationCalls: 0,
    prewriteValidationPaths: [],
    promptApiKeyCalls: 0,
    promptModelCalls: 0,
    runtimeVerifyCalls: 0,
    runtimeVerifyInputs: [],
    setupCalls: 0,
    validateCalls: 0,
    verifyCalls: 0,
    verifyPaths: [],
    writeCalls: 0,
    writePaths: [],
    order: []
  };

  const dependencies: RunDependencies = {
    createBackup: async (filePath) => {
      state.backupCalls += 1;
      state.backupPaths.push(filePath);
      state.order.push("backup");
      return "/tmp/openclaw.json.backup";
    },
    ensureOpenClawInstalled: () => {
      state.ensureCalls += 1;
      state.order.push("ensure");
    },
    ensureFreshInstallLocalGateway: (settings) => {
      state.gatewayBootstrapCalls += 1;
      state.order.push("bootstrapGateway");
      return {
        configuredLocalMode: true,
        settings: {
          ...settings,
          gateway: {
            mode: "local"
          }
        }
      };
    },
    getSettingsTarget: () => ({
      path: "/tmp/openclaw.json"
    }),
    initializeOpenClawBaseConfig: () => {
      state.setupCalls += 1;
      state.order.push("setup");
    },
    loadSettings: async (filePath) => {
      state.loadCalls += 1;
      state.loadPaths.push(filePath);
      state.order.push("load");
      return {
        exists: true,
        settings: {}
      };
    },
    promptForApiKey: async () => {
      state.promptApiKeyCalls += 1;
      state.order.push("promptApiKey");
      return "gp-test-key";
    },
    promptForModel: async () => {
      state.promptModelCalls += 1;
      state.order.push("promptModel");
      return DEFAULT_MODEL;
    },
    validateApiKey: (apiKey) => {
      state.validateCalls += 1;
      state.order.push("validateApiKey");
      return apiKey;
    },
    validateOpenClawConfig: (filePath) => {
      state.configValidationCalls += 1;
      state.configValidationPaths.push(filePath);
      state.order.push("validateOpenClawConfig");
    },
    validateSettingsBeforeWrite: async (filePath) => {
      state.prewriteValidationCalls += 1;
      state.prewriteValidationPaths.push(filePath);
      state.order.push("validateSettingsBeforeWrite");
    },
    verifyOpenClawRuntime: (filePath, expectedPrimaryModelRef) => {
      state.runtimeVerifyCalls += 1;
      state.runtimeVerifyInputs.push({
        expectedPrimaryModelRef,
        filePath
      });
      state.order.push("verifyRuntime");
      return createHealthyRuntimeResult();
    },
    verifySettings: async (filePath) => {
      state.verifyCalls += 1;
      state.verifyPaths.push(filePath);
      state.order.push("verify");
      return {
        configMode: 0o600,
        selectedModel: DEFAULT_MODEL
      };
    },
    writeSettings: async (filePath, settings) => {
      state.writeCalls += 1;
      state.writePaths.push(filePath);
      state.order.push("write");
      state.writtenSettings = settings as Record<string, unknown>;
    },
    ...overrides
  };

  return {
    dependencies,
    state
  };
}

test("parseCliOptions accepts supported --model values and rejects unsupported ones", () => {
  assert.equal(parseCliOptions(["--model", DEFAULT_MODEL_KEY], silentOutput).modelKey, DEFAULT_MODEL_KEY);
  assert.equal(parseCliOptions([`--model=${DEFAULT_MODEL_KEY}`], silentOutput).modelKey, DEFAULT_MODEL_KEY);
  assert.throws(() => parseCliOptions(["--model", "not-supported"], silentOutput), /Allowed choices are/);
});

test("parseCliRequest routes the verify subcommand separately from the install flow", () => {
  assert.deepEqual(parseCliRequest(["verify"], silentOutput), {
    command: "verify"
  });
});

test("parseCliOptions rejects --api-key arguments", () => {
  assert.throws(() => parseCliOptions(["--api-key", "gp-test"]), /unsupported/);
  assert.throws(() => parseCliOptions(["--api-key=gp-test"]), /unsupported/);
});

test("run initializes missing OpenClaw config automatically and skips backup on fresh installs", async () => {
  let loadCount = 0;
  let setupCalls = 0;
  let backupCalls = 0;
  let writtenSettings: Record<string, unknown> | undefined;

  await withMutedConsoleLog(async () => {
    await run([], {
      createBackup: async () => {
        backupCalls += 1;
        return "/tmp/should-not-exist.backup";
      },
      ensureOpenClawInstalled: () => {},
      getSettingsTarget: () => ({
        path: "/tmp/openclaw.json"
      }),
      initializeOpenClawBaseConfig: () => {
        setupCalls += 1;
      },
      loadSettings: async () => {
        loadCount += 1;

        if (loadCount === 1) {
          return {
            exists: false
          };
        }

        return {
          exists: true,
          settings: {
            agents: {
              defaults: {
                workspace: "~/.openclaw/workspace"
              }
            },
            gateway: {
              auth: {
                mode: "token"
              }
            }
          }
        };
      },
      ensureFreshInstallLocalGateway: (settings) => ({
        configuredLocalMode: true,
        settings: {
          ...settings,
          gateway: {
            ...((settings.gateway as Record<string, unknown>) ?? {}),
            mode: "local"
          }
        }
      }),
      promptForApiKey: async () => "gp-test-key",
      promptForModel: async () => DEFAULT_MODEL,
      validateApiKey: (apiKey) => apiKey,
      validateOpenClawConfig: () => {},
      validateSettingsBeforeWrite: async () => {},
      verifyOpenClawRuntime: () => createRuntimeFailureResult("gateway_unavailable", "gateway offline"),
      writeSettings: async (_filePath, settings) => {
        writtenSettings = settings as Record<string, unknown>;
      }
    });
  });

  assert.equal(setupCalls, 1);
  assert.equal(loadCount, 2);
  assert.equal(backupCalls, 0);
  assert.deepEqual(writtenSettings, {
    agents: {
      defaults: {
        workspace: "~/.openclaw/workspace",
        model: {
          primary: toPrimaryModelRef(DEFAULT_MODEL)
        }
      }
    },
    gateway: {
      auth: {
        mode: "token"
      },
      mode: "local"
    },
    models: {
      providers: {
        openai: {
          api: "openai-completions",
          apiKey: "gp-test-key",
          baseUrl: "https://api.gonkagate.com/v1",
          models: []
        }
      }
    }
  });
});

test("run preserves an existing gateway.mode from fresh OpenClaw setup output", async () => {
  let writtenSettings: Record<string, unknown> | undefined;

  await withMutedConsoleLog(async () => {
    await run([], {
      ensureOpenClawInstalled: () => {},
      getSettingsTarget: () => ({
        path: "/tmp/openclaw.json"
      }),
      initializeOpenClawBaseConfig: () => {},
      loadSettings: (() => {
        let loadCount = 0;

        return async () => {
          loadCount += 1;

          if (loadCount === 1) {
            return {
              exists: false
            };
          }

          return {
            exists: true,
            settings: {
              gateway: {
                bind: "loopback",
                mode: "trusted-proxy"
              }
            }
          };
        };
      })(),
      ensureFreshInstallLocalGateway: (settings) => ({
        configuredLocalMode: false,
        settings
      }),
      promptForApiKey: async () => "gp-test-key",
      promptForModel: async () => DEFAULT_MODEL,
      validateApiKey: (apiKey) => apiKey,
      validateOpenClawConfig: () => {},
      validateSettingsBeforeWrite: async () => {},
      verifyOpenClawRuntime: () => createRuntimeFailureResult("gateway_unavailable", "gateway offline"),
      writeSettings: async (_filePath, settings) => {
        writtenSettings = settings as Record<string, unknown>;
      }
    });
  });

  assert.deepEqual(writtenSettings?.gateway, {
    bind: "loopback",
    mode: "trusted-proxy"
  });
});

test("run does not rewrite gateway.mode for existing configs", async () => {
  const { dependencies, state } = createRunHarness({
    loadSettings: async () => {
      state.loadCalls += 1;
      state.order.push("load");
      return {
        exists: true,
        settings: {
          gateway: {
            auth: {
              mode: "token"
            }
          }
        }
      };
    },
    verifyOpenClawRuntime: () => createRuntimeFailureResult("gateway_unavailable", "gateway offline")
  });

  await withMutedConsoleLog(async () => {
    await run([], dependencies);
  });

  assert.equal(state.gatewayBootstrapCalls, 0);
  assert.deepEqual(state.writtenSettings?.gateway, {
    auth: {
      mode: "token"
    }
  });
});

test("run creates a backup once before writing when updating an existing config", async () => {
  const { dependencies, state } = createRunHarness();

  await withMutedConsoleLog(async () => {
    await run([], dependencies);
  });

  assert.equal(state.backupCalls, 1);
  assert.equal(state.configValidationCalls, 1);
  assert.equal(state.prewriteValidationCalls, 1);
  assert.equal(state.writeCalls, 1);
  assert.equal(state.order.indexOf("backup") < state.order.indexOf("write"), true);
});

test("run install uses the resolved target path from OpenClaw env precedence", async () => {
  const resolvedTargetPath = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
  }).path;
  const { dependencies, state } = createRunHarness({
    getSettingsTarget: () =>
      getSettingsTarget("/tmp/test-home", {
        OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
      })
  });

  await withMutedConsoleLog(async () => {
    await run([], dependencies);
  });

  assert.deepEqual(state.loadPaths, [resolvedTargetPath]);
  assert.deepEqual(state.configValidationPaths, [resolvedTargetPath]);
  assert.deepEqual(state.prewriteValidationPaths, [resolvedTargetPath]);
  assert.deepEqual(state.backupPaths, [resolvedTargetPath]);
  assert.deepEqual(state.writePaths, [resolvedTargetPath]);
  assert.deepEqual(state.runtimeVerifyInputs, [
    {
      expectedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL),
      filePath: resolvedTargetPath
    }
  ]);
});

test("run succeeds after writing a config when the Gateway is not running yet and prints one exact next command", async () => {
  const { dependencies } = createRunHarness({
    verifyOpenClawRuntime: () => createRuntimeFailureResult("gateway_unavailable", "gateway offline")
  });

  const { logs } = await withCapturedConsoleLog(async () => {
    await run([], dependencies);
  });

  assert.equal(logs.some((line) => line.includes("Next step:")), true);
  assert.equal(logs.some((line) => line.includes("openclaw gateway")), true);
  assert.equal(logs.some((line) => line.includes("Gateway RPC: reachable")), false);
  assert.equal(logs.some((line) => line.includes("Verify with: npx @gonkagate/openclaw verify")), false);
});

test("run fails after writing when the Gateway is reachable but unhealthy", async () => {
  const { dependencies, state } = createRunHarness({
    verifyOpenClawRuntime: () => createRuntimeFailureResult("runtime_unhealthy", "health failed")
  });

  await assert.rejects(
    withMutedConsoleLog(async () => {
      await run([], dependencies);
    }),
    /health failed/
  );

  assert.equal(state.writeCalls, 1);
});

test("run fails after writing when the resolved model does not match the saved config", async () => {
  const { dependencies, state } = createRunHarness({
    verifyOpenClawRuntime: () => createRuntimeFailureResult("model_resolution_failed", "resolved wrong model")
  });

  await assert.rejects(
    withMutedConsoleLog(async () => {
      await run([], dependencies);
    }),
    /resolved wrong model/
  );

  assert.equal(state.writeCalls, 1);
});

test("run uses the curated --model value without prompting for a model", async () => {
  const { dependencies, state } = createRunHarness({
    promptForModel: async () => {
      throw new Error("promptForModel should not be called when --model is provided");
    }
  });

  await withMutedConsoleLog(async () => {
    await run(["--model", DEFAULT_MODEL_KEY], dependencies);
  });

  assert.equal(state.promptApiKeyCalls, 1);
  assert.equal(state.promptModelCalls, 0);
  assert.equal(state.configValidationCalls, 1);
  assert.equal(state.prewriteValidationCalls, 1);
  assert.equal(state.writeCalls, 1);
  assert.deepEqual((state.writtenSettings?.agents as Record<string, unknown>).defaults, {
    model: {
      primary: toPrimaryModelRef(DEFAULT_MODEL)
    }
  });
});

test("run verify checks the existing config without prompting or writing", async () => {
  const { dependencies, state } = createRunHarness();

  await withMutedConsoleLog(async () => {
    await run(["verify"], dependencies);
  });

  assert.equal(state.ensureCalls, 1);
  assert.equal(state.loadCalls, 1);
  assert.equal(state.configValidationCalls, 1);
  assert.equal(state.verifyCalls, 1);
  assert.equal(state.runtimeVerifyCalls, 1);
  assert.equal(state.promptApiKeyCalls, 0);
  assert.equal(state.promptModelCalls, 0);
  assert.equal(state.validateCalls, 0);
  assert.equal(state.backupCalls, 0);
  assert.equal(state.writeCalls, 0);
});

test("run verify uses the resolved target path from OpenClaw env precedence", async () => {
  const resolvedTargetPath = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_CONFIG_PATH: "/tmp/custom-openclaw.json",
    OPENCLAW_HOME: "/tmp/ignored-openclaw-home",
    OPENCLAW_STATE_DIR: "/tmp/ignored-openclaw-state"
  }).path;
  const { dependencies, state } = createRunHarness({
    getSettingsTarget: () =>
      getSettingsTarget("/tmp/test-home", {
        OPENCLAW_CONFIG_PATH: "/tmp/custom-openclaw.json",
        OPENCLAW_HOME: "/tmp/ignored-openclaw-home",
        OPENCLAW_STATE_DIR: "/tmp/ignored-openclaw-state"
      })
  });

  await withMutedConsoleLog(async () => {
    await run(["verify"], dependencies);
  });

  assert.deepEqual(state.loadPaths, [resolvedTargetPath]);
  assert.deepEqual(state.configValidationPaths, [resolvedTargetPath]);
  assert.deepEqual(state.verifyPaths, [resolvedTargetPath]);
  assert.deepEqual(state.runtimeVerifyInputs, [
    {
      expectedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL),
      filePath: resolvedTargetPath
    }
  ]);
  assert.deepEqual(state.writePaths, []);
});

test("run verify stays strict when the Gateway is unavailable", async () => {
  const { dependencies, state } = createRunHarness({
    verifyOpenClawRuntime: () => {
      state.runtimeVerifyCalls += 1;
      state.order.push("verifyRuntime");
      return createRuntimeFailureResult("gateway_unavailable", "gateway offline");
    }
  });

  await assert.rejects(
    withMutedConsoleLog(async () => {
      await run(["verify"], dependencies);
    }),
    /gateway offline/
  );

  assert.equal(state.verifyCalls, 1);
  assert.equal(state.runtimeVerifyCalls, 1);
});

test("run stops before loading settings or prompting when OpenClaw is unavailable", async () => {
  const failure = new Error("OpenClaw CLI was not found");
  const { dependencies, state } = createRunHarness({
    ensureOpenClawInstalled: () => {
      state.ensureCalls += 1;
      throw failure;
    }
  });

  await assert.rejects(
    withMutedConsoleLog(async () => {
      await run([], dependencies);
    }),
    (error) => error === failure
  );

  assert.equal(state.ensureCalls, 1);
  assert.equal(state.loadCalls, 0);
  assert.equal(state.promptApiKeyCalls, 0);
  assert.equal(state.promptModelCalls, 0);
  assert.equal(state.backupCalls, 0);
  assert.equal(state.writeCalls, 0);
});

test("run verify fails clearly when the OpenClaw config does not exist yet", async () => {
  const { dependencies, state } = createRunHarness({
    loadSettings: async () => {
      state.loadCalls += 1;
      state.order.push("load");
      return {
        exists: false
      };
    }
  });

  await assert.rejects(
    withMutedConsoleLog(async () => {
      await run(["verify"], dependencies);
    }),
    /Run "npx @gonkagate\/openclaw" first/
  );

  assert.equal(state.ensureCalls, 1);
  assert.equal(state.loadCalls, 1);
  assert.equal(state.configValidationCalls, 0);
  assert.equal(state.verifyCalls, 0);
  assert.equal(state.runtimeVerifyCalls, 0);
  assert.equal(state.promptApiKeyCalls, 0);
  assert.equal(state.writeCalls, 0);
});

test("run verify succeeds against a real temp config without mutating it", async () => {
  const filePath = await createTempFilePath("openclaw-run-verify-integration-");
  const fileContents = `{
    models: {
      providers: {
        openai: {
          baseUrl: "https://api.gonkagate.com/v1",
          api: "openai-completions",
          apiKey: "gp-test-key",
          models: [],
        },
      },
    },
    agents: {
      defaults: {
        model: {
          primary: "${toPrimaryModelRef(DEFAULT_MODEL)}",
        },
        models: {
          "${toPrimaryModelRef(DEFAULT_MODEL)}": {
            alias: "${DEFAULT_MODEL.key}",
          },
        },
      },
    },
  }
`;

  await writeFile(filePath, fileContents, "utf8");
  await chmod(filePath, 0o600);

  await withMutedConsoleLog(async () => {
    await run(["verify"], {
      ensureOpenClawInstalled: () => {},
      getSettingsTarget: () => ({
        path: filePath
      }),
      validateOpenClawConfig: () => {},
      verifyOpenClawRuntime: () => ({
        resolvedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL),
        status: "healthy"
      })
    });
  });

  assert.equal(await readFile(filePath, "utf8"), fileContents);
});

test("run surfaces a clear error when OpenClaw setup does not create the config", async () => {
  let loadCount = 0;
  let setupCalls = 0;
  let promptCalls = 0;

  await assert.rejects(
    withMutedConsoleLog(async () => {
      await run([], {
        ensureOpenClawInstalled: () => {},
        getSettingsTarget: () => ({
          path: "/tmp/openclaw.json"
        }),
        initializeOpenClawBaseConfig: () => {
          setupCalls += 1;
        },
        loadSettings: async () => {
          loadCount += 1;
          return {
            exists: false
          };
        },
        promptForApiKey: async () => {
          promptCalls += 1;
          return "gp-test-key";
        },
        promptForModel: async () => DEFAULT_MODEL,
        validateApiKey: (apiKey) => apiKey,
        createBackup: async () => "/tmp/openclaw.json.backup",
        writeSettings: async () => {}
      });
    }),
    /did not create \/tmp\/openclaw\.json/
  );

  assert.equal(setupCalls, 1);
  assert.equal(loadCount, 2);
  assert.equal(promptCalls, 0);
});

test("run stops before prompting when the current OpenClaw config fails schema validation", async () => {
  const failure = new Error("OpenClaw rejected the config");
  const { dependencies, state } = createRunHarness({
    validateOpenClawConfig: () => {
      state.configValidationCalls += 1;
      state.order.push("validateOpenClawConfig");
      throw failure;
    }
  });

  await assert.rejects(
    withMutedConsoleLog(async () => {
      await run([], dependencies);
    }),
    (error) => error === failure
  );

  assert.equal(state.ensureCalls, 1);
  assert.equal(state.loadCalls, 1);
  assert.equal(state.configValidationCalls, 1);
  assert.equal(state.promptApiKeyCalls, 0);
  assert.equal(state.promptModelCalls, 0);
  assert.equal(state.prewriteValidationCalls, 0);
  assert.equal(state.backupCalls, 0);
  assert.equal(state.writeCalls, 0);
});

test("run stops before backup or write when API key validation fails", async () => {
  const failure = new Error("Invalid API key");
  const { dependencies, state } = createRunHarness({
    validateApiKey: () => {
      state.validateCalls += 1;
      throw failure;
    }
  });

  await assert.rejects(
    withMutedConsoleLog(async () => {
      await run([], dependencies);
    }),
    (error) => error === failure
  );

  assert.equal(state.promptApiKeyCalls, 1);
  assert.equal(state.validateCalls, 1);
  assert.equal(state.backupCalls, 0);
  assert.equal(state.writeCalls, 0);
});

test("run stops before any OpenClaw work when resolving the target path fails", async () => {
  const failure = new Error("Unsupported OpenClaw env override");
  const { dependencies, state } = createRunHarness({
    getSettingsTarget: () => {
      throw failure;
    }
  });

  await assert.rejects(
    withMutedConsoleLog(async () => {
      await run([], dependencies);
    }),
    (error) => error === failure
  );

  assert.equal(state.ensureCalls, 0);
  assert.equal(state.loadCalls, 0);
  assert.equal(state.promptApiKeyCalls, 0);
  assert.equal(state.writeCalls, 0);
});

test("getSettingsTarget points at the default OpenClaw config path", () => {
  const target = getSettingsTarget("/tmp/test-home");

  assert.equal(target.path, path.join("/tmp/test-home", ".openclaw", "openclaw.json"));
});

test("getSettingsTarget uses OPENCLAW_CONFIG_PATH as the exact config file path", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_CONFIG_PATH: "/tmp/custom-openclaw.json"
  });

  assert.equal(target.path, "/tmp/custom-openclaw.json");
});

test("getSettingsTarget uses OPENCLAW_STATE_DIR when OPENCLAW_CONFIG_PATH is not set", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
  });

  assert.equal(target.path, path.join("/tmp/openclaw-state", "openclaw.json"));
});

test("getSettingsTarget uses OPENCLAW_HOME when higher-precedence overrides are not set", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_HOME: "/tmp/openclaw-home"
  });

  assert.equal(target.path, path.join("/tmp/openclaw-home", ".openclaw", "openclaw.json"));
});

test("getSettingsTarget gives OPENCLAW_CONFIG_PATH precedence over OPENCLAW_STATE_DIR and OPENCLAW_HOME", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_CONFIG_PATH: "/tmp/custom-openclaw.json",
    OPENCLAW_HOME: "/tmp/openclaw-home",
    OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
  });

  assert.equal(target.path, "/tmp/custom-openclaw.json");
});

test("getSettingsTarget gives OPENCLAW_STATE_DIR precedence over OPENCLAW_HOME", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_HOME: "/tmp/openclaw-home",
    OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
  });

  assert.equal(target.path, path.join("/tmp/openclaw-state", "openclaw.json"));
});

test("getSettingsTarget ignores empty override values and falls back to the next OpenClaw path source", () => {
  assert.equal(
    getSettingsTarget("/tmp/test-home", {
      OPENCLAW_CONFIG_PATH: "",
      OPENCLAW_HOME: "/tmp/openclaw-home",
      OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
    }).path,
    path.join("/tmp/openclaw-state", "openclaw.json")
  );

  assert.equal(
    getSettingsTarget("/tmp/test-home", {
      OPENCLAW_CONFIG_PATH: "",
      OPENCLAW_HOME: "/tmp/openclaw-home",
      OPENCLAW_STATE_DIR: ""
    }).path,
    path.join("/tmp/openclaw-home", ".openclaw", "openclaw.json")
  );
});
