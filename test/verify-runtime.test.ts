import assert from "node:assert/strict";
import test from "node:test";
import { toPrimaryModelRef, DEFAULT_MODEL } from "../src/constants/models.js";
import {
  INSTALL_ERROR_CODE,
  RuntimeVerificationError,
  RUNTIME_VERIFICATION_STEP
} from "../src/install/install-errors.js";
import { createOpenClawClient } from "../src/install/openclaw-client.js";
import {
  verifyOpenClawRuntime,
  verifyOpenClawRuntimeForInstall,
  verifyOpenClawRuntimeForVerify,
  type RuntimeVerificationFailureKind
} from "../src/install/verify-runtime.js";

interface StubCommandResult {
  error?: NodeJS.ErrnoException;
  status: number | null;
  stderr?: string;
  stdout?: string;
}

function createRunner(results: readonly StubCommandResult[]) {
  let index = 0;

  return (_command: string, _args: string[]) => {
    const result = results[index];
    index += 1;

    if (!result) {
      throw new Error("Unexpected extra runtime verification command");
    }

    return {
      error: result.error,
      status: result.status,
      stderr: result.stderr ?? "",
      stdout: result.stdout ?? ""
    };
  };
}

function createProbeClient(results: readonly StubCommandResult[]) {
  return createOpenClawClient({
    runCommand: createRunner(results)
  });
}

test("createOpenClawClient uses the canonical OpenClaw probe commands with piped stdio", () => {
  const expectedPrimaryModelRef = toPrimaryModelRef(DEFAULT_MODEL);
  const calls: Array<{
    args: string[];
    command: string;
    options?: {
      stdio?: string;
    };
  }> = [];
  const client = createOpenClawClient({
    runCommand: (command, args, options) => {
      calls.push({
        args: [...args],
        command,
        options: options ? { stdio: options.stdio as string | undefined } : undefined
      });

      const invocationIndex = calls.length - 1;

      return invocationIndex === 0
        ? {
            status: 0,
            stderr: "",
            stdout: '{"rpc":{"ok":true}}'
          }
        : invocationIndex === 1
          ? {
              status: 0,
              stderr: "",
              stdout: '{"ok":true}'
            }
          : {
              status: 0,
              stderr: "",
              stdout: `${expectedPrimaryModelRef}\n`
            };
    }
  });

  client.probeGatewayRpc();
  client.probeHealthSnapshot();
  client.probeResolvedPrimaryModel();

  assert.deepEqual(calls, [
    {
      args: ["gateway", "status", "--require-rpc", "--json"],
      command: "openclaw",
      options: {
        stdio: "pipe"
      }
    },
    {
      args: ["health", "--json"],
      command: "openclaw",
      options: {
        stdio: "pipe"
      }
    },
    {
      args: ["models", "status", "--plain"],
      command: "openclaw",
      options: {
        stdio: "pipe"
      }
    }
  ]);
});

test("verifyOpenClawRuntime accepts a healthy Gateway, health snapshot, and resolved model", () => {
  const expectedPrimaryModelRef = toPrimaryModelRef(DEFAULT_MODEL);

  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    expectedPrimaryModelRef,
    createProbeClient([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":true}' },
      { status: 0, stdout: `${expectedPrimaryModelRef}\n` }
    ])
  );

  if (result.kind !== "healthy") {
    assert.fail(`Expected verifyOpenClawRuntime to succeed, got ${result.kind}`);
  }
  assert.equal(result.resolvedPrimaryModelRef, expectedPrimaryModelRef);
});

