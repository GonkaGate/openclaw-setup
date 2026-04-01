import { randomUUID } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { OpenClawConfig } from "../types/settings.js";
import { DEFAULT_OWNER_ONLY_MODE } from "./file-permissions.js";
import {
  formatOpenClawCommandOutput,
  runOpenClawCommand,
  throwIfOpenClawCommandErrored,
  type OpenClawCommandResult
} from "./openclaw-command.js";
import { asPlainObject, type PlainObject } from "./object-utils.js";

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
  const result = runCommand("openclaw", ["config", "validate", "--json"], filePath);
  throwIfOpenClawCommandErrored(result);

  const report = parseValidationReport(result.stdout);

  if (report?.valid === true && result.status === 0) {
    if (validatedRequestedPath(report, filePath)) {
      return;
    }

    throw new Error(formatUnexpectedValidationPathMessage(filePath, report, result));
  }

  if (report?.valid === false) {
    throw new Error(formatInvalidConfigMessage(filePath, report.issues));
  }

  throw new Error(formatValidationCommandFailure(filePath, result));
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

function parseValidationReport(stdout: string): OpenClawValidationReport | undefined {
  const parsed = parseJsonObject(stdout);

  if (!parsed) {
    return undefined;
  }

  return {
    issues: parseValidationIssues(parsed.issues),
    path: typeof parsed.path === "string" ? parsed.path : undefined,
    valid: typeof parsed.valid === "boolean" ? parsed.valid : undefined
  };
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

function validatedRequestedPath(report: OpenClawValidationReport, filePath: string): boolean {
  const reportedPath = typeof report.path === "string" ? report.path.trim() : "";

  return reportedPath.length > 0 && path.resolve(reportedPath) === path.resolve(filePath);
}

function formatUnexpectedValidationPathMessage(
  filePath: string,
  report: OpenClawValidationReport,
  result: ValidationCommandResult
): string {
  const reportedPath = typeof report.path === "string" && report.path.trim().length > 0
    ? `"${report.path.trim()}"`
    : "no validated path";
  const output = formatOpenClawCommandOutput(result);
  const outputSuffix = output.length > 0 ? `\n\nOpenClaw output:\n${output}` : "";

  return (
    `OpenClaw reported a successful validation result for ${filePath}, but confirmed ${reportedPath} instead. ` +
    `Update OpenClaw and rerun this installer.${outputSuffix}`
  );
}

function parseValidationIssues(value: unknown): OpenClawValidationIssue[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map(parseValidationIssue)
    .filter((issue): issue is OpenClawValidationIssue => issue !== undefined);
}

function parseValidationIssue(value: unknown): OpenClawValidationIssue | undefined {
  const issue = asPlainObject(value);

  if (!issue) {
    return undefined;
  }

  return {
    message: typeof issue.message === "string" ? issue.message : undefined,
    path: typeof issue.path === "string" ? issue.path : undefined
  };
}

function parseJsonObject(stdout: string): PlainObject | undefined {
  const trimmed = stdout.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  try {
    return asPlainObject(JSON.parse(trimmed));
  } catch {
    return undefined;
  }
}
