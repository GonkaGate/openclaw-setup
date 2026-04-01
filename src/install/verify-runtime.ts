import {
  type GatewayRpcProbeResult,
  type HealthSnapshotProbeResult,
  type OpenClawClient,
  OPENCLAW_COMMANDS,
  type ResolvedPrimaryModelProbeResult
} from "./openclaw-client.js";
import { RuntimeVerificationError } from "./install-errors.js";

const NEXT_GATEWAY_COMMAND = "openclaw gateway" as const;
const VERIFY_COMMAND = "npx @gonkagate/openclaw verify";

const RUNTIME_KIND = {
  healthy: "healthy",
  gatewayUnavailable: "gateway_unavailable",
  unexpectedOutput: "unexpected_output",
  runtimeUnhealthy: "runtime_unhealthy",
  modelResolutionFailed: "model_resolution_failed"
} as const;

const RUNTIME_FAILURE_KIND_SET = new Set<RuntimeVerificationFailureKind>([
  RUNTIME_KIND.gatewayUnavailable,
  RUNTIME_KIND.unexpectedOutput,
  RUNTIME_KIND.runtimeUnhealthy,
  RUNTIME_KIND.modelResolutionFailed
]);

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
  | typeof RUNTIME_KIND.unexpectedOutput
  | typeof RUNTIME_KIND.runtimeUnhealthy
  | typeof RUNTIME_KIND.modelResolutionFailed;

interface FailedRuntimeVerificationResult {
  kind: RuntimeVerificationFailureKind;
  message: string;
}

type RuntimeProbeResult = GatewayRpcProbeResult | HealthSnapshotProbeResult | ResolvedPrimaryModelProbeResult;
export type RuntimeProbeClient = Pick<OpenClawClient, "probeGatewayRpc" | "probeHealthSnapshot" | "probeResolvedPrimaryModel">;

interface RuntimeStep<Result extends RuntimeProbeResult> {
  commandFailureKind: RuntimeVerificationFailureKind;
  commandFailureMessage: string;
  probe: () => Result;
  validate: (result: Result) => FailedRuntimeVerificationResult | undefined;
}

export type VerifyRuntimeResult = HealthyRuntimeVerificationResult | FailedRuntimeVerificationResult;
export type InstallRuntimeCheckResult = HealthyRuntimeVerificationResult | GatewayUnavailableInstallRuntimeResult;
export type { HealthyRuntimeVerificationResult };