test("createOpenClawClient keeps parsed-output metadata on non-zero probe exits", () => {
  const gatewayFailure = createProbeClient([
    { status: 1, stderr: "rpc failed" }
  ]).probeGatewayRpc();

  assert.deepEqual(gatewayFailure, {
    commandStatus: "failed",
    output: "rpc failed",
    reason: "empty_output",
    reportKind: "unparsed",
    status: 1
  });
  assert.equal("rpcOk" in gatewayFailure, false);

  const resolvedModelFailure = createProbeClient([
    { status: 1, stderr: "model status failed" }
  ]).probeResolvedPrimaryModel();

  assert.deepEqual(resolvedModelFailure, {
    commandStatus: "failed",
    output: "model status failed",
    reason: "empty_output",
    reportKind: "unparsed",
    status: 1
  });
  assert.equal("resolvedPrimaryModelRef" in resolvedModelFailure, false);
});

test("createOpenClawClient parses a single resolved model line and tolerates non-model log noise", () => {
  const expectedPrimaryModelRef = toPrimaryModelRef(DEFAULT_MODEL);
  const parsedResult = createProbeClient([
    { status: 0, stdout: `${expectedPrimaryModelRef}\n` }
  ]).probeResolvedPrimaryModel();

  assert.deepEqual(parsedResult, {
    commandStatus: "succeeded",
    output: expectedPrimaryModelRef,
    reportKind: "parsed",
    resolvedPrimaryModelRef: expectedPrimaryModelRef,
    status: 0
  });

  const noisyResult = createProbeClient([
    {
      status: 0,
      stdout: `[agents/auth-profiles] synced openai-codex credentials from external cli\n${expectedPrimaryModelRef}\n`
    }
  ]).probeResolvedPrimaryModel();

  assert.deepEqual(noisyResult, {
    commandStatus: "succeeded",
    output: `[agents/auth-profiles] synced openai-codex credentials from external cli\n${expectedPrimaryModelRef}`,
    reportKind: "parsed",
    resolvedPrimaryModelRef: expectedPrimaryModelRef,
    status: 0
  });
});

test("createOpenClawClient rejects resolved-model output that contains multiple model refs", () => {
  const expectedPrimaryModelRef = toPrimaryModelRef(DEFAULT_MODEL);
  const unparsedResult = createProbeClient([
    { status: 0, stdout: `${expectedPrimaryModelRef}\nopenai/other-model\n` }
  ]).probeResolvedPrimaryModel();

  assert.deepEqual(unparsedResult, {
    commandStatus: "succeeded",
    output: `${expectedPrimaryModelRef}\nopenai/other-model`,
    reason: "invalid_shape",
    reportKind: "unparsed",
    status: 0
  });
});

test("verifyOpenClawRuntime distinguishes Gateway probe command failures from gateway-unavailable reports", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createProbeClient([
      { status: 1, stderr: "rpc failed" }
    ])
  );

  if (result.kind === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to report a Gateway failure");
  }

  assert.equal(result.kind, "probe_command_failed");
  assert.equal(result.step, RUNTIME_VERIFICATION_STEP.gatewayRpc);
  assert.match(result.message, /Gateway RPC/);
  assert.match(result.message, /exited with exit code 1/);
});

test("verifyOpenClawRuntime rejects malformed gateway status output even when the command succeeds", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createProbeClient([
      { status: 0, stdout: "not json" }
    ])
  );

  if (result.kind === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to reject malformed Gateway JSON");
  }

  assert.equal(result.kind, "unexpected_output");
  assert.match(result.message, /Unable to interpret/);
});

test("verifyOpenClawRuntime rejects malformed health output even when the command succeeds", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createProbeClient([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: "[]" }
    ])
  );

  if (result.kind === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to reject malformed health JSON");
  }

  assert.equal(result.kind, "unexpected_output");
  assert.match(result.message, /openclaw health --json/);
});

test("verifyOpenClawRuntime rejects gateway status reports whose rpc.ok flag is false", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createProbeClient([
      { status: 0, stdout: '{"rpc":{"ok":false}}' }
    ])
  );

  if (result.kind === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to reject an unhealthy Gateway RPC report");
  }

  assert.equal(result.kind, "gateway_unavailable");
  assert.match(result.message, /did not report a healthy Gateway RPC/);
});

