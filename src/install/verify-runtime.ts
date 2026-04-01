import {
  formatOpenClawCommandOutput,
  runOpenClawCommand,
  throwIfOpenClawCommandErrored,
  type OpenClawCommandResult
} from "./openclaw-command.js";
import { asPlainObject, type PlainObject } from "./object-utils.js";

interface OpenClawGatewayStatusReport {
  rpc?: {
    ok?: boolean;
  };
}

interface OpenClawHealthReport {
  ok?: boolean;
}

const NEXT_GATEWAY_COMMAND = "openclaw gateway" as const;
const VERIFY_COMMAND = "npx @gonkagate/openclaw verify";

const RUNTIME_KIND = {
  healthy: "healthy",
  gatewayUnavailable: "gateway_unavailable",
  runtimeUnhealthy: "runtime_unhealthy",
  modelResolutionFailed: "model_resolution_failed"
} as const;

interface HealthyRuntimeVerificationResult {
  kind: typeof RUNTIME_KIND.healthy;
  resolvedPrimaryModelRef: string;
}

interface GatewayUnavailableInstallRuntimeResult {
  kind: typeof RUNTIME_KIND.gatewayUnavailable;
  nextCommand: typeof NEXT_GATEWAY_COMMAND;
}

export type RuntimeVerificationFailureKind =
  | typeof RUNTIME_KIND.gatewayUnavailable
  | typeof RUNTIME_KIND.runtimeUnhealthy
  | typeof RUNTIME_KIND.modelResolutionFailed;

interface FailedRuntimeVerificationResult {
  kind: RuntimeVerificationFailureKind;
  message: string;
}

export type RuntimeCommandResult = OpenClawCommandResult;
export type RuntimeCommandRunner = (command: string, args: string[]) => RuntimeCommandResult;
export type VerifyRuntimeResult = HealthyRuntimeVerificationResult | FailedRuntimeVerificationResult;
export type InstallRuntimeCheckResult = HealthyRuntimeVerificationResult | GatewayUnavailableInstallRuntimeResult;

export function verifyOpenClawRuntime(
  filePath: string,
  expectedPrimaryModelRef: string,
  runCommand: RuntimeCommandRunner = runOpenClawCommand
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

export function verifyOpenClawRuntimeForInstall(
  filePath: string,
  expectedPrimaryModelRef: string,
  runCommand: RuntimeCommandRunner = runOpenClawCommand
): InstallRuntimeCheckResult {
  const result = verifyOpenClawRuntime(filePath, expectedPrimaryModelRef, runCommand);

  if (result.kind === RUNTIME_KIND.healthy) {
    return result;
  }

  if (result.kind === RUNTIME_KIND.gatewayUnavailable) {
    return createGatewayUnavailableInstallResult();
  }

  throw new Error(result.message);
}

export function verifyOpenClawRuntimeForVerify(
  filePath: string,
  expectedPrimaryModelRef: string,
  runCommand: RuntimeCommandRunner = runOpenClawCommand
): HealthyRuntimeVerificationResult {
  const result = verifyOpenClawRuntime(filePath, expectedPrimaryModelRef, runCommand);

  if (result.kind !== RUNTIME_KIND.healthy) {
    throw new Error(result.message);
  }

  return result;
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
  const parsed = parseJsonObject(stdout);

  if (!parsed) {
    return undefined;
  }

  return typeof parsed.ok === "boolean"
    ? { ok: parsed.ok }
    : {};
}

function formatCommandFailure(baseMessage: string, result: RuntimeCommandResult): string {
  const output = formatOpenClawCommandOutput(result);
  const outputSuffix = output.length > 0 ? `\n\nOpenClaw output:\n${output}` : "";

  return `${baseMessage}${outputSuffix}`;
}

function verifyGatewayRpc(runCommand: RuntimeCommandRunner): FailedRuntimeVerificationResult | undefined {
  const gatewayStatusResult = runCommand("openclaw", ["gateway", "status", "--require-rpc", "--json"]);

  const commandFailure = getCommandFailure(
    gatewayStatusResult,
    RUNTIME_KIND.gatewayUnavailable,
    'Unable to confirm that the local OpenClaw Gateway RPC is healthy through "openclaw gateway status --require-rpc --json". ' +
      `Start OpenClaw normally, then rerun "${VERIFY_COMMAND}".`
  );

  if (commandFailure) {
    return commandFailure;
  }

  const gatewayStatusReport = parseGatewayStatusReport(gatewayStatusResult.stdout);

  if (gatewayStatusReport?.rpc?.ok === true) {
    return undefined;
  }

  return createFailedRuntimeResult(
    RUNTIME_KIND.gatewayUnavailable,
    formatCommandFailure(
      'OpenClaw did not report a healthy Gateway RPC through "openclaw gateway status --require-rpc --json". ' +
        `Start OpenClaw normally, then rerun "${VERIFY_COMMAND}".`,
      gatewayStatusResult
    )
  );
}

function verifyHealthSnapshot(runCommand: RuntimeCommandRunner): FailedRuntimeVerificationResult | undefined {
  const healthResult = runCommand("openclaw", ["health", "--json"]);
  const commandFailure = getCommandFailure(
    healthResult,
    RUNTIME_KIND.runtimeUnhealthy,
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
    RUNTIME_KIND.runtimeUnhealthy,
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
    RUNTIME_KIND.modelResolutionFailed,
    `Unable to confirm the resolved primary model through "openclaw models status --plain". Rerun "${VERIFY_COMMAND}" after OpenClaw finishes loading the config.`
  );

  if (commandFailure) {
    return commandFailure;
  }

  const resolvedPrimaryModelRef = modelsStatusResult.stdout.trim();

  if (resolvedPrimaryModelRef.length === 0) {
    return createFailedRuntimeResult(
      RUNTIME_KIND.modelResolutionFailed,
      formatCommandFailure('OpenClaw returned an empty response for "openclaw models status --plain".', modelsStatusResult)
    );
  }

  if (resolvedPrimaryModelRef !== expectedPrimaryModelRef) {
    return createFailedRuntimeResult(
      RUNTIME_KIND.modelResolutionFailed,
      `OpenClaw resolved primary model "${resolvedPrimaryModelRef}" through "openclaw models status --plain", ` +
        `but ${filePath} expects "${expectedPrimaryModelRef}".`
    );
  }

  return createHealthyRuntimeResult(resolvedPrimaryModelRef);
}

function createHealthyRuntimeResult(resolvedPrimaryModelRef: string): HealthyRuntimeVerificationResult {
  return {
    kind: RUNTIME_KIND.healthy,
    resolvedPrimaryModelRef
  };
}

function createGatewayUnavailableInstallResult(): GatewayUnavailableInstallRuntimeResult {
  return {
    kind: RUNTIME_KIND.gatewayUnavailable,
    nextCommand: NEXT_GATEWAY_COMMAND
  };
}

function createFailedRuntimeResult(
  kind: RuntimeVerificationFailureKind,
  message: string
): FailedRuntimeVerificationResult {
  return {
    kind,
    message
  };
}

function parseGatewayStatusReport(stdout: string): OpenClawGatewayStatusReport | undefined {
  const parsed = parseJsonObject(stdout);

  if (!parsed) {
    return undefined;
  }

  const rpc = asPlainObject(parsed.rpc);

  if (!rpc) {
    return {};
  }

  return {
    rpc: {
      ok: typeof rpc.ok === "boolean" ? rpc.ok : undefined
    }
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
