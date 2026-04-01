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

const NEXT_GATEWAY_COMMAND = "openclaw gateway" as const;
const VERIFY_COMMAND = "npx @gonkagate/openclaw verify";

const RUNTIME_STATUS = {
  healthy: "healthy",
  gatewayUnavailable: "gateway_unavailable",
  runtimeUnhealthy: "runtime_unhealthy",
  modelResolutionFailed: "model_resolution_failed"
} as const;

interface HealthyRuntimeVerificationResult {
  resolvedPrimaryModelRef: string;
  status: typeof RUNTIME_STATUS.healthy;
}

interface GatewayUnavailableInstallRuntimeResult {
  nextCommand: typeof NEXT_GATEWAY_COMMAND;
  status: typeof RUNTIME_STATUS.gatewayUnavailable;
}

export type RuntimeVerificationFailureKind =
  | typeof RUNTIME_STATUS.gatewayUnavailable
  | typeof RUNTIME_STATUS.runtimeUnhealthy
  | typeof RUNTIME_STATUS.modelResolutionFailed;

interface FailedRuntimeVerificationResult {
  message: string;
  status: RuntimeVerificationFailureKind;
}

export type RuntimeCommandResult = OpenClawCommandResult;
export type RuntimeCommandRunner = (command: string, args: string[]) => RuntimeCommandResult;
export type VerifyRuntimeResult = HealthyRuntimeVerificationResult | FailedRuntimeVerificationResult;
export type InstallRuntimeCheckResult = HealthyRuntimeVerificationResult | GatewayUnavailableInstallRuntimeResult;

export function verifyOpenClawRuntime(
  filePath: string,
  expectedPrimaryModelRef: string,
  runCommand: RuntimeCommandRunner = runRuntimeCommand
): VerifyRuntimeResult {
  const gatewayFailure = verifyGatewayRpc(runCommand);

  if (gatewayFailure) {
    return gatewayFailure;
  }

  const healthFailure = verifyHealthSnapshot(runCommand);

  if (healthFailure) {
    return healthFailure;
  }

  return verifyResolvedPrimaryModel(filePath, expectedPrimaryModelRef, runCommand);
}

export function resolveInstallRuntime(result: VerifyRuntimeResult): InstallRuntimeCheckResult {
  if (result.status === RUNTIME_STATUS.healthy) {
    return result;
  }

  if (result.status === RUNTIME_STATUS.gatewayUnavailable) {
    return createGatewayUnavailableInstallResult();
  }

  throw new Error(result.message);
}

export function requireHealthyRuntime(result: VerifyRuntimeResult): HealthyRuntimeVerificationResult {
  if (result.status !== RUNTIME_STATUS.healthy) {
    throw new Error(result.message);
  }

  return result;
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

  return createFailedRuntimeResult(kind, formatCommandFailure(baseMessage, result));
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

function verifyGatewayRpc(runCommand: RuntimeCommandRunner): FailedRuntimeVerificationResult | undefined {
  const gatewayStatusResult = runCommand("openclaw", ["gateway", "status", "--require-rpc", "--json"]);

  return getCommandFailure(
    gatewayStatusResult,
    RUNTIME_STATUS.gatewayUnavailable,
    'Unable to confirm that the local OpenClaw Gateway RPC is healthy through "openclaw gateway status --require-rpc --json". ' +
      `Start OpenClaw normally, then rerun "${VERIFY_COMMAND}".`
  );
}

function verifyHealthSnapshot(runCommand: RuntimeCommandRunner): FailedRuntimeVerificationResult | undefined {
  const healthResult = runCommand("openclaw", ["health", "--json"]);
  const commandFailure = getCommandFailure(
    healthResult,
    RUNTIME_STATUS.runtimeUnhealthy,
    `Unable to confirm OpenClaw health through "openclaw health --json". Rerun "${VERIFY_COMMAND}" after the Gateway is healthy.`
  );

  if (commandFailure) {
    return commandFailure;
  }

  const healthReport = parseHealthReport(healthResult.stdout);

  if (healthReport?.ok === true) {
    return undefined;
  }

  return createFailedRuntimeResult(
    RUNTIME_STATUS.runtimeUnhealthy,
    formatCommandFailure(
      `OpenClaw reported an unhealthy runtime through "openclaw health --json". Rerun "${VERIFY_COMMAND}" after the Gateway is healthy.`,
      healthResult
    )
  );
}

function verifyResolvedPrimaryModel(
  filePath: string,
  expectedPrimaryModelRef: string,
  runCommand: RuntimeCommandRunner
): VerifyRuntimeResult {
  const modelsStatusResult = runCommand("openclaw", ["models", "status", "--plain"]);
  const commandFailure = getCommandFailure(
    modelsStatusResult,
    RUNTIME_STATUS.modelResolutionFailed,
    `Unable to confirm the resolved primary model through "openclaw models status --plain". Rerun "${VERIFY_COMMAND}" after OpenClaw finishes loading the config.`
  );

  if (commandFailure) {
    return commandFailure;
  }

  const resolvedPrimaryModelRef = modelsStatusResult.stdout.trim();

  if (resolvedPrimaryModelRef.length === 0) {
    return createFailedRuntimeResult(
      RUNTIME_STATUS.modelResolutionFailed,
      formatCommandFailure('OpenClaw returned an empty response for "openclaw models status --plain".', modelsStatusResult)
    );
  }

  if (resolvedPrimaryModelRef !== expectedPrimaryModelRef) {
    return createFailedRuntimeResult(
      RUNTIME_STATUS.modelResolutionFailed,
      `OpenClaw resolved primary model "${resolvedPrimaryModelRef}" through "openclaw models status --plain", ` +
        `but ${filePath} expects "${expectedPrimaryModelRef}".`
    );
  }

  return createHealthyRuntimeResult(resolvedPrimaryModelRef);
}

function createHealthyRuntimeResult(resolvedPrimaryModelRef: string): HealthyRuntimeVerificationResult {
  return {
    resolvedPrimaryModelRef,
    status: RUNTIME_STATUS.healthy
  };
}

function createGatewayUnavailableInstallResult(): GatewayUnavailableInstallRuntimeResult {
  return {
    nextCommand: NEXT_GATEWAY_COMMAND,
    status: RUNTIME_STATUS.gatewayUnavailable
  };
}

function createFailedRuntimeResult(
  status: RuntimeVerificationFailureKind,
  message: string
): FailedRuntimeVerificationResult {
  return {
    message,
    status
  };
}