test("verifyOpenClawRuntime treats structured non-zero gateway reports with rpc.ok=false as gateway unavailable", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createProbeClient([
      { status: 1, stdout: '{"rpc":{"ok":false}}' }
    ])
  );

  if (result.kind === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to preserve the structured gateway-unavailable result");
  }

  assert.equal(result.kind, "gateway_unavailable");
  assert.equal(result.step, RUNTIME_VERIFICATION_STEP.gatewayRpc);
});

test("verifyOpenClawRuntime rejects unhealthy health snapshots", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createProbeClient([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":false}' }
    ])
  );

  if (result.kind === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to report an unhealthy runtime");
  }

  assert.equal(result.kind, "runtime_unhealthy");
  assert.match(result.message, /unhealthy runtime/);
});

test("verifyOpenClawRuntime rejects empty resolved-model output", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createProbeClient([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":true}' },
      { status: 0, stdout: "   \n" }
    ])
  );

  if (result.kind === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to report an empty model response");
  }

  assert.equal(result.kind, "unexpected_output");
  assert.match(result.message, /exactly one provider\/model ref line/);
});

test("verifyOpenClawRuntime rejects ambiguous resolved-model output as unexpected", () => {
  const expectedPrimaryModelRef = toPrimaryModelRef(DEFAULT_MODEL);
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    expectedPrimaryModelRef,
    createProbeClient([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":true}' },
      { status: 0, stdout: `${expectedPrimaryModelRef}\nopenai/other-model\n` }
    ])
  );

  if (result.kind === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to reject ambiguous model output");
  }

  assert.equal(result.kind, "unexpected_output");
  assert.match(result.message, /Unable to interpret/);
});

test("verifyOpenClawRuntime rejects mismatched resolved models", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createProbeClient([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":true}' },
      { status: 0, stdout: "openai/not-the-expected-model\n" }
    ])
  );

  if (result.kind === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to report a mismatched model");
  }

  assert.equal(result.kind, "model_resolution_failed");
  assert.match(result.message, /expects/);
});

test("verifyOpenClawRuntimeForInstall tolerates gateway-unavailable results and maps the next command", () => {
  const result = verifyOpenClawRuntimeForInstall(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createProbeClient([
      { status: 1, stdout: '{"rpc":{"ok":false}}' }
    ])
  );

  assert.deepEqual(result, {
    kind: "gateway_unavailable",
    nextCommand: "openclaw gateway"
  });
});

test("verifyOpenClawRuntimeForInstall keeps malformed gateway status output strict", () => {
  assert.throws(
    () =>
      verifyOpenClawRuntimeForInstall(
        "/tmp/openclaw.json",
        toPrimaryModelRef(DEFAULT_MODEL),
        createProbeClient([
          { status: 0, stdout: "not json" }
        ])
      ),
    (error) => {
      assert.ok(error instanceof RuntimeVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.runtimeVerificationFailed);
      assert.equal(error.kind, "unexpected_output");
      assert.equal(error.phase, "install");
      assert.equal(error.step, RUNTIME_VERIFICATION_STEP.gatewayRpc);
      assert.match(error.message, /Unable to interpret/);
      assert.doesNotMatch(error.message, /settings were written successfully/);
      return true;
    }
  );
});

test("verifyOpenClawRuntimeForInstall rethrows strict runtime failures for install", () => {
  assert.throws(
    () =>
      verifyOpenClawRuntimeForInstall(
        "/tmp/openclaw.json",
        toPrimaryModelRef(DEFAULT_MODEL),
        createProbeClient([
          { status: 0, stdout: '{"rpc":{"ok":true}}' },
          { status: 0, stdout: '{"ok":false}' }
        ])
      ),
    (error) => {
      assert.ok(error instanceof RuntimeVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.runtimeVerificationFailed);
      assert.equal(error.kind, "runtime_unhealthy");
      assert.equal(error.phase, "install");
      assert.equal(error.step, RUNTIME_VERIFICATION_STEP.healthSnapshot);
      assert.match(error.message, /unhealthy runtime/);
      assert.doesNotMatch(error.message, /settings were written successfully/);
      return true;
    }
  );
});

