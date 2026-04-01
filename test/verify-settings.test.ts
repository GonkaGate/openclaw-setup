import assert from "node:assert/strict";
import { chmod, writeFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULT_MODEL, toPrimaryModelRef } from "../src/constants/models.js";
import { formatUnixMode } from "../src/install/file-permissions.js";
import { INSTALL_ERROR_CODE, SettingsVerificationError } from "../src/install/install-errors.js";
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
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsVerificationFailed);
      assert.equal(error.kind, "mismatched_managed_value");
      assert.equal(error.fieldPath, "models.providers.openai.baseUrl");
      assert.equal(error.actual, "https://example.com/v1");
      return true;
    }
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
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsVerificationFailed);
      assert.equal(error.kind, "mismatched_managed_value");
      assert.equal(error.fieldPath, "models.providers.openai.api");
      assert.equal(error.actual, "responses");
      return true;
    }
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
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsVerificationFailed);
      assert.equal(error.kind, "invalid_api_key");
      assert.equal(error.fieldPath, "models.providers.openai.apiKey");
      assert.ok(error.cause instanceof Error);
      assert.match(error.message, /Invalid "models\.providers\.openai\.apiKey"/);
      return true;
    }
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
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsVerificationFailed);
      assert.equal(error.kind, "invalid_api_key");
      assert.equal(error.fieldPath, "models.providers.openai.apiKey");
      assert.ok(error.cause instanceof SettingsVerificationError);
      assert.match(error.message, /leading or trailing whitespace/);
      return true;
    }
  );
});

test("verifySettings rejects unsupported primary model refs", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-model-ref-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      primaryModelRef: "openai/not-supported"
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "mismatched_managed_value");
      assert.equal(error.fieldPath, "agents.defaults.model.primary");
      assert.equal(error.actual, "openai/not-supported");
      return true;
    }
  );
});

test("verifySettings rejects missing allowlist entries when agents.defaults.models is present", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-allowlist-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      allowlist: {},
      includeAllowlist: true
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "missing_allowlist_entry");
      assert.match(error.fieldPath ?? "", /agents\.defaults\.models\./);
      return true;
    }
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
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "mismatched_allowlist_alias");
      assert.match(error.fieldPath ?? "", /alias/);
      assert.equal(error.actual, "wrong-alias");
      return true;
    }
  );
});

test("verifySettings rejects configs whose permissions are not owner-only", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-mode-", 0o644);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture()),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "invalid_permissions");
      assert.equal(error.actual, formatUnixMode(0o644));
      return true;
    }
  );
});

test("verifySettings rejects configs that are not owner-read-write only", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-readonly-mode-", 0o400);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture()),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "invalid_permissions");
      assert.equal(error.actual, formatUnixMode(0o400));
      return true;
    }
  );
});

test("verifySettings rejects configs whose managed openai provider omits the models array", async () => {
  const filePath = await createManagedConfigFile("openclaw-verify-provider-models-", 0o600);

  await assert.rejects(
    verifySettings(filePath, createManagedConfigFixture({
      includeOpenAiModels: false
    })),
    (error) => {
      assert.ok(error instanceof SettingsVerificationError);
      assert.equal(error.kind, "missing_managed_value");
      assert.equal(error.fieldPath, "models.providers.openai.models");
      return true;
    }
  );
});

async function createManagedConfigFile(prefix: string, mode: number): Promise<string> {
  const filePath = await createTempFilePath(prefix);
  await writeFile(filePath, "{}", "utf8");
  await chmod(filePath, mode);
  return filePath;
}
