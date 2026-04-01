import assert from "node:assert/strict";
import test from "node:test";
import { toPrimaryModelRef, DEFAULT_MODEL } from "../src/constants/models.js";
import { INSTALL_ERROR_CODE, RuntimeVerificationError } from "../src/install/install-errors.js";
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

test("verifyOpenClawRuntime fails clearly when the Gateway RPC probe fails", () => {
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

  assert.equal(result.kind, "gateway_unavailable");
  assert.match(result.message, /Gateway RPC/);
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

  assert.equal(result.kind, "model_resolution_failed");
  assert.match(result.message, /empty response/);
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
      { status: 1, stderr: "rpc failed" }
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
      assert.match(error.message, /Unable to interpret/);
      assert.match(error.message, /settings were written successfully/);
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
      assert.match(error.message, /unhealthy runtime/);
      assert.match(error.message, /settings were written successfully/);
      return true;
    }
  );
});

test("verifyOpenClawRuntimeForVerify keeps verify strict for every non-healthy result", () => {
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
      assert.equal(error.kind, "gateway_unavailable");
      assert.equal(error.phase, "verify");
      assert.match(error.message, /Gateway RPC/);
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
    "unexpected_output",
    "runtime_unhealthy",
    "model_resolution_failed"
  ];

  for (const kind of strictFailureKinds) {
    const runner = kind === "unexpected_output"
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
        assert.match(
          error.message,
          kind === "unexpected_output" ? /Unable to interpret/
            : kind === "runtime_unhealthy" ? /unhealthy runtime/
              : /expects/
        );
        return true;
      }
    );
  }
});
