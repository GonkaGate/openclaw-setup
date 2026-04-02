import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { getSettingsTarget } from "../src/install/settings-paths.js";

function createFileExists(existingPaths: string[]): (filePath: string) => boolean {
  const existing = new Set(existingPaths);

  return (filePath) => existing.has(filePath);
}

test("getSettingsTarget points at the default OpenClaw config path", () => {
  const target = getSettingsTarget("/tmp/test-home");

  assert.equal(target, path.join("/tmp/test-home", ".openclaw", "openclaw.json"));
});

test("getSettingsTarget uses OPENCLAW_CONFIG_PATH as the exact config file path", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_CONFIG_PATH: "/tmp/custom-openclaw.json"
  });

  assert.equal(target, "/tmp/custom-openclaw.json");
});

test("getSettingsTarget uses OPENCLAW_STATE_DIR when OPENCLAW_CONFIG_PATH is not set", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
  });

  assert.equal(target, path.join("/tmp/openclaw-state", "openclaw.json"));
});

test("getSettingsTarget uses OPENCLAW_HOME when higher-precedence overrides are not set", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_HOME: "/tmp/openclaw-home"
  });

  assert.equal(target, path.join("/tmp/openclaw-home", ".openclaw", "openclaw.json"));
});

test("getSettingsTarget gives OPENCLAW_CONFIG_PATH precedence over OPENCLAW_STATE_DIR and OPENCLAW_HOME", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_CONFIG_PATH: "/tmp/custom-openclaw.json",
    OPENCLAW_HOME: "/tmp/openclaw-home",
    OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
  });

  assert.equal(target, "/tmp/custom-openclaw.json");
});

test("getSettingsTarget gives OPENCLAW_STATE_DIR precedence over OPENCLAW_HOME", () => {
  const target = getSettingsTarget("/tmp/test-home", {
    OPENCLAW_HOME: "/tmp/openclaw-home",
    OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
  });

  assert.equal(target, path.join("/tmp/openclaw-state", "openclaw.json"));
});

test("getSettingsTarget ignores empty override values and falls back to the next OpenClaw path source", () => {
  assert.equal(
    getSettingsTarget("/tmp/test-home", {
      OPENCLAW_CONFIG_PATH: "",
      OPENCLAW_HOME: "/tmp/openclaw-home",
      OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
    }),
    path.join("/tmp/openclaw-state", "openclaw.json")
  );

  assert.equal(
    getSettingsTarget("/tmp/test-home", {
      OPENCLAW_CONFIG_PATH: "",
      OPENCLAW_HOME: "/tmp/openclaw-home",
      OPENCLAW_STATE_DIR: ""
    }),
    path.join("/tmp/openclaw-home", ".openclaw", "openclaw.json")
  );
});

test("getSettingsTarget ignores whitespace-only override values and trims surrounding whitespace", () => {
  assert.equal(
    getSettingsTarget("/tmp/test-home", {
      OPENCLAW_CONFIG_PATH: "   ",
      OPENCLAW_STATE_DIR: " /tmp/openclaw-state ",
      OPENCLAW_HOME: " /tmp/openclaw-home "
    }),
    path.join("/tmp/openclaw-state", "openclaw.json")
  );

  assert.equal(
    getSettingsTarget("/tmp/test-home", {
      OPENCLAW_HOME: " /tmp/openclaw-home "
    }),
    path.join("/tmp/openclaw-home", ".openclaw", "openclaw.json")
  );
});

test("getSettingsTarget keeps OPENCLAW_CONFIG_PATH as the winner even when legacy config candidates exist", () => {
  const target = getSettingsTarget(
    "/tmp/test-home",
    {
      OPENCLAW_CONFIG_PATH: "/tmp/explicit-openclaw.json",
      OPENCLAW_HOME: "/tmp/openclaw-home"
    },
    {
      fileExists: createFileExists([
        path.join("/tmp/openclaw-home", ".clawdbot", "clawdbot.json"),
        path.join("/tmp/openclaw-home", ".openclaw", "openclaw.json")
      ])
    }
  );

  assert.equal(target, "/tmp/explicit-openclaw.json");
});

test("getSettingsTarget prefers an existing legacy default config candidate when no higher-precedence override is set", () => {
  const target = getSettingsTarget(
    "/tmp/test-home",
    {},
    {
      fileExists: createFileExists([path.join("/tmp/test-home", ".clawdbot", "clawdbot.json")])
    }
  );

  assert.equal(target, path.join("/tmp/test-home", ".clawdbot", "clawdbot.json"));
});

test("getSettingsTarget still falls back to the canonical OpenClaw path when no config candidates exist", () => {
  const target = getSettingsTarget(
    "/tmp/test-home",
    {},
    {
      fileExists: createFileExists([])
    }
  );

  assert.equal(target, path.join("/tmp/test-home", ".openclaw", "openclaw.json"));
});

test("getSettingsTarget keeps the canonical config ahead of legacy candidates when both exist", () => {
  const target = getSettingsTarget(
    "/tmp/test-home",
    {},
    {
      fileExists: createFileExists([
        path.join("/tmp/test-home", ".openclaw", "openclaw.json"),
        path.join("/tmp/test-home", ".clawdbot", "clawdbot.json")
      ])
    }
  );

  assert.equal(target, path.join("/tmp/test-home", ".openclaw", "openclaw.json"));
});

test("getSettingsTarget keeps OPENCLAW_STATE_DIR resolution inside that namespace while honoring legacy filenames there", () => {
  const target = getSettingsTarget(
    "/tmp/test-home",
    {
      OPENCLAW_STATE_DIR: "/tmp/openclaw-state"
    },
    {
      fileExists: createFileExists([path.join("/tmp/openclaw-state", "clawdbot.json")])
    }
  );

  assert.equal(target, path.join("/tmp/openclaw-state", "clawdbot.json"));
});
