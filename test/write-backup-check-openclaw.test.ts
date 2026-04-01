import assert from "node:assert/strict";
import { chmod, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createBackup } from "../src/install/backup.js";
import { ensureOpenClawInstalled, initializeOpenClawBaseConfig } from "../src/install/check-openclaw.js";
import {
  INSTALL_ERROR_CODE,
  OpenClawCommandError,
  OpenClawNotFoundError
} from "../src/install/install-errors.js";
import { writeSettings } from "../src/install/write-settings.js";
import { createTempDirectory, createTempFilePath } from "./test-helpers.js";

test("writeSettings writes JSON and createBackup snapshots the previous file", async () => {
  const filePath = await createTempFilePath("openclaw-write-settings-");

  await writeFile(filePath, JSON.stringify({ agents: { defaults: { model: { primary: "old" } } } }, null, 2), "utf8");

  const originalContents = await readFile(filePath, "utf8");
  const backupPath = await createBackup(filePath);

  await writeSettings(filePath, {
    agents: {
      defaults: {
        model: {
          primary: "new"
        }
      }
    }
  });

  const backupContents = JSON.parse(await readFile(backupPath, "utf8"));
  const currentContents = JSON.parse(await readFile(filePath, "utf8"));

  assert.equal(backupPath.startsWith(`${filePath}.backup-`), true);
  assert.equal(await readFile(filePath, "utf8"), `${JSON.stringify(currentContents, null, 2)}\n`);
  assert.equal(originalContents, JSON.stringify({ agents: { defaults: { model: { primary: "old" } } } }, null, 2));
  assert.deepEqual(backupContents, { agents: { defaults: { model: { primary: "old" } } } });
  assert.deepEqual(currentContents, { agents: { defaults: { model: { primary: "new" } } } });
});

test("createBackup normalizes backup permissions to owner-only", async () => {
  const filePath = await createTempFilePath("openclaw-backup-mode-");

  await writeFile(filePath, JSON.stringify({ models: { providers: { openai: { apiKey: "secret" } } } }, null, 2), "utf8");
  await chmod(filePath, 0o644);

  const backupPath = await createBackup(filePath);
  const backupStats = await stat(backupPath);

  assert.equal(backupStats.mode & 0o777, 0o600);
});

test("writeSettings creates owner-only files for secret-bearing settings", async () => {
  const filePath = await createTempFilePath("openclaw-file-mode-");

  await writeSettings(filePath, {
    models: {
      providers: {
        openai: {
          apiKey: "secret"
        }
      }
    }
  });

  const fileStats = await stat(filePath);

  assert.equal(fileStats.mode & 0o777, 0o600);
});

test("writeSettings creates the target directory when it does not exist", async () => {
  const directory = await createTempDirectory("openclaw-nested-write-");
  const filePath = path.join(directory, "nested", ".openclaw", "openclaw.json");

  await writeSettings(filePath, {
    models: {
      providers: {
        openai: {
          apiKey: "secret"
        }
      }
    }
  });

  const currentContents = JSON.parse(await readFile(filePath, "utf8"));

  assert.deepEqual(currentContents, {
    models: {
      providers: {
        openai: {
          apiKey: "secret"
        }
      }
    }
  });
});

test("writeSettings preserves an existing 0o600 mode", async () => {
  const filePath = await createTempFilePath("openclaw-existing-mode-");

  await writeFile(filePath, JSON.stringify({ agents: { defaults: { model: { primary: "old" } } } }, null, 2), "utf8");
  await chmod(filePath, 0o600);

  await writeSettings(filePath, {
    agents: {
      defaults: {
        model: {
          primary: "new"
        }
      }
    }
  });

  const fileStats = await stat(filePath);

  assert.equal(fileStats.mode & 0o777, 0o600);
});

test("writeSettings normalizes existing single owner-bit modes to 0o600", async () => {
  const filePath = await createTempFilePath("openclaw-single-owner-bit-");

  await writeFile(filePath, JSON.stringify({ agents: { defaults: { model: { primary: "old" } } } }, null, 2), "utf8");
  await chmod(filePath, 0o400);

  await writeSettings(filePath, {
    agents: {
      defaults: {
        model: {
          primary: "new"
        }
      }
    }
  });

  const fileStats = await stat(filePath);

  assert.equal(fileStats.mode & 0o777, 0o600);
});

test("ensureOpenClawInstalled reports a missing binary clearly", () => {
  assert.throws(
    () =>
      ensureOpenClawInstalled(() => ({
        status: null,
        error: Object.assign(new Error("missing"), { code: "ENOENT" })
      })),
    (error) => {
      assert.ok(error instanceof OpenClawNotFoundError);
      assert.equal(error.code, INSTALL_ERROR_CODE.openClawNotFound);
      assert.match(error.message, /not found in PATH/);
      return true;
    }
  );
});

test("ensureOpenClawInstalled reports failing version checks clearly", () => {
  assert.throws(
    () =>
      ensureOpenClawInstalled(() => ({
        status: 1
      })),
    /exited with code 1/
  );
});

test("ensureOpenClawInstalled rethrows unexpected runner errors", () => {
  const runnerError = new Error("spawn failed");

  assert.throws(
    () =>
      ensureOpenClawInstalled(() => ({
        status: null,
        error: runnerError
      })),
    (error) => {
      assert.ok(error instanceof OpenClawCommandError);
      assert.equal(error.code, INSTALL_ERROR_CODE.openClawCommandFailed);
      assert.equal(error.operation, "verify the local OpenClaw install");
      assert.equal(error.cause, runnerError);
      assert.match(error.message, /openclaw --version/);
      return true;
    }
  );
});

test("initializeOpenClawBaseConfig reports a missing binary clearly", () => {
  assert.throws(
    () =>
      initializeOpenClawBaseConfig(() => ({
        status: null,
        error: Object.assign(new Error("missing"), { code: "ENOENT" })
      })),
    (error) => {
      assert.ok(error instanceof OpenClawNotFoundError);
      assert.equal(error.code, INSTALL_ERROR_CODE.openClawNotFound);
      assert.match(error.message, /not found in PATH/);
      return true;
    }
  );
});

test("initializeOpenClawBaseConfig reports failing setup clearly", () => {
  assert.throws(
    () =>
      initializeOpenClawBaseConfig(() => ({
        status: 1
      })),
    /openclaw setup/
  );
});

test("initializeOpenClawBaseConfig rethrows unexpected runner errors", () => {
  const runnerError = new Error("spawn failed");

  assert.throws(
    () =>
      initializeOpenClawBaseConfig(() => ({
        status: null,
        error: runnerError
      })),
    (error) => {
      assert.ok(error instanceof OpenClawCommandError);
      assert.equal(error.code, INSTALL_ERROR_CODE.openClawCommandFailed);
      assert.equal(error.operation, "initialize the local OpenClaw config automatically");
      assert.equal(error.cause, runnerError);
      assert.match(error.message, /openclaw setup/);
      return true;
    }
  );
});
