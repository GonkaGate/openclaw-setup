import path from "node:path";
import process from "node:process";
import {
  formatOpenClawCommandOutput,
  runOpenClawCommand,
  throwIfOpenClawCommandErrored,
  type OpenClawCommandResult,
  type RunOpenClawCommandOptions
} from "./openclaw-command.js";
import {
  OpenClawCommandExitError,
  OpenClawConfigValidationError,
  formatCommandExitStatus,
  type OpenClawCommandContext,
  type OpenClawValidationIssueSummary
} from "./install-errors.js";
import { asPlainObject, type PlainObject } from "./object-utils.js";

const OPENCLAW_COMMAND = "openclaw" as const;

interface OpenClawCommandSpec {
  args: readonly string[];
  description: string;
  expectedShape?: string;
}

export const OPENCLAW_COMMANDS = {
  ensureInstalled: {
    args: ["--version"],
    description: "openclaw --version"
  },
  gatewayRpc: {
    args: ["gateway", "status", "--require-rpc", "--json"],
    description: "openclaw gateway status --require-rpc --json",
    expectedShape: 'a JSON object with a boolean "rpc.ok" field'
  },
  healthSnapshot: {
    args: ["health", "--json"],
    description: "openclaw health --json",
    expectedShape: 'a JSON object with a boolean "ok" field'
  },
  initializeBaseConfig: {
    args: ["setup"],
    description: "openclaw setup"
  },
  resolvedPrimaryModel: {
    args: ["models", "status", "--plain"],
    description: "openclaw models status --plain",
    expectedShape: "a single non-empty model ref line"
  },
  validateConfig: {
    args: ["config", "validate", "--json"],
    description: "openclaw config validate --json"
  }
} as const satisfies Record<string, OpenClawCommandSpec>;

interface OpenClawValidationReport {
  issues?: OpenClawValidationIssueSummary[];
  path?: string;
  valid?: boolean;
}

type JsonObjectParseFailureReason = "empty_output" | "invalid_json" | "non_object";
type JsonReportParseFailureReason = JsonObjectParseFailureReason | "invalid_shape";
type ResolvedPrimaryModelParseFailureReason = "empty_output" | "invalid_shape";

interface ParsedJsonObjectResult {
  kind: "parsed";
  value: PlainObject;
}

interface UnparsedJsonObjectResult {
  kind: "unparsed";
  reason: JsonObjectParseFailureReason;
}

interface FailedCommandProbeResult {
  commandStatus: "failed";
  output: string;
  status: number | null;
}

interface SuccessfulCommandProbeResult {
  commandStatus: "succeeded";
  output: string;
  status: 0;
}

type JsonProbeReport<Parsed extends object> =
  | ({
      reportKind: "parsed";
    } & Parsed)
  | {
      reason: JsonReportParseFailureReason;
      reportKind: "unparsed";
    };

type GatewayRpcProbeReport = JsonProbeReport<{
  rpcOk: boolean;
}>;

type HealthSnapshotProbeReport = JsonProbeReport<{
  ok: boolean;
}>;

type ResolvedPrimaryModelProbeReport =
  | {
      reportKind: "parsed";
      resolvedPrimaryModelRef: string;
    }
  | {
      reason: ResolvedPrimaryModelParseFailureReason;
      reportKind: "unparsed";
    };

export type GatewayRpcProbeResult = (FailedCommandProbeResult | SuccessfulCommandProbeResult) & GatewayRpcProbeReport;

export type HealthSnapshotProbeResult = (FailedCommandProbeResult | SuccessfulCommandProbeResult) & HealthSnapshotProbeReport;

export type ResolvedPrimaryModelProbeResult =
  (FailedCommandProbeResult | SuccessfulCommandProbeResult) & ResolvedPrimaryModelProbeReport;

export interface OpenClawClient {
  ensureInstalled(): void;
  initializeBaseConfig(): void;
  probeGatewayRpc(): GatewayRpcProbeResult;
  probeHealthSnapshot(): HealthSnapshotProbeResult;
  probeResolvedPrimaryModel(): ResolvedPrimaryModelProbeResult;
  validateConfig(filePath: string): void;
}

export type OpenClawClientCommandRunner = (
  command: string,
  args: string[],
  options?: RunOpenClawCommandOptions
) => OpenClawCommandResult;

