import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  INSTALL_ERROR_CODE,
  OpenClawConfigValidationError,
  TemporaryCandidateCleanupError,
  TemporaryCandidatePreparationError
} from "../src/install/install-errors.js";
import { validateOpenClawConfig, validateSettingsBeforeWrite } from "../src/install/openclaw-config-validation.js";
import { createTempFilePath } from "./test-helpers.js";

test("validateOpenClawConfig accepts a successful structured validation report", () => {
  validateOpenClawConfig("/tmp/openclaw.json", () => ({
    status: 0,
    stderr: "",
    stdout: '{"valid":true,"path":"/tmp/openclaw.json"}'
  }));
});

test("validateOpenClawConfig rejects successful reports that omit the validated path", () => {
  assert.throws(
    () =>
      validateOpenClawConfig("/tmp/openclaw.json", () => ({
        status: 0,
        stderr: "",
        stdout: '{"valid":true}'
      })),
    (error) => {
      assert.ok(error instanceof OpenClawConfigValidationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.openClawConfigValidationFailed);
      assert.equal(error.kind, "unexpected_validated_path");
      assert.equal(error.filePath, "/tmp/openclaw.json");
      assert.match(error.message, /confirmed no validated path instead/);
      assert.doesNotMatch(error.message, /rerun this installer/i);
      return true;
    }
  );
});

test("validateOpenClawConfig rejects successful reports for another config path", () => {
  assert.throws(
    () =>
      validateOpenClawConfig("/tmp/openclaw.json", () => ({
        status: 0,
        stderr: "",
        stdout: '{"valid":true,"path":"/tmp/other.json"}'
      })),
    (error) => {
      assert.ok(error instanceof OpenClawConfigValidationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.openClawConfigValidationFailed);
      assert.equal(error.kind, "unexpected_validated_path");
      assert.equal(error.reportedPath, "/tmp/other.json");
      assert.match(error.message, /confirmed "\/tmp\/other\.json" instead/);
      return true;
    }
  );
});

test("validateOpenClawConfig surfaces structured schema issues from OpenClaw", () => {
  assert.throws(
    () =>
      validateOpenClawConfig("/tmp/openclaw.json", () => ({
        status: 1,
        stderr: "",
        stdout: JSON.stringify({
          path: "/tmp/openclaw.json",
          valid: false,
          issues: [
            {
              path: "models.providers.openai.models",
              message: "Invalid input: expected array, received undefined"
            }
          ]
        })
      })),
    (error) => {
      assert.ok(error instanceof OpenClawConfigValidationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.openClawConfigValidationFailed);
      assert.equal(error.kind, "invalid_config");
      assert.equal(error.issues?.[0]?.path, "models.providers.openai.models");
      assert.match(error.message, /models\.providers\.openai\.models/);
      return true;
    }
  );
});

test("validateOpenClawConfig rejects invalid reports for another config path", () => {
  assert.throws(
    () =>
      validateOpenClawConfig("/tmp/openclaw.json", () => ({
        status: 1,
        stderr: "",
        stdout: JSON.stringify({
          issues: [
            {
              message: "wrong file",
              path: "models.providers.openai.baseUrl"
            }
          ],
          path: "/tmp/other.json",
          valid: false
        })
      })),
    (error) => {
      assert.ok(error instanceof OpenClawConfigValidationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.openClawConfigValidationFailed);
      assert.equal(error.kind, "unexpected_validated_path");
      assert.equal(error.reportedPath, "/tmp/other.json");
      assert.match(error.message, /confirmed "\/tmp\/other\.json" instead/);
      return true;
    }
  );
});

test("validateOpenClawConfig reports unsupported validation commands clearly", () => {
  assert.throws(
    () =>
      validateOpenClawConfig("/tmp/openclaw.json", () => ({
        status: 1,
        stderr: "error: unknown command config",
        stdout: ""
      })),
    (error) => {
      assert.ok(error instanceof OpenClawConfigValidationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.openClawConfigValidationFailed);
      assert.equal(error.kind, "command_failed");
      assert.equal(error.status, 1);
      assert.match(error.message, /Unable to validate the OpenClaw config/);
      assert.match(error.message, /did not return a supported validation result/);
      assert.doesNotMatch(error.message, /rerun this installer/i);
      return true;
    }
  );
});

