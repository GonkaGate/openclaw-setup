import path from "node:path";
import process from "node:process";
import {
  formatOpenClawCommandOutput,
  runOpenClawCommand,
  throwIfOpenClawCommandErrored,
  type OpenClawCommandResult,
  type RunOpenClawCommandOptions
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

type JsonObjectParseFailureReason = "empty_output" | "invalid_json" | "non_object";
type JsonReportParseFailureReason = JsonObjectParseFailureReason | "invalid_shape";

interface ParsedJsonObjectResult {
  kind: "parsed";
  value: PlainObject;
}

interface UnparsedJsonObjectResult {
  kind: "unparsed";
  reason: JsonObjectParseFailureReason;
}

interface ParsedGatewayRpcProbeResult {
  output: string;
  reportKind: "parsed";
  rpcOk: boolean;
  status: number | null;
}

interface ParsedHealthSnapshotProbeResult {
  ok: boolean;
  output: string;
  reportKind: "parsed";
  status: number | null;
}

interface UnparsedJsonProbeResult {
  output: string;
  reason: JsonReportParseFailureReason;
  reportKind: "unparsed";
  status: number | null;
}

export type GatewayRpcProbeResult = ParsedGatewayRpcProbeResult | UnparsedJsonProbeResult;

export type HealthSnapshotProbeResult = ParsedHealthSnapshotProbeResult | UnparsedJsonProbeResult;

export interface ResolvedPrimaryModelProbeResult {
  output: string;
  resolvedPrimaryModelRef?: string;
  status: number | null;
}

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

const OPENCLAW_NOT_FOUND_MESSAGE =
  "OpenClaw CLI was not found in PATH. Install OpenClaw first, then rerun this installer.";

export function createOpenClawClient(options: CreateOpenClawClientOptions = {}): OpenClawClient {
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? runOpenClawCommand;

  return {
    ensureInstalled() {
      const result = runCommand("openclaw", ["--version"], {
        stdio: "ignore"
      });

      throwIfCommandErrored(result);

      if (result.status !== 0) {
        throw new Error(`Unable to verify the local OpenClaw install. "openclaw --version" exited with code ${result.status}.`);
      }
    },

    initializeBaseConfig() {
      const result = runCommand("openclaw", ["setup"], {
        stdio: "inherit"
      });

      throwIfCommandErrored(result);

      if (result.status !== 0) {
        throw new Error(
          `Unable to initialize the local OpenClaw config automatically. "openclaw setup" exited with code ${result.status}. Update OpenClaw or run "openclaw setup" manually, then rerun this installer.`
        );
      }
    },

    validateConfig(filePath: string) {
      const result = runCommand("openclaw", ["config", "validate", "--json"], {
        env: {
          ...env,
          OPENCLAW_CONFIG_PATH: filePath
        },
        stdio: "pipe"
      });

      throwIfCommandErrored(result);

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
    },

    probeGatewayRpc() {
      const result = runCommand("openclaw", ["gateway", "status", "--require-rpc", "--json"], {
        stdio: "pipe"
      });

      throwIfCommandErrored(result);

      const report = parseGatewayStatusReport(result.stdout);

      return report.kind === "parsed"
        ? {
            output: formatOpenClawCommandOutput(result),
            reportKind: "parsed",
            rpcOk: report.rpcOk,
            status: result.status
          }
        : {
            output: formatOpenClawCommandOutput(result),
            reason: report.reason,
            reportKind: "unparsed",
            status: result.status
          };
    },

    probeHealthSnapshot() {
      const result = runCommand("openclaw", ["health", "--json"], {
        stdio: "pipe"
      });

      throwIfCommandErrored(result);

      const report = parseHealthReport(result.stdout);

      return report.kind === "parsed"
        ? {
            ok: report.ok,
            output: formatOpenClawCommandOutput(result),
            reportKind: "parsed",
            status: result.status
          }
        : {
            output: formatOpenClawCommandOutput(result),
            reason: report.reason,
            reportKind: "unparsed",
            status: result.status
          };
    },

    probeResolvedPrimaryModel() {
      const result = runCommand("openclaw", ["models", "status", "--plain"], {
        stdio: "pipe"
      });

      throwIfCommandErrored(result);

      const resolvedPrimaryModelRef = result.stdout.trim();

      return {
        output: formatOpenClawCommandOutput(result),
        resolvedPrimaryModelRef: resolvedPrimaryModelRef.length > 0 ? resolvedPrimaryModelRef : undefined,
        status: result.status
      };
    }
  };
}

function throwIfCommandErrored(result: Pick<OpenClawCommandResult, "error">): void {
  if (result.error?.code === "ENOENT") {
    throw new Error(OPENCLAW_NOT_FOUND_MESSAGE);
  }

  throwIfOpenClawCommandErrored(result);
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

function formatInvalidConfigMessage(filePath: string, issues: readonly OpenClawValidationIssue[] | undefined): string {
  const formattedIssues = (issues ?? []).map(formatValidationIssue).filter((issue) => issue.length > 0);

  if (formattedIssues.length === 0) {
    return `OpenClaw rejected the config at ${filePath}, but did not return structured validation issues.`;
  }

  return `OpenClaw rejected the config at ${filePath}:\n${formattedIssues.map((issue) => `- ${issue}`).join("\n")}`;
}

function formatValidationIssue(issue: OpenClawValidationIssue): string {
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
  result: OpenClawCommandResult
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

function parseGatewayStatusReport(stdout: string):
  | {
      kind: "parsed";
      rpcOk: boolean;
    }
  | {
      kind: "unparsed";
      reason: JsonReportParseFailureReason;
    } {
  const parsed = parseJsonObject(stdout);

  if (parsed.kind !== "parsed") {
    return {
      kind: "unparsed",
      reason: parsed.reason
    };
  }

  const rpc = asPlainObject(parsed.value.rpc);

  if (!rpc || typeof rpc.ok !== "boolean") {
    return {
      kind: "unparsed",
      reason: "invalid_shape"
    };
  }

  return {
    kind: "parsed",
    rpcOk: rpc.ok
  };
}

function parseHealthReport(stdout: string):
  | {
      kind: "parsed";
      ok: boolean;
    }
  | {
      kind: "unparsed";
      reason: JsonReportParseFailureReason;
    } {
  const parsed = parseJsonObject(stdout);

  if (parsed.kind !== "parsed") {
    return {
      kind: "unparsed",
      reason: parsed.reason
    };
  }

  return typeof parsed.value.ok === "boolean"
    ? {
        kind: "parsed",
        ok: parsed.value.ok
      }
    : {
        kind: "unparsed",
        reason: "invalid_shape"
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
