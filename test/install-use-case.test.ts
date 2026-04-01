import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MODEL, DEFAULT_MODEL_KEY, toPrimaryModelRef } from "../src/constants/models.js";
import type { OpenClawConfig } from "../src/types/settings.js";
import {
  runInstallUseCase,
  type InstallUseCaseDependencies
} from "../src/install/install-use-case.js";

interface RuntimeVerifyInput {
  expectedPrimaryModelRef: string;
  filePath: string;
}

interface InstallHarnessState {
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
  runtimeVerifyInputs: RuntimeVerifyInput[];
  setupCalls: number;
  validateCalls: number;
  writeCalls: number;
  writePaths: string[];
  order: string[];
  writtenSettings?: Record<string, unknown>;
}

function createGatewayBootstrapResult(settings: OpenClawConfig, addedLocalGatewayMode: boolean) {
  return {
    addedLocalGatewayMode,
    settings
  };
}

function withLocalGatewayMode(settings: OpenClawConfig): OpenClawConfig {
  return {
    ...settings,
    gateway: {
      ...((settings.gateway as Record<string, unknown>) ?? {}),
      mode: "local"
    }
  };
}

function recordStep(state: InstallHarnessState, step: string): void {
  state.order.push(step);
}

function createHealthyRuntimeResult() {
  return {
    kind: "healthy" as const,
    resolvedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL)
  };
}

function createGatewayUnavailableInstallResult() {
  return {
    kind: "gateway_unavailable" as const,
    nextCommand: "openclaw gateway"
  };
}

function createInstallHarness(
  overrides: {
    dependencies?: Partial<Omit<InstallUseCaseDependencies, "openClaw">>;
    openClaw?: Partial<InstallUseCaseDependencies["openClaw"]>;
  } = {}
): {
  dependencies: InstallUseCaseDependencies;
  state: InstallHarnessState;
} {
  const state: InstallHarnessState = {
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
    writeCalls: 0,
    writePaths: [],
    order: []
  };

  const openClaw: InstallUseCaseDependencies["openClaw"] = {
    ensureInstalled: () => {
      state.ensureCalls += 1;
      recordStep(state, "ensure");
    },
    initializeBaseConfig: () => {
      state.setupCalls += 1;
      recordStep(state, "setup");
    },
    validateConfig: (filePath) => {
      state.configValidationCalls += 1;
      state.configValidationPaths.push(filePath);
      recordStep(state, "validateOpenClawConfig");
    },
    validateCandidateConfig: async (filePath) => {
      state.prewriteValidationCalls += 1;
      state.prewriteValidationPaths.push(filePath);
      recordStep(state, "validateSettingsBeforeWrite");
    },
    verifyRuntimeForInstall: (filePath, expectedPrimaryModelRef) => {
      state.runtimeVerifyCalls += 1;
      state.runtimeVerifyInputs.push({
        expectedPrimaryModelRef,
        filePath
      });
      recordStep(state, "verifyRuntime");
      return createHealthyRuntimeResult();
    },
    ...overrides.openClaw
  };

  const dependencies: InstallUseCaseDependencies = {
    createBackup: async (filePath) => {
      state.backupCalls += 1;
      state.backupPaths.push(filePath);
      recordStep(state, "backup");
      return "/tmp/openclaw.json.backup";
    },
    ensureFreshInstallLocalGateway: (settings) => {
      state.gatewayBootstrapCalls += 1;
      recordStep(state, "bootstrapGateway");
      return createGatewayBootstrapResult(withLocalGatewayMode(settings), true);
    },
    loadSettings: async (filePath) => {
      state.loadCalls += 1;
      state.loadPaths.push(filePath);
      recordStep(state, "load");
      return {
        kind: "loaded",
        settings: {}
      };
    },
    openClaw,
    promptForApiKey: async () => {
      state.promptApiKeyCalls += 1;
      recordStep(state, "promptApiKey");
      return "gp-test-key";
    },
    promptForModel: async () => {
      state.promptModelCalls += 1;
      recordStep(state, "promptModel");
      return DEFAULT_MODEL;
    },
    validateApiKey: (apiKey) => {
      state.validateCalls += 1;
      recordStep(state, "validateApiKey");
      return apiKey;
    },
    writeSettings: async (filePath, settings) => {
      state.writeCalls += 1;
      state.writePaths.push(filePath);
      recordStep(state, "write");
      state.writtenSettings = settings as Record<string, unknown>;
    },
    ...overrides.dependencies,
    openClaw
  };

  return {
    dependencies,
    state
  };
}

