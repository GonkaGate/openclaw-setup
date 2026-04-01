import { spawnSync } from "node:child_process";
import {
  formatOpenClawCommandOutput,
  normalizeOpenClawCommandResult,
  throwIfOpenClawCommandErrored,
  type OpenClawCommandResult
} from "./openclaw-command.js";

interface OpenClawHealthReport {
  ok?: boolean;
}

interface HealthyRuntimeVerificationResult {
  resolvedPrimaryModelRef: string;
  status: "healthy";
}

export type RuntimeVerificationFailureKind =
  | "gateway_unavailable"
  | "runtime_unhealthy"
  | "model_resolution_failed";

interface FailedRuntimeVerificationResult {
  message: string;
  status: RuntimeVerificationFailureKind;
}

export type RuntimeCommandResult = OpenClawCommandResult;
export type RuntimeCommandRunner = (command: string, args: string[]) => RuntimeCommandResult;
export type VerifyRuntimeResult = HealthyRuntimeVerificationResult | FailedRuntimeVerificationResult;

export function verifyOpenClawRuntime(
  filePath: string,
  expectedPrimaryModelRef: string,
  runCommand: RuntimeCommandRunner = runRuntimeCommand
): VerifyRuntimeResult {
  const verifyCommand = 'npx @gonkagate/openclaw verify';

  const gatewayStatusResult = runCommand("openclaw", ["gateway", "status", "--require-rpc", "--json"]);
  const gatewayFailure = getCommandFailure(
    gatewayStatusResult,
    "gateway_unavailable",
    'Unable to confirm that the local OpenClaw Gateway RPC is healthy through "openclaw gateway status --require-rpc --json". ' +
      `Start OpenClaw normally, then rerun "${verifyCommand}".`
  );

  if (gatewayFailure) {
    return gatewayFailure;
  }

  const healthResult = runCommand("openclaw", ["health", "--json"]);
  const healthFailure = getCommandFailure(
    healthResult,
    "runtime_unhealthy",
    `Unable to confirm OpenClaw health through "openclaw health --json". Rerun "${verifyCommand}" after the Gateway is healthy.`
  );

  if (healthFailure) {
    return healthFailure;
  }

  const healthReport = parseHealthReport(healthResult.stdout);

  if (healthReport?.ok !== true) {
    return {
      message: formatCommandFailure(
        `OpenClaw reported an unhealthy runtime through "openclaw health --json". Rerun "${verifyCommand}" after the Gateway is healthy.`,
        healthResult
      ),
      status: "runtime_unhealthy"
    };
  }

  const modelsStatusResult = runCommand("openclaw", ["models", "status", "--plain"]);
  const modelFailure = getCommandFailure(
    modelsStatusResult,
    "model_resolution_failed",
    `Unable to confirm the resolved primary model through "openclaw models status --plain". Rerun "${verifyCommand}" after OpenClaw finishes loading the config.`
  );

  if (modelFailure) {
    return modelFailure;
  }

  const resolvedPrimaryModelRef = modelsStatusResult.stdout.trim();

  if (resolvedPrimaryModelRef.length === 0) {
    return {
      message: formatCommandFailure(
        'OpenClaw returned an empty response for "openclaw models status --plain".',
        modelsStatusResult
      ),
      status: "model_resolution_failed"
    };
  }

  if (resolvedPrimaryModelRef !== expectedPrimaryModelRef) {
    return {
      message:
        `OpenClaw resolved primary model "${resolvedPrimaryModelRef}" through "openclaw models status --plain", ` +
        `but ${filePath} expects "${expectedPrimaryModelRef}".`,
      status: "model_resolution_failed"
    };
  }

  return {
    resolvedPrimaryModelRef,
    status: "healthy"
  };
}

function runRuntimeCommand(command: string, args: string[]): RuntimeCommandResult {
  return normalizeOpenClawCommandResult(spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe"
  }));
}

function getCommandFailure(
  result: RuntimeCommandResult,
  kind: RuntimeVerificationFailureKind,
  baseMessage: string
): FailedRuntimeVerificationResult | undefined {
  throwIfOpenClawCommandErrored(result);

  if (result.status === 0) {
    return undefined;
  }

  return {
    message: formatCommandFailure(baseMessage, result),
    status: kind
  };
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
  const output = formatOpenClawCommandOutput(result);
  const outputSuffix = output.length > 0 ? `\n\nOpenClaw output:\n${output}` : "";

  return `${baseMessage}${outputSuffix}`;
}
