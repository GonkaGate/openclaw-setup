import { spawnSync } from "node:child_process";

interface OpenClawHealthReport {
  ok?: boolean;
}

export interface RuntimeCommandResult {
  error?: NodeJS.ErrnoException;
  status: number | null;
  stderr: string;
  stdout: string;
}

export type RuntimeCommandRunner = (command: string, args: string[]) => RuntimeCommandResult;

export type RuntimeVerificationFailureKind =
  | "gateway_unavailable"
  | "runtime_unhealthy"
  | "model_resolution_failed";

export interface VerifyRuntimeResult {
  resolvedPrimaryModelRef: string;
}

export class OpenClawRuntimeVerificationError extends Error {
  readonly kind: RuntimeVerificationFailureKind;

  constructor(kind: RuntimeVerificationFailureKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "OpenClawRuntimeVerificationError";
  }
}

export function verifyOpenClawRuntime(
  filePath: string,
  expectedPrimaryModelRef: string,
  runCommand: RuntimeCommandRunner = runRuntimeCommand
): VerifyRuntimeResult {
  const verifyCommand = 'npx @gonkagate/openclaw verify';

  const gatewayStatusResult = runCommand("openclaw", ["gateway", "status", "--require-rpc", "--json"]);
  ensureCommandSucceeded(
    gatewayStatusResult,
    "gateway_unavailable",
    'Unable to confirm that the local OpenClaw Gateway RPC is healthy through "openclaw gateway status --require-rpc --json". ' +
      `Start OpenClaw normally, then rerun "${verifyCommand}".`
  );

  const healthResult = runCommand("openclaw", ["health", "--json"]);
  ensureCommandSucceeded(
    healthResult,
    "runtime_unhealthy",
    `Unable to confirm OpenClaw health through "openclaw health --json". Rerun "${verifyCommand}" after the Gateway is healthy.`
  );

  const healthReport = parseHealthReport(healthResult.stdout);

  if (healthReport?.ok !== true) {
    throw new OpenClawRuntimeVerificationError(
      "runtime_unhealthy",
      formatCommandFailure(
        `OpenClaw reported an unhealthy runtime through "openclaw health --json". Rerun "${verifyCommand}" after the Gateway is healthy.`,
        healthResult
      )
    );
  }

  const modelsStatusResult = runCommand("openclaw", ["models", "status", "--plain"]);
  ensureCommandSucceeded(
    modelsStatusResult,
    "model_resolution_failed",
    `Unable to confirm the resolved primary model through "openclaw models status --plain". Rerun "${verifyCommand}" after OpenClaw finishes loading the config.`
  );

  const resolvedPrimaryModelRef = modelsStatusResult.stdout.trim();

  if (resolvedPrimaryModelRef.length === 0) {
    throw new OpenClawRuntimeVerificationError(
      "model_resolution_failed",
      formatCommandFailure(
        'OpenClaw returned an empty response for "openclaw models status --plain".',
        modelsStatusResult
      )
    );
  }

  if (resolvedPrimaryModelRef !== expectedPrimaryModelRef) {
    throw new OpenClawRuntimeVerificationError(
      "model_resolution_failed",
      `OpenClaw resolved primary model "${resolvedPrimaryModelRef}" through "openclaw models status --plain", ` +
      `but ${filePath} expects "${expectedPrimaryModelRef}".`
    );
  }

  return {
    resolvedPrimaryModelRef
  };
}

function runRuntimeCommand(command: string, args: string[]): RuntimeCommandResult {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe"
  });

  return {
    error: result.error ?? undefined,
    status: result.status,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? ""
  };
}

function ensureCommandSucceeded(
  result: RuntimeCommandResult,
  kind: RuntimeVerificationFailureKind,
  baseMessage: string
): void {
  if (result.error?.code === "ENOENT") {
    throw new Error("OpenClaw CLI was not found in PATH. Install OpenClaw first, then rerun this installer.");
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status === 0) {
    return;
  }

  throw new OpenClawRuntimeVerificationError(kind, formatCommandFailure(baseMessage, result));
}

function parseHealthReport(stdout: string): OpenClawHealthReport | undefined {
  const trimmed = stdout.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as OpenClawHealthReport;
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function formatCommandFailure(baseMessage: string, result: RuntimeCommandResult): string {
  const output = [result.stdout.trim(), result.stderr.trim()].filter((chunk) => chunk.length > 0).join("\n");
  const outputSuffix = output.length > 0 ? `\n\nOpenClaw output:\n${output}` : "";

  return `${baseMessage}${outputSuffix}`;
}