export function verifyOpenClawRuntime(
  filePath: string,
  expectedPrimaryModelRef: string,
  openClawClient: RuntimeProbeClient
): VerifyRuntimeResult {
  const gatewayResult = runRuntimeStep({
    commandFailureKind: RUNTIME_KIND.gatewayUnavailable,
    commandFailureMessage:
      `Unable to confirm that the local OpenClaw Gateway RPC is healthy through "${OPENCLAW_COMMANDS.gatewayRpc.description}". ` +
      `Start OpenClaw normally, then rerun "${VERIFY_COMMAND}".`,
    probe: () => openClawClient.probeGatewayRpc(),
    validate: (result) => {
      if (result.reportKind === "unparsed") {
        return createFailedRuntimeResult(
          RUNTIME_KIND.unexpectedOutput,
          formatUnexpectedJsonReport(
            `"${OPENCLAW_COMMANDS.gatewayRpc.description}"`,
            OPENCLAW_COMMANDS.gatewayRpc.expectedShape,
            result
          )
        );
      }

      if (result.rpcOk === true) {
        return undefined;
      }

      return createFailedRuntimeResult(
        RUNTIME_KIND.gatewayUnavailable,
        formatCommandFailure(
          `OpenClaw did not report a healthy Gateway RPC through "${OPENCLAW_COMMANDS.gatewayRpc.description}". ` +
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
      `Unable to confirm OpenClaw health through "${OPENCLAW_COMMANDS.healthSnapshot.description}". Rerun "${VERIFY_COMMAND}" after the Gateway is healthy.`,
    probe: () => openClawClient.probeHealthSnapshot(),
    validate: (result) => {
      if (result.reportKind === "unparsed") {
        return createFailedRuntimeResult(
          RUNTIME_KIND.unexpectedOutput,
          formatUnexpectedJsonReport(
            `"${OPENCLAW_COMMANDS.healthSnapshot.description}"`,
            OPENCLAW_COMMANDS.healthSnapshot.expectedShape,
            result
          )
        );
      }

      if (result.ok === true) {
        return undefined;
      }

      return createFailedRuntimeResult(
        RUNTIME_KIND.runtimeUnhealthy,
        formatCommandFailure(
          `OpenClaw reported an unhealthy runtime through "${OPENCLAW_COMMANDS.healthSnapshot.description}". Rerun "${VERIFY_COMMAND}" after the Gateway is healthy.`,
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
      `Unable to confirm the resolved primary model through "${OPENCLAW_COMMANDS.resolvedPrimaryModel.description}". Rerun "${VERIFY_COMMAND}" after OpenClaw finishes loading the config.`,
    probe: () => openClawClient.probeResolvedPrimaryModel(),
    validate: (result) => verifyResolvedPrimaryModel(filePath, expectedPrimaryModelRef, result)
  });

  if (isRuntimeFailure(resolvedModelResult)) {
    return resolvedModelResult;
  }

  const resolvedPrimaryModelRef = resolvedModelResult.resolvedPrimaryModelRef;

  if (!resolvedPrimaryModelRef) {
    throw new Error(
      `Resolved primary model verification succeeded without a value from "${OPENCLAW_COMMANDS.resolvedPrimaryModel.description}".`
    );
  }

  return createHealthyRuntimeResult(resolvedPrimaryModelRef);
}

export function verifyOpenClawRuntimeForInstall(
  filePath: string,
  expectedPrimaryModelRef: string,
  openClawClient: RuntimeProbeClient
): InstallRuntimeCheckResult {
  const result = verifyOpenClawRuntime(filePath, expectedPrimaryModelRef, openClawClient);

  if (result.kind === RUNTIME_KIND.healthy) {
    return result;
  }

  if (result.kind === RUNTIME_KIND.gatewayUnavailable) {
    return createGatewayUnavailableInstallResult();
  }

  throw new RuntimeVerificationError(
    result.kind,
    "install",
    `${result.message}\n\nThe GonkaGate settings were written successfully before this runtime check failed.`
  );
}

export function verifyOpenClawRuntimeForVerify(
  filePath: string,
  expectedPrimaryModelRef: string,
  openClawClient: RuntimeProbeClient
): HealthyRuntimeVerificationResult {
  const result = verifyOpenClawRuntime(filePath, expectedPrimaryModelRef, openClawClient);

  if (result.kind !== RUNTIME_KIND.healthy) {
    throw new RuntimeVerificationError(result.kind, "verify", result.message);
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

function formatUnexpectedJsonReport(
  command: string,
  expectedShape: string,
  result: GatewayRpcProbeResult | HealthSnapshotProbeResult
): string {
  const reason = result.reportKind === "unparsed"
    ? formatUnexpectedJsonReason(result.reason)
    : "OpenClaw returned an unexpected JSON payload.";

  return formatCommandFailure(
    `Unable to interpret ${command}. Expected ${expectedShape}, but ${reason}`,
    result
  );
}

function formatUnexpectedJsonReason(reason: string): string {
  switch (reason) {
    case "empty_output":
      return "received empty output.";
    case "invalid_json":
      return "received malformed JSON.";
    case "non_object":
      return "received JSON that was not an object.";
    case "invalid_shape":
      return "received JSON with the wrong shape.";
    default:
      return "received unexpected output.";
  }
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
      formatCommandFailure(
        `OpenClaw returned an empty response for "${OPENCLAW_COMMANDS.resolvedPrimaryModel.description}".`,
        modelsStatusResult
      )
    );
  }

  if (resolvedPrimaryModelRef !== expectedPrimaryModelRef) {
    return createFailedRuntimeResult(
      RUNTIME_KIND.modelResolutionFailed,
      `OpenClaw resolved primary model "${resolvedPrimaryModelRef}" through "${OPENCLAW_COMMANDS.resolvedPrimaryModel.description}", ` +
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
  return typeof value === "object"
    && value !== null
    && "kind" in value
    && typeof value.kind === "string"
    && RUNTIME_FAILURE_KIND_SET.has(value.kind as RuntimeVerificationFailureKind);
}