test("verifyOpenClawRuntimeForVerify keeps probe command failures strict", () => {
  assert.throws(
    () =>
      verifyOpenClawRuntimeForVerify(
        "/tmp/openclaw.json",
        toPrimaryModelRef(DEFAULT_MODEL),
        createProbeClient([
          { status: 1, stderr: "rpc failed" }
        ])
      ),
    (error) => {
      assert.ok(error instanceof RuntimeVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.runtimeVerificationFailed);
      assert.equal(error.kind, "probe_command_failed");
      assert.equal(error.phase, "verify");
      assert.equal(error.step, RUNTIME_VERIFICATION_STEP.gatewayRpc);
      assert.match(error.message, /Gateway RPC/);
      assert.match(error.message, /exited with exit code 1/);
      assert.doesNotMatch(error.message, /settings were written successfully/);
      return true;
    }
  );
});

test("verifyOpenClawRuntimeForVerify preserves successful runtime results unchanged", () => {
  const expectedPrimaryModelRef = toPrimaryModelRef(DEFAULT_MODEL);
  const result = verifyOpenClawRuntimeForVerify(
    "/tmp/openclaw.json",
    expectedPrimaryModelRef,
    createProbeClient([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":true}' },
      { status: 0, stdout: `${expectedPrimaryModelRef}\n` }
    ])
  );

  assert.deepEqual(result, {
    kind: "healthy",
    resolvedPrimaryModelRef: expectedPrimaryModelRef
  });
});

test("verifyOpenClawRuntimeForInstall rethrows every strict failure kind except gateway-unavailable", () => {
  const strictFailureKinds: RuntimeVerificationFailureKind[] = [
    "probe_command_failed",
    "unexpected_output",
    "runtime_unhealthy",
    "model_resolution_failed"
  ];

  for (const kind of strictFailureKinds) {
    const runner = kind === "probe_command_failed"
      ? createProbeClient([
          { status: 1, stderr: "rpc failed" }
        ])
      : kind === "unexpected_output"
      ? createProbeClient([
          { status: 0, stdout: '{"rpc":{"ok":true}}' },
          { status: 0, stdout: "[]" }
        ])
      : kind === "runtime_unhealthy"
        ? createProbeClient([
            { status: 0, stdout: '{"rpc":{"ok":true}}' },
            { status: 0, stdout: '{"ok":false}' }
          ])
        : createProbeClient([
            { status: 0, stdout: '{"rpc":{"ok":true}}' },
            { status: 0, stdout: '{"ok":true}' },
            { status: 0, stdout: "openai/not-the-expected-model\n" }
          ]);

    assert.throws(
      () => verifyOpenClawRuntimeForInstall("/tmp/openclaw.json", toPrimaryModelRef(DEFAULT_MODEL), runner),
      (error) => {
        assert.ok(error instanceof RuntimeVerificationError);
        assert.equal(error.code, INSTALL_ERROR_CODE.runtimeVerificationFailed);
        assert.equal(error.kind, kind);
        assert.equal(error.phase, "install");
        assert.equal(
          error.step,
          kind === "probe_command_failed" ? RUNTIME_VERIFICATION_STEP.gatewayRpc
            : kind === "unexpected_output" ? RUNTIME_VERIFICATION_STEP.healthSnapshot
              : kind === "runtime_unhealthy" ? RUNTIME_VERIFICATION_STEP.healthSnapshot
                : RUNTIME_VERIFICATION_STEP.resolvedPrimaryModel
        );
        assert.match(
          error.message,
          kind === "probe_command_failed" ? /exited with exit code 1/
            : kind === "unexpected_output" ? /Unable to interpret/
            : kind === "runtime_unhealthy" ? /unhealthy runtime/
              : /expects/
        );
        return true;
      }
    );
  }
});
