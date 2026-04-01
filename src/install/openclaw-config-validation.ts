import { randomUUID } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../types/settings.js";
import { DEFAULT_OWNER_ONLY_MODE } from "./file-permissions.js";
import { createOpenClawClient, type OpenClawClientCommandRunner } from "./openclaw-client.js";
import { runOpenClawCommand } from "./openclaw-command.js";

export type ValidationCommandRunner = OpenClawClientCommandRunner;

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
  runCommand: ValidationCommandRunner = runOpenClawCommand
): void {
  createOpenClawClient({ runCommand }).validateConfig(filePath);
}