export interface CreateOpenClawClientOptions {
  env?: NodeJS.ProcessEnv;
  runCommand?: OpenClawClientCommandRunner;
}

export function createOpenClawClient(options: CreateOpenClawClientOptions = {}): OpenClawClient {
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? runOpenClawCommand;

  return {
    ensureInstalled() {
      const commandSpec = OPENCLAW_COMMANDS.ensureInstalled;
      const context = {
        args: commandSpec.args,
        command: OPENCLAW_COMMAND,
        operation: "verify the local OpenClaw install"
      } satisfies OpenClawCommandContext;
      const result = runCommand(OPENCLAW_COMMAND, [...commandSpec.args], {
        stdio: "pipe"
      });

      throwIfCommandErrored(result, context);

      if (result.status !== 0) {
        const output = formatOpenClawCommandOutput(result);
        const outputSuffix = output.length > 0 ? `\n\nOpenClaw output:\n${output}` : "";

        throw new OpenClawCommandExitError(
          context,
          result.status,
          output,
          `Unable to verify the local OpenClaw install. "${commandSpec.description}" exited ${formatCommandExitStatus(result.status)}.${outputSuffix}`
        );
      }
    },

    initializeBaseConfig() {
      const commandSpec = OPENCLAW_COMMANDS.initializeBaseConfig;
      const context = {
        args: commandSpec.args,
        command: OPENCLAW_COMMAND,
        operation: "initialize the local OpenClaw config automatically"
      } satisfies OpenClawCommandContext;
      const result = runCommand(OPENCLAW_COMMAND, [...commandSpec.args], {
        stdio: "inherit"
      });

      throwIfCommandErrored(result, context);

      if (result.status !== 0) {
        throw new OpenClawCommandExitError(
          context,
          result.status,
          formatOpenClawCommandOutput(result),
          `Unable to initialize the local OpenClaw config automatically. "${commandSpec.description}" exited ${formatCommandExitStatus(result.status)}. Update OpenClaw or run "openclaw setup" manually, then rerun this installer.`
        );
      }
    },

    validateConfig(filePath: string) {
      const commandSpec = OPENCLAW_COMMANDS.validateConfig;
      const result = runCommand(OPENCLAW_COMMAND, [...commandSpec.args], {
        env: {
          ...env,
          OPENCLAW_CONFIG_PATH: filePath
        },
        stdio: "pipe"
      });

      throwIfCommandErrored(result, {
        args: commandSpec.args,
        command: OPENCLAW_COMMAND,
        operation: `validate the OpenClaw config at ${filePath}`
      });

      const report = parseValidationReport(result.stdout);

      if (report?.valid === true && result.status === 0) {
        if (validatedRequestedPath(report, filePath)) {
          return;
        }

        throw new OpenClawConfigValidationError({
          filePath,
          kind: "unexpected_validated_path",
          message: formatUnexpectedValidationPathMessage(filePath, report, result),
          output: formatOpenClawCommandOutput(result),
          reportedPath: typeof report.path === "string" ? report.path : undefined,
          status: result.status
        });
      }

      if (report?.valid === false) {
        if (!validatedRequestedPath(report, filePath)) {
          throw new OpenClawConfigValidationError({
            filePath,
            kind: "unexpected_validated_path",
            message: formatUnexpectedValidationPathMessage(filePath, report, result),
            output: formatOpenClawCommandOutput(result),
            reportedPath: report.path,
            status: result.status
          });
        }

        throw new OpenClawConfigValidationError({
          filePath,
          kind: "invalid_config",
          issues: report.issues,
          message: formatInvalidConfigMessage(filePath, report.issues),
          output: formatOpenClawCommandOutput(result),
          reportedPath: report.path,
          status: result.status
        });
      }

      throw new OpenClawConfigValidationError({
        filePath,
        kind: "command_failed",
        message: formatValidationCommandFailure(filePath, result),
        output: formatOpenClawCommandOutput(result),
        reportedPath: report?.path,
        status: result.status
      });
    },

    probeGatewayRpc() {
      const commandSpec = OPENCLAW_COMMANDS.gatewayRpc;
      const result = runCommand(OPENCLAW_COMMAND, [...commandSpec.args], {
        stdio: "pipe"
      });

      throwIfCommandErrored(result, {
        args: commandSpec.args,
        command: OPENCLAW_COMMAND,
        operation: "check the local OpenClaw Gateway RPC"
      });

      const output = formatOpenClawCommandOutput(result);
      const report = parseGatewayStatusReport(result.stdout);

      return result.status === 0
        ? {
            commandStatus: "succeeded",
            output,
            status: 0,
            ...report
          }
        : {
            commandStatus: "failed",
            output,
            status: result.status,
            ...report
          };
    },

    probeHealthSnapshot() {
      const commandSpec = OPENCLAW_COMMANDS.healthSnapshot;
      const result = runCommand(OPENCLAW_COMMAND, [...commandSpec.args], {
        stdio: "pipe"
      });

      throwIfCommandErrored(result, {
        args: commandSpec.args,
        command: OPENCLAW_COMMAND,
        operation: "check the local OpenClaw health snapshot"
      });

      const output = formatOpenClawCommandOutput(result);
      const report = parseHealthReport(result.stdout);

      return result.status === 0
        ? {
            commandStatus: "succeeded",
            output,
            status: 0,
            ...report
          }
        : {
            commandStatus: "failed",
            output,
            status: result.status,
            ...report
          };
    },

    probeResolvedPrimaryModel() {
      const commandSpec = OPENCLAW_COMMANDS.resolvedPrimaryModel;
      const result = runCommand(OPENCLAW_COMMAND, [...commandSpec.args], {
        stdio: "pipe"
      });

      throwIfCommandErrored(result, {
        args: commandSpec.args,
        command: OPENCLAW_COMMAND,
        operation: "confirm the resolved primary model"
      });

      const output = formatOpenClawCommandOutput(result);
      const report = parseResolvedPrimaryModelReport(result.stdout);

      return result.status === 0
        ? {
            commandStatus: "succeeded",
            output,
            status: 0,
            ...report
          }
        : {
            commandStatus: "failed",
            output,
            status: result.status,
            ...report
          };
    }
  };
}

