import assert from "node:assert/strict";
import { chmod, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULT_MODEL, toPrimaryModelRef } from "../src/constants/models.js";
import {
  runVerifyUseCase,
  type VerifyUseCaseDependencies
} from "../src/install/verify-use-case.js";
import { createManagedConfigFixture, createTempFilePath } from "./test-helpers.js";

interface RuntimeVerifyInput {
  expectedPrimaryModelRef: string;
  filePath: string;
}

interface VerifyHarnessState {
  configValidationCalls: number;
  configValidationPaths: string[];
  ensureCalls: number;
  loadCalls: number;
  loadPaths: string[];
  runtimeVerifyCalls: number;
  runtimeVerifyInputs: RuntimeVerifyInput[];
  verifyCalls: number;
  verifyPaths: string[];
  order: string[];
}

function recordStep(state: VerifyHarnessState, step: string): void {
  state.order.push(step);
}

function createVerifyHarness(
  overrides: {
    dependencies?: Partial<Omit<VerifyUseCaseDependencies, "openClaw">>;
    openClaw?: Partial<VerifyUseCaseDependencies["openClaw"]>;
  } = {}
): {
  dependencies: VerifyUseCaseDependencies;
  state: VerifyHarnessState;
} {
  const state: VerifyHarnessState = {
    configValidationCalls: 0,
    configValidationPaths: [],
    ensureCalls: 0,
    loadCalls: 0,
    loadPaths: [],
    runtimeVerifyCalls: 0,
    runtimeVerifyInputs: [],
    verifyCalls: 0,
    verifyPaths: [],
    order: []
  };

  const openClaw: VerifyUseCaseDependencies["openClaw"] = {
    ensureInstalled: () => {
      state.ensureCalls += 1;
      recordStep(state, "ensure");
    },
    validateConfig: (filePath) => {
      state.configValidationCalls += 1;
      state.configValidationPaths.push(filePath);
      recordStep(state, "validateOpenClawConfig");
    },
    ...overrides.openClaw
  };

  const dependencies: VerifyUseCaseDependencies = {
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
    verifyOpenClawRuntimeForVerify: (filePath, expectedPrimaryModelRef) => {
      state.runtimeVerifyCalls += 1;
      state.runtimeVerifyInputs.push({
        expectedPrimaryModelRef,
        filePath
      });
      recordStep(state, "verifyRuntime");
      return {
        kind: "healthy",
        resolvedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL)
      };
    },
    verifySettings: async (filePath) => {
      state.verifyCalls += 1;
      state.verifyPaths.push(filePath);
      recordStep(state, "verify");
      return {
        configMode: 0o600,
        selectedModel: DEFAULT_MODEL
      };
    },
    ...overrides.dependencies,
    openClaw
  };

  return {
    dependencies,
    state
  };
}

test("runVerifyUseCase checks the existing config through the verify ownership seam", async () => {
  const { dependencies, state } = createVerifyHarness();

  await runVerifyUseCase({
    targetPath: "/tmp/openclaw.json"
  }, dependencies);

  assert.equal(state.ensureCalls, 1);
  assert.equal(state.loadCalls, 1);
  assert.equal(state.configValidationCalls, 1);
  assert.equal(state.verifyCalls, 1);
  assert.equal(state.runtimeVerifyCalls, 1);
});

test("runVerifyUseCase uses the resolved target path for validation and runtime verification", async () => {
  const { dependencies, state } = createVerifyHarness();

  await runVerifyUseCase({
    targetPath: "/tmp/custom-openclaw.json"
  }, dependencies);

  assert.deepEqual(state.loadPaths, ["/tmp/custom-openclaw.json"]);
  assert.deepEqual(state.configValidationPaths, ["/tmp/custom-openclaw.json"]);
  assert.deepEqual(state.verifyPaths, ["/tmp/custom-openclaw.json"]);
  assert.deepEqual(state.runtimeVerifyInputs, [
    {
      expectedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL),
      filePath: "/tmp/custom-openclaw.json"
    }
  ]);
});

test("runVerifyUseCase stays strict when the Gateway is unavailable", async () => {
  const { dependencies, state } = createVerifyHarness({
    dependencies: {
      verifyOpenClawRuntimeForVerify: () => {
        state.runtimeVerifyCalls += 1;
        recordStep(state, "verifyRuntime");
        throw new Error("gateway offline");
      }
    }
  });

  await assert.rejects(
    runVerifyUseCase({
      targetPath: "/tmp/openclaw.json"
    }, dependencies),
    /gateway offline/
  );

  assert.equal(state.verifyCalls, 1);
  assert.equal(state.runtimeVerifyCalls, 1);
});

test("runVerifyUseCase fails clearly when the OpenClaw config does not exist yet", async () => {
  const { dependencies, state } = createVerifyHarness({
    dependencies: {
      loadSettings: async () => {
        state.loadCalls += 1;
        recordStep(state, "load");
        return {
          kind: "missing"
        };
      }
    }
  });

  await assert.rejects(
    runVerifyUseCase({
      targetPath: "/tmp/openclaw.json"
    }, dependencies),
    /Run "npx @gonkagate\/openclaw" first/
  );

  assert.equal(state.ensureCalls, 1);
  assert.equal(state.loadCalls, 1);
  assert.equal(state.configValidationCalls, 0);
  assert.equal(state.verifyCalls, 0);
  assert.equal(state.runtimeVerifyCalls, 0);
});

test("runVerifyUseCase succeeds against a real temp config without mutating it", async () => {
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

  const result = await runVerifyUseCase(
    {
      targetPath: filePath
    },
    {
      loadSettings: async () => ({
        kind: "loaded",
        settings: createManagedConfigFixture({
          includeAllowlist: true
        })
      }),
      openClaw: {
        ensureInstalled: () => {},
        validateConfig: () => {}
      },
      verifyOpenClawRuntimeForVerify: () => ({
        kind: "healthy",
        resolvedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL)
      }),
      verifySettings: async () => ({
        configMode: 0o600,
        selectedModel: DEFAULT_MODEL
      })
    }
  );

  assert.equal(result.targetPath, filePath);
  assert.equal(await readFile(filePath, "utf8"), fileContents);
});
