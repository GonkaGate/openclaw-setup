import assert from "node:assert/strict";
import test from "node:test";
import { formatCliErrorMessage, parseCliOptions, parseCliRequest, run } from "../src/cli.js";
import { DEFAULT_MODEL, DEFAULT_MODEL_KEY, toPrimaryModelRef } from "../src/constants/models.js";
import { CliUsageError, RuntimeVerificationError } from "../src/install/install-errors.js";
import type { InstallOutcome } from "../src/install/install-use-case.js";
import { withCapturedConsoleLog } from "./test-helpers.js";

const silentOutput = {
  writeOut: () => {},
  writeErr: () => {}
};

function createGatewayUnavailableInstallResult(): InstallOutcome {
  return {
    backupPath: "/tmp/backup.json",
    configPreparation: {
      addedLocalGatewayMode: true,
      settings: {},
      source: "fresh"
    },
    display: {
      sections: [
        {
          heading: "Install complete.",
          lines: [
            "Config: /tmp/openclaw.json",
            "Model: Display-owned model",
            "Base setup: initialized automatically with OpenClaw defaults"
          ]
        },
        {
          heading: "Next step:",
          lines: ["openclaw gateway"]
        }
      ]
    },
    runtime: {
      kind: "healthy",
      resolvedPrimaryModelRef: "openai/not-used-by-cli"
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
  assert.throws(
    () => parseCliOptions(["--api-key", "gp-test"], silentOutput),
    (error) => {
      assert.ok(error instanceof CliUsageError);
      assert.equal(error.argument, "--api-key");
      return true;
    }
  );
  assert.throws(
    () => parseCliOptions(["--api-key=gp-test"]),
    (error) => {
      assert.ok(error instanceof CliUsageError);
      assert.equal(error.argument, "--api-key");
      return true;
    }
  );
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
          display: {
            sections: [
              {
                heading: "Verification complete.",
                lines: ["Display-owned verification output"]
              }
            ]
          },
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
  assert.equal(logs.some((line) => line.includes("Display-owned model")), true);
});

test("run prints verification success details from the verify use case outcome", async () => {
  const { logs } = await withCapturedConsoleLog(async () => {
    await run(["verify"], {
      getSettingsTarget: () => "/tmp/openclaw.json",
      runVerifyUseCase: async ({ targetPath }) => ({
        configMode: 0o600,
        display: {
          sections: [
            {
              heading: "Verification complete.",
              lines: [
                "Permissions: 0o600",
                "Resolved model: display-owned-model"
              ]
            }
          ]
        },
        resolvedPrimaryModelRef: "not-used-by-cli",
        selectedModel: {
          ...DEFAULT_MODEL,
          displayName: "Not used by CLI"
        },
        targetPath
      })
    });
  });

  assert.equal(logs.some((line) => line.includes("Verification complete.")), true);
  assert.equal(logs.some((line) => line.includes("Permissions: 0o600")), true);
  assert.equal(logs.some((line) => line.includes("display-owned-model")), true);
  assert.equal(logs.some((line) => line.includes(toPrimaryModelRef(DEFAULT_MODEL))), false);
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
          display: {
            sections: []
          },
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

test("formatCliErrorMessage adds the post-write note only when the install already wrote settings", () => {
  const installMessage = formatCliErrorMessage(
    new RuntimeVerificationError("runtime_unhealthy", "install", "OpenClaw health check failed.")
      .markConfigWritten("/tmp/openclaw.json")
  );
  const verifyMessage = formatCliErrorMessage(
    new RuntimeVerificationError("runtime_unhealthy", "verify", "OpenClaw health check failed.")
  );

  assert.match(installMessage, /settings were written successfully/);
  assert.doesNotMatch(verifyMessage, /settings were written successfully/);
  assert.equal(verifyMessage, "OpenClaw health check failed.");
});