function throwIfCommandErrored(
  result: Pick<OpenClawCommandResult, "error">,
  context: OpenClawCommandContext
): void {
  throwIfOpenClawCommandErrored(result, context);
}

export function ensureOpenClawInstalled(
  runCommand: OpenClawClientCommandRunner = runOpenClawCommand
): void {
  createOpenClawClient({ runCommand }).ensureInstalled();
}

export function initializeOpenClawBaseConfig(
  runCommand: OpenClawClientCommandRunner = runOpenClawCommand
): void {
  createOpenClawClient({ runCommand }).initializeBaseConfig();
}

export function validateOpenClawConfig(
  filePath: string,
  runCommand: OpenClawClientCommandRunner = runOpenClawCommand
): void {
  createOpenClawClient({ runCommand }).validateConfig(filePath);
}

function parseValidationReport(stdout: string): OpenClawValidationReport | undefined {
  const parsed = parseJsonObject(stdout);

  if (parsed.kind !== "parsed") {
    return undefined;
  }

  return {
    issues: parseValidationIssues(parsed.value.issues),
    path: typeof parsed.value.path === "string" ? parsed.value.path : undefined,
    valid: typeof parsed.value.valid === "boolean" ? parsed.value.valid : undefined
  };
}

function formatInvalidConfigMessage(filePath: string, issues: readonly OpenClawValidationIssueSummary[] | undefined): string {
  const formattedIssues = (issues ?? []).map(formatValidationIssue).filter((issue) => issue.length > 0);

  if (formattedIssues.length === 0) {
    return `OpenClaw rejected the config at ${filePath}, but did not return structured validation issues.`;
  }

  return `OpenClaw rejected the config at ${filePath}:\n${formattedIssues.map((issue) => `- ${issue}`).join("\n")}`;
}

function formatValidationIssue(issue: OpenClawValidationIssueSummary): string {
  const message = typeof issue.message === "string" && issue.message.trim().length > 0
    ? issue.message.trim()
    : "Invalid configuration value.";
  const fieldPath = typeof issue.path === "string" && issue.path.trim().length > 0
    ? issue.path.trim()
    : undefined;

  return fieldPath ? `${fieldPath}: ${message}` : message;
}