test("runInstallUseCase initializes missing OpenClaw config automatically and skips backup on fresh installs", async () => {
  let loadCount = 0;
  let setupCalls = 0;
  let backupCalls = 0;
  let writtenSettings: Record<string, unknown> | undefined;

  const result = await runInstallUseCase(
    {
      targetPath: "/tmp/openclaw.json"
    },
    {
      createBackup: async () => {
        backupCalls += 1;
        return "/tmp/should-not-exist.backup";
      },
      ensureFreshInstallLocalGateway: (settings) => createGatewayBootstrapResult(withLocalGatewayMode(settings), true),
      loadSettings: async () => {
        loadCount += 1;

        if (loadCount === 1) {
          return {
            kind: "missing"
          };
        }

        return {
          kind: "loaded",
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
      openClaw: {
        ensureInstalled: () => {},
        initializeBaseConfig: () => {
          setupCalls += 1;
        },
        validateCandidateConfig: async () => {},
        validateConfig: () => {},
        verifyRuntimeForInstall: () => createGatewayUnavailableInstallResult()
      },
      promptForApiKey: async () => "gp-test-key",
      promptForModel: async () => DEFAULT_MODEL,
      validateApiKey: (apiKey) => apiKey,
      writeSettings: async (_filePath, settings) => {
        writtenSettings = settings as Record<string, unknown>;
      }
    }
  );

  assert.equal(setupCalls, 1);
  assert.equal(loadCount, 2);
  assert.equal(backupCalls, 0);
  assert.equal(result.configPreparation.source, "fresh");
  assert.equal(result.configPreparation.addedLocalGatewayMode, true);
  assert.equal(result.display.sections[0]?.heading, "Install complete.");
  assert.equal(result.display.sections[1]?.heading, "Next step:");
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

test("runInstallUseCase preserves an existing gateway.mode from fresh OpenClaw setup output", async () => {
  let writtenSettings: Record<string, unknown> | undefined;

  const result = await runInstallUseCase(
    {
      targetPath: "/tmp/openclaw.json"
    },
    {
      createBackup: async () => "/tmp/openclaw.json.backup",
      ensureFreshInstallLocalGateway: (settings) => createGatewayBootstrapResult(settings, false),
      loadSettings: (() => {
        let loadCount = 0;

        return async () => {
          loadCount += 1;

          if (loadCount === 1) {
            return {
              kind: "missing"
            };
          }

          return {
            kind: "loaded",
            settings: {
              gateway: {
                bind: "loopback",
                mode: "trusted-proxy"
              }
            }
          };
        };
      })(),
      openClaw: {
        ensureInstalled: () => {},
        initializeBaseConfig: () => {},
        validateCandidateConfig: async () => {},
        validateConfig: () => {},
        verifyRuntimeForInstall: () => createGatewayUnavailableInstallResult()
      },
      promptForApiKey: async () => "gp-test-key",
      promptForModel: async () => DEFAULT_MODEL,
      validateApiKey: (apiKey) => apiKey,
      writeSettings: async (_filePath, settings) => {
        writtenSettings = settings as Record<string, unknown>;
      }
    }
  );

  assert.equal(result.configPreparation.source, "fresh");
  assert.equal(result.configPreparation.addedLocalGatewayMode, false);
  assert.deepEqual(writtenSettings?.gateway, {
    bind: "loopback",
    mode: "trusted-proxy"
  });
});

test("runInstallUseCase does not rewrite gateway.mode for existing configs", async () => {
  const { dependencies, state } = createInstallHarness({
    dependencies: {
      loadSettings: async () => {
        state.loadCalls += 1;
        recordStep(state, "load");
        return {
          kind: "loaded",
          settings: {
            gateway: {
              auth: {
                mode: "token"
              }
            }
          }
        };
      },
    },
    openClaw: {
      verifyRuntimeForInstall: () => createGatewayUnavailableInstallResult()
    }
  });

  await runInstallUseCase({
    targetPath: "/tmp/openclaw.json"
  }, dependencies);

  assert.equal(state.gatewayBootstrapCalls, 0);
  assert.deepEqual(state.writtenSettings?.gateway, {
    auth: {
      mode: "token"
    }
  });
});

test("runInstallUseCase creates a backup once before writing when updating an existing config", async () => {
  const { dependencies, state } = createInstallHarness();

  await runInstallUseCase({
    targetPath: "/tmp/openclaw.json"
  }, dependencies);

  assert.equal(state.backupCalls, 1);
  assert.equal(state.configValidationCalls, 1);
  assert.equal(state.prewriteValidationCalls, 1);
  assert.equal(state.writeCalls, 1);
  assert.equal(state.order.indexOf("backup") < state.order.indexOf("write"), true);
});

test("runInstallUseCase succeeds after writing a config when the Gateway is not running yet", async () => {
  const { dependencies, state } = createInstallHarness({
    openClaw: {
      verifyRuntimeForInstall: () => createGatewayUnavailableInstallResult()
    }
  });

  const result = await runInstallUseCase({
    targetPath: "/tmp/openclaw.json"
  }, dependencies);

  assert.deepEqual(result.runtime, {
    kind: "gateway_unavailable",
    nextCommand: "openclaw gateway"
  });
  assert.equal(result.display.sections[1]?.heading, "Next step:");
  assert.equal(state.writeCalls, 1);
});

test("runInstallUseCase fails after writing when the Gateway is reachable but unhealthy", async () => {
  const { dependencies, state } = createInstallHarness({
    openClaw: {
      verifyRuntimeForInstall: () => {
        throw new Error("health failed");
      }
    }
  });

  await assert.rejects(
    runInstallUseCase({
      targetPath: "/tmp/openclaw.json"
    }, dependencies),
    /health failed/
  );

  assert.equal(state.writeCalls, 1);
});

test("runInstallUseCase uses the curated --model value without prompting for a model", async () => {
  const { dependencies, state } = createInstallHarness({
    dependencies: {
      promptForModel: async () => {
        throw new Error("promptForModel should not be called when --model is provided");
      }
    }
  });

  await runInstallUseCase({
    modelKey: DEFAULT_MODEL_KEY,
    targetPath: "/tmp/openclaw.json"
  }, dependencies);

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

test("runInstallUseCase stops before loading settings or prompting when OpenClaw is unavailable", async () => {
  const failure = new Error("OpenClaw CLI was not found");
  const { dependencies, state } = createInstallHarness({
    openClaw: {
      ensureInstalled: () => {
        state.ensureCalls += 1;
        throw failure;
      }
    }
  });

  await assert.rejects(
    runInstallUseCase({
      targetPath: "/tmp/openclaw.json"
    }, dependencies),
    (error) => error === failure
  );

  assert.equal(state.ensureCalls, 1);
  assert.equal(state.loadCalls, 0);
  assert.equal(state.promptApiKeyCalls, 0);
  assert.equal(state.promptModelCalls, 0);
  assert.equal(state.backupCalls, 0);
  assert.equal(state.writeCalls, 0);
});

test("runInstallUseCase surfaces a clear error when OpenClaw setup does not create the config", async () => {
  let loadCount = 0;
  let setupCalls = 0;
  let promptCalls = 0;

  await assert.rejects(
    runInstallUseCase(
      {
        targetPath: "/tmp/openclaw.json"
      },
      {
        createBackup: async () => "/tmp/openclaw.json.backup",
        ensureFreshInstallLocalGateway: (settings) => createGatewayBootstrapResult(settings, true),
        loadSettings: async () => {
          loadCount += 1;
          return {
            kind: "missing"
          };
        },
      openClaw: {
        ensureInstalled: () => {},
        initializeBaseConfig: () => {
          setupCalls += 1;
        },
        validateCandidateConfig: async () => {},
        validateConfig: () => {},
        verifyRuntimeForInstall: () => createHealthyRuntimeResult()
      },
      promptForApiKey: async () => {
        promptCalls += 1;
        return "gp-test-key";
      },
      promptForModel: async () => DEFAULT_MODEL,
      validateApiKey: (apiKey) => apiKey,
      writeSettings: async () => {}
    }
  ),
    /did not create \/tmp\/openclaw\.json/
  );

  assert.equal(setupCalls, 1);
  assert.equal(loadCount, 2);
  assert.equal(promptCalls, 0);
});

test("runInstallUseCase stops before prompting when the current OpenClaw config fails schema validation", async () => {
  const failure = new Error("OpenClaw rejected the config");
  const { dependencies, state } = createInstallHarness({
    openClaw: {
      validateConfig: (filePath) => {
        state.configValidationCalls += 1;
        state.configValidationPaths.push(filePath);
        recordStep(state, "validateOpenClawConfig");
        throw failure;
      }
    }
  });

  await assert.rejects(
    runInstallUseCase({
      targetPath: "/tmp/openclaw.json"
    }, dependencies),
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

test("runInstallUseCase stops before backup or write when API key validation fails", async () => {
  const failure = new Error("Invalid API key");
  const { dependencies, state } = createInstallHarness({
    dependencies: {
      validateApiKey: () => {
        state.validateCalls += 1;
        throw failure;
      }
    }
  });

  await assert.rejects(
    runInstallUseCase({
      targetPath: "/tmp/openclaw.json"
    }, dependencies),
    (error) => error === failure
  );

  assert.equal(state.promptApiKeyCalls, 1);
  assert.equal(state.validateCalls, 1);
  assert.equal(state.backupCalls, 0);
  assert.equal(state.writeCalls, 0);
});
