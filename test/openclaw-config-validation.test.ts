import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  INSTALL_ERROR_CODE,
  TemporaryCandidateCleanupError
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
    /confirmed no validated path instead/
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
    /confirmed "\/tmp\/other\.json" instead/
  );
});

test("validateOpenClawConfig surfaces structured schema issues from OpenClaw", () => {
  assert.throws(
    () =>
      validateOpenClawConfig("/tmp/openclaw.json", () => ({
        status: 1,
        stderr: "",
        stdout: JSON.stringify({
          valid: false,
          issues: [
            {
              path: "models.providers.openai.models",
              message: "Invalid input: expected array, received undefined"
            }
          ]
        })
      })),
    /models\.providers\.openai\.models/
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
    /Unable to validate the OpenClaw config/
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

test("validateSettingsBeforeWrite preserves the primary validation error when cleanup also fails", async () => {
  const targetPath = await createTempFilePath("openclaw-prewrite-validation-cleanup-");
  const validationFailure = new Error("candidate config rejected");

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
          throw new Error("cleanup failed");
        },
        writeCandidateFile: async () => undefined
      }
    ),
    (error) => error === validationFailure
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