function formatValidationCommandFailure(filePath: string, result: OpenClawCommandResult): string {
  const output = formatOpenClawCommandOutput(result);
  const outputSuffix = output.length > 0 ? `\n\nOpenClaw output:\n${output}` : "";

  return (
    `Unable to validate the OpenClaw config at ${filePath} with "${OPENCLAW_COMMANDS.validateConfig.description}". ` +
    `The local OpenClaw CLI did not return a supported validation result.${outputSuffix}`
  );
}

function validatedRequestedPath(report: OpenClawValidationReport, filePath: string): boolean {
  const reportedPath = typeof report.path === "string" ? report.path.trim() : "";

  return reportedPath.length > 0 && path.resolve(reportedPath) === path.resolve(filePath);
}

function formatUnexpectedValidationPathMessage(
  filePath: string,
  report: OpenClawValidationReport,
  result: OpenClawCommandResult
): string {
  const reportedPath = typeof report.path === "string" && report.path.trim().length > 0
    ? `"${report.path.trim()}"`
    : "no validated path";
  const output = formatOpenClawCommandOutput(result);
  const outputSuffix = output.length > 0 ? `\n\nOpenClaw output:\n${output}` : "";

  return (
    `OpenClaw reported a successful validation result for ${filePath}, but confirmed ${reportedPath} instead.${outputSuffix}`
  );
}

function parseValidationIssues(value: unknown): OpenClawValidationIssueSummary[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map(parseValidationIssue)
    .filter((issue): issue is OpenClawValidationIssueSummary => issue !== undefined);
}

function parseValidationIssue(value: unknown): OpenClawValidationIssueSummary | undefined {
  const issue = asPlainObject(value);

  if (!issue) {
    return undefined;
  }

  return {
    message: typeof issue.message === "string" ? issue.message : undefined,
    path: typeof issue.path === "string" ? issue.path : undefined
  };
}

function parseGatewayStatusReport(stdout: string):
  | {
      reportKind: "parsed";
      rpcOk: boolean;
    }
  | {
      reason: JsonReportParseFailureReason;
      reportKind: "unparsed";
    } {
  const parsed = parseJsonObject(stdout);

  if (parsed.kind !== "parsed") {
    return {
      reportKind: "unparsed",
      reason: parsed.reason
    };
  }

  const rpc = asPlainObject(parsed.value.rpc);

  if (!rpc || typeof rpc.ok !== "boolean") {
    return {
      reportKind: "unparsed",
      reason: "invalid_shape"
    };
  }

  return {
    reportKind: "parsed",
    rpcOk: rpc.ok
  };
}

function parseHealthReport(stdout: string):
  | {
      ok: boolean;
      reportKind: "parsed";
    }
  | {
      reason: JsonReportParseFailureReason;
      reportKind: "unparsed";
    } {
  const parsed = parseJsonObject(stdout);

  if (parsed.kind !== "parsed") {
    return {
      reportKind: "unparsed",
      reason: parsed.reason
    };
  }

  return typeof parsed.value.ok === "boolean"
    ? {
        ok: parsed.value.ok,
        reportKind: "parsed"
      }
    : {
        reportKind: "unparsed",
        reason: "invalid_shape"
      };
}

function parseResolvedPrimaryModelReport(stdout: string):
  | {
      reportKind: "parsed";
      resolvedPrimaryModelRef: string;
    }
  | {
      reason: ResolvedPrimaryModelParseFailureReason;
      reportKind: "unparsed";
    } {
  const trimmed = stdout.trim();

  if (trimmed.length === 0) {
    return {
      reportKind: "unparsed",
      reason: "empty_output"
    };
  }

  const lines = trimmed
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length !== 1 || /\s/u.test(lines[0])) {
    return {
      reportKind: "unparsed",
      reason: "invalid_shape"
    };
  }

  return {
    reportKind: "parsed",
    resolvedPrimaryModelRef: lines[0]
  };
}

function parseJsonObject(stdout: string): ParsedJsonObjectResult | UnparsedJsonObjectResult {
  const trimmed = stdout.trim();

  if (trimmed.length === 0) {
    return {
      kind: "unparsed",
      reason: "empty_output"
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    const objectValue = asPlainObject(parsed);

    return objectValue
      ? {
          kind: "parsed",
          value: objectValue
        }
      : {
          kind: "unparsed",
          reason: "non_object"
        };
  } catch {
    return {
      kind: "unparsed",
      reason: "invalid_json"
    };
  }
}
