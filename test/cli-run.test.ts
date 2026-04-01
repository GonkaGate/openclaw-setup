import assert from "node:assert/strict";
import test from "node:test";
import { parseCliOptions, parseCliRequest, run } from "../src/cli.js";
import { DEFAULT_MODEL, DEFAULT_MODEL_KEY, toPrimaryModelRef } from "../src/constants/models.js";
import type { InstallOutcome } from "../src/install/install-use-case.js";
import { withCapturedConsoleLog } from "./test-helpers.js";

const silentOutput = {
  writeOut: () => {},
  writeErr: () => {}
};

function createGatewayUnavailableInstallResult(): InstallOutcome {
  return {
    configPreparation: {
      kind: "existing",
      settings: {}
    },
    runtime: {
      kind: "gateway_unavailable",
      nextCommand: "openclaw gateway"
    },
    selectedModel: DEFAULT_MODEL,
    targetPath: "/tmp/openclaw.json"
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
  assert.throws(() => parseCliOptions(["--api-key", "gp-test"], silentOutput), /unsupported/);
  assert.throws(() => parseCliOptions(["--api-key=gp-test"]), /unsupported/);
});

test("run delegates install requests to the install use case with the resolved target path", async () => {
  let capturedRequest: { modelKey?: string; targetPath: string } | undefined;
  let verifyCalls = 0;

  await withCapturedConsoleLog(async () => {
    await run([], {
      getSettingsTarget: () => "/tmp/openclaw.json",
      runInstallUseCase: async (request) => {
        capturedRequest = request;
        return createGatewayUnavailableInstallResult();
      },
      runVerifyUseCase: async () => {
        verifyCalls += 1;
        throw new Error("verify use case should not be called during install");
      }
    });
  });

  assert.deepEqual(capturedRequest, {
    targetPath: "/tmp/openclaw.json"
  });
  assert.equal(verifyCalls, 0);
});

test("run delegates verify requests to the verify use case with the resolved target path", async () => {
  let installCalls = 0;
  let capturedTargetPath: string | undefined;

  await withCapturedConsoleLog(async () => {
    await run(["verify"], {
      getSettingsTarget: () => "/tmp/openclaw.json",
      runInstallUseCase: async () => {
        installCalls += 1;
        throw new Error("install use case should not be called during verify");
      },
      runVerifyUseCase: async ({ targetPath }) => {
        capturedTargetPath = targetPath;
        return {
          configMode: 0o600,
          resolvedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL),
          selectedModel: DEFAULT_MODEL,
          targetPath
        };
      }
    });
  });

  assert.equal(installCalls, 0);
  assert.equal(capturedTargetPath, "/tmp/openclaw.json");
});

test("run prints the exact next command when install succeeds with a gateway-unavailable runtime result", async () => {
  const { logs } = await withCapturedConsoleLog(async () => {
    await run([], {
      getSettingsTarget: () => "/tmp/openclaw.json",
      runInstallUseCase: async () => createGatewayUnavailableInstallResult()
    });
  });

  assert.equal(logs.some((line) => line.includes("Next step:")), true);
  assert.equal(logs.some((line) => line.includes("openclaw gateway")), true);
  assert.equal(logs.some((line) => line.includes("Gateway RPC: reachable")), false);
});

test("run prints verification success details from the verify use case outcome", async () => {
  const { logs } = await withCapturedConsoleLog(async () => {
    await run(["verify"], {
      getSettingsTarget: () => "/tmp/openclaw.json",
      runVerifyUseCase: async ({ targetPath }) => ({
        configMode: 0o600,
        resolvedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL),
        selectedModel: DEFAULT_MODEL,
        targetPath
      })
    });
  });

  assert.equal(logs.some((line) => line.includes("Verification complete.")), true);
  assert.equal(logs.some((line) => line.includes("Permissions: 0o600")), true);
  assert.equal(logs.some((line) => line.includes(toPrimaryModelRef(DEFAULT_MODEL))), true);
});

test("run stops before any use case when resolving the target path fails", async () => {
  let installCalls = 0;
  let verifyCalls = 0;
  const failure = new Error("Unsupported OpenClaw env override");

  await assert.rejects(
    run([], {
      getSettingsTarget: () => {
        throw failure;
      },
      runInstallUseCase: async () => {
        installCalls += 1;
        return createGatewayUnavailableInstallResult();
      },
      runVerifyUseCase: async () => {
        verifyCalls += 1;
        return {
          configMode: 0o600,
          resolvedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL),
          selectedModel: DEFAULT_MODEL,
          targetPath: "/tmp/openclaw.json"
        };
      }
    }),
    (error) => error === failure
  );

  assert.equal(installCalls, 0);
  assert.equal(verifyCalls, 0);
});
