import {
  createOpenClawClient,
  type GatewayRpcProbeResult,
  type HealthSnapshotProbeResult,
  type OpenClawClient,
  type OpenClawClientCommandRunner,
  type ResolvedPrimaryModelProbeResult
} from "./openclaw-client.js";
import { runOpenClawCommand } from "./openclaw-command.js";

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

type RuntimeProbeResult = GatewayRpcProbeResult | HealthSnapshotProbeResult | ResolvedPrimaryModelProbeResult;
type RuntimeProbeClient = Pick<OpenClawClient, "probeGatewayRpc" | "probeHealthSnapshot" | "probeResolvedPrimaryModel">;

interface RuntimeStep<Result extends RuntimeProbeResult> {
  commandFailureKind: RuntimeVerificationFailureKind;
  commandFailureMessage: string;
  probe: () => Result;
  validate: (result: Result) => FailedRuntimeVerificationResult | undefined;
}

export type RuntimeCommandRunner = OpenClawClientCommandRunner;
export type VerifyRuntimeResult = HealthyRuntimeVerificationResult | FailedRuntimeVerificationResult;
export type InstallRuntimeCheckResult = HealthyRuntimeVerificationResult | GatewayUnavailableInstallRuntimeResult;

export function verifyOpenClawRuntime(
  filePath: string,
  expectedPrimaryModelRef: string,
  runCommand: RuntimeCommandRunner = runOpenClawCommand
): VerifyRuntimeResult {
  const openClawClient: RuntimeProbeClient = createOpenClawClient({ runCommand });

  const gatewayResult = runRuntimeStep({
    commandFailureKind: RUNTIME_KIND.gatewayUnavailable,
    commandFailureMessage:
      'Unable to confirm that the local OpenClaw Gateway RPC is healthy through "openclaw gateway status --require-rpc --json". ' +
      `Start OpenClaw normally, then rerun "${VERIFY_COMMAND}".`,
    probe: () => openClawClient.probeGatewayRpc(),
    validate: (result) => {
      if (result.rpcOk === true) {
        return undefined;
      }

      return createFailedRuntimeResult(
        RUNTIME_KIND.gatewayUnavailable,
        formatCommandFailure(
          'OpenClaw did not report a healthy Gateway RPC through "openclaw gateway status --require-rpc --json". ' +
            `Start OpenClaw normally, then rerun "${VERIFY_COMMAND}".`,
          result
        )
      );
    }
  });

  if (isRuntimeFailure(gatewayResult)) {
    return gatewayResult;
  }

  const healthResult = runRuntimeStep({
    commandFailureKind: RUNTIME_KIND.runtimeUnhealthy,
    commandFailureMessage:
      `Unable to confirm OpenClaw health through "openclaw health --json". Rerun "${VERIFY_COMMAND}" after the Gateway is healthy.`,
    probe: () => openClawClient.probeHealthSnapshot(),
    validate: (result) => {
      if (result.ok === true) {
        return undefined;
      }

      return createFailedRuntimeResult(
        RUNTIME_KIND.runtimeUnhealthy,
        formatCommandFailure(
          `OpenClaw reported an unhealthy runtime through "openclaw health --json". Rerun "${VERIFY_COMMAND}" after the Gateway is healthy.`,
          result
        )
      );
    }
  });

  if (isRuntimeFailure(healthResult)) {
    return healthResult;
  }

  const resolvedModelResult = runRuntimeStep({
    commandFailureKind: RUNTIME_KIND.modelResolutionFailed,
    commandFailureMessage:
      `Unable to confirm the resolved primary model through "openclaw models status --plain". Rerun "${VERIFY_COMMAND}" after OpenClaw finishes loading the config.`,
    probe: () => openClawClient.probeResolvedPrimaryModel(),
    validate: (result) => verifyResolvedPrimaryModel(filePath, expectedPrimaryModelRef, result)
  });

  if (isRuntimeFailure(resolvedModelResult)) {
    return resolvedModelResult;
  }

  const resolvedPrimaryModelRef = resolvedModelResult.resolvedPrimaryModelRef;

  if (!resolvedPrimaryModelRef) {
    throw new Error('Resolved primary model verification succeeded without a value from "openclaw models status --plain".');
  }

  return createHealthyRuntimeResult(resolvedPrimaryModelRef);
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
  result: RuntimeProbeResult,
  kind: RuntimeVerificationFailureKind,
  baseMessage: string
): FailedRuntimeVerificationResult | undefined {
  if (result.status === 0) {
    return undefined;
  }

  return createFailedRuntimeResult(kind, formatCommandFailure(baseMessage, result));
}

function formatCommandFailure(baseMessage: string, result: RuntimeProbeResult): string {
  const outputSuffix = result.output.length > 0 ? `\n\nOpenClaw output:\n${result.output}` : "";

  return `${baseMessage}${outputSuffix}`;
}

function verifyResolvedPrimaryModel(
  filePath: string,
  expectedPrimaryModelRef: string,
  modelsStatusResult: ResolvedPrimaryModelProbeResult
): FailedRuntimeVerificationResult | undefined {
  const resolvedPrimaryModelRef = modelsStatusResult.resolvedPrimaryModelRef;

  if (!resolvedPrimaryModelRef) {
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

  return undefined;
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

function runRuntimeStep<Result extends RuntimeProbeResult>(
  step: RuntimeStep<Result>
): Result | FailedRuntimeVerificationResult {
  const result = step.probe();
  const commandFailure = getCommandFailure(result, step.commandFailureKind, step.commandFailureMessage);

  if (commandFailure) {
    return commandFailure;
  }

  return step.validate(result) ?? result;
}

function isRuntimeFailure(value: unknown): value is FailedRuntimeVerificationResult {
  return typeof value === "object" && value !== null && "message" in value;
}
