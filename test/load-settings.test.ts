import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULT_MODEL, toPrimaryModelRef } from "../src/constants/models.js";
import { INSTALL_ERROR_CODE, SettingsParseError, SettingsShapeError } from "../src/install/install-errors.js";
import { loadSettings } from "../src/install/load-settings.js";
import { createTempFilePath } from "./test-helpers.js";

test("loadSettings parses JSON5 and rejects invalid JSON5 instead of overwriting it", async () => {
  const filePath = await createTempFilePath("openclaw-invalid-json5-");

  await writeFile(filePath, "{broken: [}", "utf8");

  await assert.rejects(
    loadSettings(filePath),
    (error) => {
      assert.ok(error instanceof SettingsParseError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsParseFailed);
      assert.match(error.message, /Failed to parse JSON5/);
      assert.match(error.message, /Parser detail: JSON5: invalid character/);
      assert.ok(error.cause instanceof Error);
      assert.match(error.cause.message, /1:11/);
      return true;
    }
  );
});

test("loadSettings accepts JSON5 comments and trailing commas", async () => {
  const filePath = await createTempFilePath("openclaw-json5-");

  await writeFile(
    filePath,
    `{
      // comment
      models: {
        providers: {
          openai: {
            api: "openai-completions",
          },
        },
      },
    }
`,
    "utf8"
  );

  const loaded = await loadSettings(filePath);

  assert.equal(loaded.kind, "loaded");
  if (loaded.kind !== "loaded") {
    assert.fail("Expected loadSettings to return parsed settings");
  }
  assert.deepEqual(loaded.settings, {
    models: {
      providers: {
        openai: {
          api: "openai-completions"
        }
      }
    }
  });
});

test("loadSettings requires the root JSON5 value to be an object", async () => {
  const cases = [
    "[]",
    `"hello"`,
    "42"
  ];

  for (const contents of cases) {
    const filePath = await createTempFilePath("openclaw-non-object-root-");
    await writeFile(filePath, contents, "utf8");

    await assert.rejects(
      loadSettings(filePath),
      (error) => {
        assert.ok(error instanceof SettingsShapeError);
        assert.equal(error.code, INSTALL_ERROR_CODE.settingsShapeInvalid);
        assert.equal(error.kind, "root_not_object");
        assert.equal(error.sourceLabel, filePath);
        assert.match(error.message, /contain a JSON5 object/);
        return true;
      }
    );
  }
});

test("loadSettings rejects non-object managed surfaces individually", async () => {
  const cases = [
    {
      fieldPath: "models",
      contents: `{
        models: "not-an-object",
      }`
    },
    {
      fieldPath: "models.providers",
      contents: `{
        models: {
          providers: "not-an-object",
        },
      }`
    },
    {
      fieldPath: "models.providers.openai",
      contents: `{
        models: {
          providers: {
            openai: "not-an-object",
          },
        },
      }`
    },
    {
      fieldPath: "models.providers.openai.models",
      contents: `{
        models: {
          providers: {
            openai: {
              models: "not-an-array",
            },
          },
        },
      }`
    },
    {
      fieldPath: "agents",
      contents: `{
        agents: "not-an-object",
      }`
    },
    {
      fieldPath: "agents.defaults",
      contents: `{
        agents: {
          defaults: "not-an-object",
        },
      }`
    },
    {
      fieldPath: "agents.defaults.model",
      contents: `{
        agents: {
          defaults: {
            model: "not-an-object",
          },
        },
      }`
    },
    {
      fieldPath: "agents.defaults.models",
      contents: `{
        agents: {
          defaults: {
            models: "not-an-object",
          },
        },
      }`
    }
  ];

  for (const { fieldPath, contents } of cases) {
    const filePath = await createTempFilePath("openclaw-invalid-shape-");
    await writeFile(filePath, contents, "utf8");

    await assert.rejects(
      loadSettings(filePath),
      (error) => {
        assert.ok(error instanceof SettingsShapeError);
        assert.equal(error.code, INSTALL_ERROR_CODE.settingsShapeInvalid);
        assert.match(error.message, new RegExp(fieldPath.replaceAll(".", "\\.")));
        assert.equal(error.fieldPath, fieldPath);
        return true;
      }
    );
  }
});

test("loadSettings accepts configs that omit optional managed objects", async () => {
  const filePath = await createTempFilePath("openclaw-optional-managed-");

  await writeFile(
    filePath,
    `{
      gateway: {
        reload: {
          enabled: true,
        },
      },
      models: {},
      agents: {
        defaults: {},
      },
    }
`,
    "utf8"
  );

  const loaded = await loadSettings(filePath);

  assert.equal(loaded.kind, "loaded");
  if (loaded.kind !== "loaded") {
    assert.fail("Expected loadSettings to return parsed settings");
  }
  assert.deepEqual(loaded.settings, {
    gateway: {
      reload: {
        enabled: true
      }
    },
    models: {},
    agents: {
      defaults: {}
    }
  });
});

test("loadSettings rejects malformed managed allowlist entries for supported curated models", async () => {
  const filePath = await createTempFilePath("openclaw-invalid-allowlist-entry-");
  const primaryModelRef = toPrimaryModelRef(DEFAULT_MODEL);

  await writeFile(
    filePath,
    `{
      agents: {
        defaults: {
          models: {
            "${primaryModelRef}": "not-an-object",
          },
        },
      },
    }
`,
    "utf8"
  );

  await assert.rejects(
    loadSettings(filePath),
    (error) => {
      assert.ok(error instanceof SettingsShapeError);
      assert.equal(error.code, INSTALL_ERROR_CODE.settingsShapeInvalid);
      assert.equal(error.fieldPath, `agents.defaults.models.${primaryModelRef}`);
      assert.match(error.message, /agents\.defaults\.models\./);
      return true;
    }
  );
});

test("loadSettings returns exists=false when the config file is missing", async () => {
  const filePath = await createTempFilePath("openclaw-missing-config-");

  const loaded = await loadSettings(filePath);

  assert.deepEqual(loaded, {
    kind: "missing"
  });
});
