import assert from "node:assert/strict";
import { chmod, writeFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULT_MODEL, toPrimaryModelRef } from "../src/constants/models.js";
import { formatUnixMode } from "../src/install/file-permissions.js";
import { verifySettings } from "../src/install/verify-settings.js";
import { createManagedConfigFixture, createTempFilePath } from "./test-helpers.js";

test("verifySettings accepts the managed GonkaGate provider config with owner-only permissions", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-success-", 0o600);

  const result = await verifySettings(filePath, createManagedConfigFixture({
    includeAllowlist: true
  }));

  assert.equal(result.selectedModel.key, DEFAULT_MODEL.key);
  assert.equal(result.configMode, 0o600);
});

test("verifySettings rejects configs that point OpenClaw at the wrong base URL", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-base-url-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      openaiProvider: {
        baseUrl: "https://example.com/v1"
      }
    })),
    /models\.providers\.openai\.baseUrl/
  );
});

test("verifySettings rejects configs that use the wrong OpenClaw API adapter", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-api-adapter-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      openaiProvider: {
        api: "responses"
      }
    })),
    /models\.providers\.openai\.api/
  );
});

test("verifySettings rejects malformed GonkaGate API keys", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-api-key-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      openaiProvider: {
        apiKey: "not-a-gonka-key"
      }
    })),
    /Invalid "models\.providers\.openai\.apiKey"/
  );
});

test("verifySettings rejects saved API keys with leading or trailing whitespace", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-api-key-whitespace-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      openaiProvider: {
        apiKey: " gp-test-key "
      }
    })),
    /leading or trailing whitespace/
  );
});

test("verifySettings rejects unsupported primary model refs", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-model-ref-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      primaryModelRef: "openai/not-supported"
    })),
    /agents\.defaults\.model\.primary/
  );
});

test("verifySettings rejects missing allowlist entries when agents.defaults.models is present", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-allowlist-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      allowlist: {},
      includeAllowlist: true
    })),
    /agents\.defaults\.models\./
  );
});

test("verifySettings rejects mismatched allowlist aliases when agents.defaults.models is present", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-alias-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      allowlist: {
        [toPrimaryModelRef(DEFAULT_MODEL)]: {
          alias: "wrong-alias"
        }
      },
      includeAllowlist: true
    })),
    /alias/
  );
});

test("verifySettings rejects configs whose permissions are not owner-only", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-mode-", 0o644);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture()),
    new RegExp(formatUnixMode(0o644))
  );
});

test("verifySettings rejects configs that are not owner-read-write only", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-readonly-mode-", 0o400);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture()),
    new RegExp(formatUnixMode(0o400))
  );
});

test("verifySettings rejects configs whose managed openai provider omits the models array", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-provider-models-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      includeOpenAiModels: false
    })),
    /models\.providers\.openai\.models/
  );
});

async function createManagedConfigFile(prefix: string, mode: number): Promise<string> {
  const filePath = await createTempFilePath(prefix);
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, mode);
  return filePath;
}
