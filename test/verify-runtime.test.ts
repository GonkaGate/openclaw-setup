import assert from "node:assert/strict";
import test from "node:test";
import { toPrimaryModelRef, DEFAULT_MODEL } from "../src/constants/models.js";
import {
  requireHealthyRuntime,
  resolveInstallRuntime,
  verifyOpenClawRuntime,
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

test("verifyOpenClawRuntime accepts a healthy Gateway, health snapshot, and resolved model", () => {
  const expectedPrimaryModelRef = toPrimaryModelRef(DEFAULT_MODEL);

  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    expectedPrimaryModelRef,
    createRunner([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":true}' },
      { status: 0, stdout: `${expectedPrimaryModelRef}\n` }
    ])
  );

  if (result.status !== "healthy") {
    assert.fail(`Expected verifyOpenClawRuntime to succeed, got ${result.status}`);
  }
  assert.equal(result.resolvedPrimaryModelRef, expectedPrimaryModelRef);
});

test("verifyOpenClawRuntime fails clearly when the Gateway RPC probe fails", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createRunner([
      { status: 1, stderr: "rpc failed" }
    ])
  );

  if (result.status === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to report a Gateway failure");
  }

  assert.equal(result.status, "gateway_unavailable");
  assert.match(result.message, /Gateway RPC/);
});

test("verifyOpenClawRuntime rejects unhealthy health snapshots", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createRunner([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":false}' }
    ])
  );

  if (result.status === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to report an unhealthy runtime");
  }

  assert.equal(result.status, "runtime_unhealthy");
  assert.match(result.message, /unhealthy runtime/);
});

test("verifyOpenClawRuntime rejects empty resolved-model output", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createRunner([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":true}' },
      { status: 0, stdout: "   \n" }
    ])
  );

  if (result.status === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to report an empty model response");
  }

  assert.equal(result.status, "model_resolution_failed");
  assert.match(result.message, /empty response/);
});

test("verifyOpenClawRuntime rejects mismatched resolved models", () => {
  const result = verifyOpenClawRuntime(
    "/tmp/openclaw.json",
    toPrimaryModelRef(DEFAULT_MODEL),
    createRunner([
      { status: 0, stdout: '{"rpc":{"ok":true}}' },
      { status: 0, stdout: '{"ok":true}' },
      { status: 0, stdout: "openai/not-the-expected-model\n" }
    ])
  );

  if (result.status === "healthy") {
    assert.fail("Expected verifyOpenClawRuntime to report a mismatched model");
  }

  assert.equal(result.status, "model_resolution_failed");
  assert.match(result.message, /expects/);
});

test("resolveInstallRuntime tolerates gateway-unavailable results and maps the next command", () => {
  const result = resolveInstallRuntime({
    message: "gateway offline",
    status: "gateway_unavailable"
  });

  assert.deepEqual(result, {
    nextCommand: "openclaw gateway",
    status: "gateway_unavailable"
  });
});

test("resolveInstallRuntime rethrows strict runtime failures for install", () => {
  assert.throws(
    () =>
      resolveInstallRuntime({
        message: "health failed",
        status: "runtime_unhealthy"
      }),
    /health failed/
  );
});

test("requireHealthyRuntime keeps verify strict for every non-healthy result", () => {
  assert.throws(
    () =>
      requireHealthyRuntime({
        message: "gateway offline",
        status: "gateway_unavailable"
      }),
    /gateway offline/
  );
});

test("requireHealthyRuntime preserves successful runtime results unchanged", () => {
  const expectedResult = {
    resolvedPrimaryModelRef: toPrimaryModelRef(DEFAULT_MODEL),
    status: "healthy" as const
  };

  assert.equal(requireHealthyRuntime(expectedResult), expectedResult);
});

test("resolveInstallRuntime rethrows every strict failure kind except gateway-unavailable", () => {
  const strictFailureKinds: RuntimeVerificationFailureKind[] = [
    "runtime_unhealthy",
    "model_resolution_failed"
  ];

  for (const status of strictFailureKinds) {
    assert.throws(
      () =>
        resolveInstallRuntime({
          message: `${status} failed`,
          status
        }),
      new RegExp(`${status} failed`)
    );
  }
});
