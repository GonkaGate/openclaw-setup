import { randomUUID } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { OpenClawConfig } from "../types/settings.js";
import { DEFAULT_OWNER_ONLY_MODE } from "./file-permissions.js";
import { createOpenClawClient, type OpenClawClientCommandRunner } from "./openclaw-client.js";
import { runOpenClawCommand, type OpenClawCommandResult } from "./openclaw-command.js";

export type ValidationCommandResult = OpenClawCommandResult;

export type ValidationCommandRunner = (command: string, args: string[], configPath: string) => ValidationCommandResult;

export async function validateSettingsBeforeWrite(
  targetPath: string,
  settings: OpenClawConfig,
  validateOpenClawConfigImpl: typeof validateOpenClawConfig = validateOpenClawConfig
): Promise<void> {
  const directory = path.dirname(targetPath);
  const candidatePath = path.join(directory, `${path.basename(targetPath)}.candidate-${randomUUID()}.json`);
  const content = `${JSON.stringify(settings, null, 2)}\n`;

  await mkdir(directory, { recursive: true });

  try {
    await writeFile(candidatePath, content, {
      encoding: "utf8",
      mode: DEFAULT_OWNER_ONLY_MODE
    });
    await chmod(candidatePath, DEFAULT_OWNER_ONLY_MODE);
    validateOpenClawConfigImpl(candidatePath);
  } finally {
    await rm(candidatePath, { force: true });
  }
}

export function validateOpenClawConfig(
  filePath: string,
  runCommand: ValidationCommandRunner = runValidationCommand
): void {
  createClientFromLegacyValidationRunner(filePath, runCommand).validateConfig(filePath);
}

function runValidationCommand(command: string, args: string[], configPath: string): ValidationCommandResult {
  return runOpenClawCommand(command, args, {
    env: {
      ...process.env,
      OPENCLAW_CONFIG_PATH: configPath
    },
    stdio: "pipe"
  });
}
function createClientFromLegacyValidationRunner(
  filePath: string,
  runCommand: ValidationCommandRunner
) {
  const adaptedRunner: OpenClawClientCommandRunner = (command, args) => runCommand(command, args, filePath);

  return createOpenClawClient({
    runCommand: adaptedRunner
  });
}
