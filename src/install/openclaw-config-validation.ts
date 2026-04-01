import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { OpenClawConfig } from "../types/settings.js";
import {
  formatOpenClawCommandOutput,
  normalizeOpenClawCommandResult,
  throwIfOpenClawCommandErrored,
  type OpenClawCommandResult
} from "./openclaw-command.js";

interface OpenClawValidationIssue {
  message?: string;
  path?: string;
}

interface OpenClawValidationReport {
  issues?: OpenClawValidationIssue[];
  path?: string;
  valid?: boolean;
}

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
      mode: 0o600
    });
    await chmod(candidatePath, 0o600);
    validateOpenClawConfigImpl(candidatePath);
  } finally {
    await rm(candidatePath, { force: true });
  }
}

export function validateOpenClawConfig(
  filePath: string,
  runCommand: ValidationCommandRunner = runValidationCommand
): void {
  const result = runCommand("openclaw", ["config", "validate", "--json"], filePath);
  throwIfOpenClawCommandErrored(result);

  const report = parseValidationReport(result.stdout);

  if (report?.valid === true && result.status === 0) {
    return;
  }

  if (report?.valid === false) {
    throw new Error(formatInvalidConfigMessage(filePath, report.issues));
  }

  throw new Error(formatValidationCommandFailure(filePath, result));
}

function runValidationCommand(command: string, args: string[], configPath: string): ValidationCommandResult {
  return normalizeOpenClawCommandResult(spawnSync(command, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      OPENCLAW_CONFIG_PATH: configPath
    },
    stdio: "pipe"
  }));
}

function parseValidationReport(stdout: string): OpenClawValidationReport | undefined {
  const trimmed = stdout.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as OpenClawValidationReport;
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function formatInvalidConfigMessage(filePath: string, issues: readonly OpenClawValidationIssue[] | undefined): string {
  const formattedIssues = (issues ?? []).map(formatIssue).filter((issue) => issue.length > 0);

  if (formattedIssues.length === 0) {
    return `OpenClaw rejected the config at ${filePath}, but did not return structured validation issues.`;
  }

  return `OpenClaw rejected the config at ${filePath}:\n${formattedIssues.map((issue) => `- ${issue}`).join("\n")}`;
}

function formatIssue(issue: OpenClawValidationIssue): string {
  const message = typeof issue.message === "string" && issue.message.trim().length > 0
    ? issue.message.trim()
    : "Invalid configuration value.";
  const fieldPath = typeof issue.path === "string" && issue.path.trim().length > 0
    ? issue.path.trim()
    : undefined;

  return fieldPath ? `${fieldPath}: ${message}` : message;
}

function formatValidationCommandFailure(filePath: string, result: ValidationCommandResult): string {
  const output = formatOpenClawCommandOutput(result);
  const outputSuffix = output.length > 0 ? `\n\nOpenClaw output:\n${output}` : "";

  return (
    `Unable to validate the OpenClaw config at ${filePath} with "openclaw config validate --json". ` +
    `Update OpenClaw and rerun this installer.${outputSuffix}`
  );
}
