import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { validateOpenClawConfig, validateSettingsBeforeWrite } from "../src/install/openclaw-config-validation.js";
import { createTempFilePath } from "./test-helpers.js";

test("validateOpenClawConfig accepts a successful structured validation report", () => {
  validateOpenClawConfig("/tmp/openclaw.json", () => ({
    status: 0,
    stderr: "",
    stdout: '{"valid":true,"path":"/tmp/openclaw.json"}'
  }));
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