test("validateSettingsBeforeWrite writes a candidate file next to the target, validates it, and cleans it up", async () => {
  const targetPath = await createTempFilePath("openclaw-prewrite-validation-");
  let candidatePath: string | undefined;
  let candidateContents: string | undefined;

  await validateSettingsBeforeWrite(
    targetPath,
    {
      agents: {
        defaults: {
          model: {
            primary: "openai/qwen/qwen3-235b-a22b-instruct-2507-fp8"
          }
        }
      }
    },
    (filePath) => {
      candidatePath = filePath;
      candidateContents = readFileSync(filePath, "utf8");
    }
  );

  assert.ok(candidatePath);
  assert.equal(candidatePath?.startsWith(targetPath), true);
  assert.equal(candidateContents?.includes('"primary": "openai/qwen/qwen3-235b-a22b-instruct-2507-fp8"'), true);
  assert.equal(existsSync(candidatePath!), false);
});

test("validateSettingsBeforeWrite awaits async validators before removing the candidate file", async () => {
  const targetPath = await createTempFilePath("openclaw-prewrite-validation-async-");
  let candidatePath: string | undefined;

  await validateSettingsBeforeWrite(
    targetPath,
    {
      gateway: {
        mode: "local"
      }
    },
    async (filePath) => {
      candidatePath = filePath;
      assert.equal(existsSync(filePath), true);
      await Promise.resolve();
      assert.equal(existsSync(filePath), true);
    }
  );

  assert.ok(candidatePath);
  assert.equal(existsSync(candidatePath!), false);
});

test("validateSettingsBeforeWrite surfaces cleanup failures alongside the primary validation error", async () => {
  const targetPath = await createTempFilePath("openclaw-prewrite-validation-cleanup-");
  const validationFailure = new Error("candidate config rejected");
  const cleanupFailure = new Error("cleanup failed");

  await assert.rejects(
    validateSettingsBeforeWrite(
      targetPath,
      {
        gateway: {
          mode: "local"
        }
      },
      async () => {
        throw validationFailure;
      },
      {
        chmodFile: async () => undefined,
        createDirectory: async () => undefined,
        removeFile: async () => {
          throw cleanupFailure;
        },
        writeCandidateFile: async () => undefined
      }
    ),
    (error) => {
      assert.ok(error instanceof TemporaryCandidateCleanupError);
      assert.equal(error.code, INSTALL_ERROR_CODE.temporaryCandidateCleanupFailed);
      assert.equal(error.cause, cleanupFailure);
      assert.equal(error.primaryError, validationFailure);
      assert.match(error.message, /candidate config rejected/);
      assert.match(error.message, /cleanup failed/);
      return true;
    }
  );
});

test("validateSettingsBeforeWrite reports cleanup failures when validation itself succeeded", async () => {
  const targetPath = await createTempFilePath("openclaw-prewrite-validation-cleanup-only-");
  const cleanupFailure = new Error("permission denied");

  await assert.rejects(
    validateSettingsBeforeWrite(
      targetPath,
      {
        gateway: {
          mode: "local"
        }
      },
      async () => undefined,
      {
        chmodFile: async () => undefined,
        createDirectory: async () => undefined,
        removeFile: async () => {
          throw cleanupFailure;
        },
        writeCandidateFile: async () => undefined
      }
    ),
    (error) => {
      assert.ok(error instanceof TemporaryCandidateCleanupError);
      assert.equal(error.code, INSTALL_ERROR_CODE.temporaryCandidateCleanupFailed);
      assert.equal(error.cause, cleanupFailure);
      assert.match(error.message, /temporary OpenClaw config candidate/);
      return true;
    }
  );
});

test("validateSettingsBeforeWrite wraps candidate staging failures with stable stage identity", async () => {
  const targetPath = await createTempFilePath("openclaw-prewrite-validation-stage-");
  const writeFailure = new Error("disk full");

  await assert.rejects(
    validateSettingsBeforeWrite(
      targetPath,
      {
        gateway: {
          mode: "local"
        }
      },
      async () => undefined,
      {
        chmodFile: async () => undefined,
        createDirectory: async () => undefined,
        removeFile: async () => undefined,
        writeCandidateFile: async () => {
          throw writeFailure;
        }
      }
    ),
    (error) => {
      assert.ok(error instanceof TemporaryCandidatePreparationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.temporaryCandidatePreparationFailed);
      assert.equal(error.stage, "write_candidate");
      assert.equal(error.targetPath, targetPath);
      assert.equal(error.cause, writeFailure);
      return true;
    }
  );
});
