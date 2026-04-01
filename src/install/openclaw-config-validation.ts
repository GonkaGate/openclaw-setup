import { randomUUID } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../types/settings.js";
import { DEFAULT_OWNER_ONLY_MODE } from "./file-permissions.js";
import { TemporaryCandidateCleanupError } from "./install-errors.js";
import {
  type OpenClawClientCommandRunner,
  validateOpenClawConfig as validateOpenClawConfigWithRunner
} from "./openclaw-client.js";
import { runOpenClawCommand } from "./openclaw-command.js";

export type ValidationCommandRunner = OpenClawClientCommandRunner;
export type ValidateOpenClawConfig = (filePath: string) => void | Promise<void>;

export interface ValidationFileDependencies {
  chmodFile: typeof chmod;
  createDirectory: typeof mkdir;
  removeFile: typeof rm;
  writeCandidateFile: typeof writeFile;
}

const defaultValidationFileDependencies: ValidationFileDependencies = {
  chmodFile: chmod,
  createDirectory: mkdir,
  removeFile: rm,
  writeCandidateFile: writeFile
};

export async function validateSettingsBeforeWrite(
  targetPath: string,
  settings: OpenClawConfig,
  validateOpenClawConfigImpl: ValidateOpenClawConfig = validateOpenClawConfig,
  fileDependencies: ValidationFileDependencies = defaultValidationFileDependencies
): Promise<void> {
  const directory = path.dirname(targetPath);
  const candidatePath = path.join(directory, `${path.basename(targetPath)}.candidate-${randomUUID()}.json`);
  const content = `${JSON.stringify(settings, null, 2)}\n`;
  let primaryError: unknown;

  await fileDependencies.createDirectory(directory, { recursive: true });

  try {
    await fileDependencies.writeCandidateFile(candidatePath, content, {
      encoding: "utf8",
      mode: DEFAULT_OWNER_ONLY_MODE
    });
    await fileDependencies.chmodFile(candidatePath, DEFAULT_OWNER_ONLY_MODE);
    await validateOpenClawConfigImpl(candidatePath);
  } catch (error) {
    primaryError = error;
  }

  try {
    await fileDependencies.removeFile(candidatePath, { force: true });
  } catch (error) {
    if (!primaryError) {
      throw new TemporaryCandidateCleanupError(targetPath, candidatePath, error);
    }
  }

  if (primaryError) {
    throw primaryError;
  }
}

export function validateOpenClawConfig(
  filePath: string,
  runCommand: ValidationCommandRunner = runOpenClawCommand
): void {
  validateOpenClawConfigWithRunner(filePath, runCommand);
}
