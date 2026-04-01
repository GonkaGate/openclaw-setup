import {
  type GatewayRpcProbeResult,
  type HealthSnapshotProbeResult,
  type OpenClawClient,
  OPENCLAW_COMMANDS,
  type ResolvedPrimaryModelProbeResult
} from "./openclaw-client.js";
import {
  formatCommandExitStatus,
  RuntimeVerificationError,
  RUNTIME_VERIFICATION_STEP,
  type RuntimeVerificationStep
} from "./install-errors.js";

const NEXT_GATEWAY_COMMAND = "openclaw gateway" as const;
const VERIFY_COMMAND = "npx @gonkagate/openclaw verify";

const RUNTIME_KIND = {
  gatewayUnavailable: "gateway_unavailable",
  healthy: "healthy",
  modelResolutionFailed: "model_resolution_failed",
  probeCommandFailed: "probe_command_failed",
  runtimeUnhealthy: "runtime_unhealthy",
  unexpectedOutput: "unexpected_output"
} as const;

const RUNTIME_FAILURE_KIND_SET = new Set<RuntimeVerificationFailureKind>([
  RUNTIME_KIND.gatewayUnavailable,
  RUNTIME_KIND.modelResolutionFailed,
  RUNTIME_KIND.probeCommandFailed,
  RUNTIME_KIND.runtimeUnhealthy,
  RUNTIME_KIND.unexpectedOutput
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
  | typeof RUNTIME_KIND.modelResolutionFailed
  | typeof RUNTIME_KIND.probeCommandFailed
  | typeof RUNTIME_KIND.runtimeUnhealthy
  | typeof RUNTIME_KIND.unexpectedOutput;

interface FailedRuntimeVerificationResult {
  kind: RuntimeVerificationFailureKind;
  message: string;
  step: RuntimeVerificationStep;
}

type RuntimeProbeResult = GatewayRpcProbeResult | HealthSnapshotProbeResult | ResolvedPrimaryModelProbeResult;
type SuccessfulRuntimeProbeResult<Result extends RuntimeProbeResult> = Extract<Result, { commandStatus: "succeeded" }>;
type FailedRuntimeProbeResult<Result extends RuntimeProbeResult> = Extract<Result, { commandStatus: "failed" }>;
type SuccessfulJsonProbeResult = SuccessfulRuntimeProbeResult<GatewayRpcProbeResult | HealthSnapshotProbeResult>;
type SuccessfulResolvedPrimaryModelProbeResult = SuccessfulRuntimeProbeResult<ResolvedPrimaryModelProbeResult>;
export type RuntimeProbeClient = Pick<OpenClawClient, "probeGatewayRpc" | "probeHealthSnapshot" | "probeResolvedPrimaryModel">;

interface RuntimeStep<
  Success extends RuntimeProbeResult & { commandStatus: "succeeded" },
  Failure extends RuntimeProbeResult & { commandStatus: "failed" }
> {
  commandFailureMessage: string;
  probe: () => Success | Failure;
  step: RuntimeVerificationStep;
  validate: (result: Success) => FailedRuntimeVerificationResult | undefined;
  validateFailure?: (result: Failure) => FailedRuntimeVerificationResult | undefined;
}

export type VerifyRuntimeResult = HealthyRuntimeVerificationResult | FailedRuntimeVerificationResult;
export type InstallRuntimeCheckResult = HealthyRuntimeVerificationResult | GatewayUnavailableInstallRuntimeResult;
export type { HealthyRuntimeVerificationResult };

export function verifyOpenClawRuntime(
  filePath: string,
  expectedPrimaryModelRef: string,
  openClawClient: RuntimeProbeClient
): VerifyRuntimeResult {
  const gatewayResult = runRuntimeStep<
    SuccessfulRuntimeProbeResult<GatewayRpcProbeResult>,
    FailedRuntimeProbeResult<GatewayRpcProbeResult>
  >({
    commandFailureMessage:
      `Unable to run "${OPENCLAW_COMMANDS.gatewayRpc.description}" while checking the local OpenClaw Gateway RPC. ` +
      `If OpenClaw is still starting, rerun "${VERIFY_COMMAND}" after it is ready.`,
    probe: () => openClawClient.probeGatewayRpc(),
    step: RUNTIME_VERIFICATION_STEP.gatewayRpc,
    validateFailure: (result) => {
      if (result.reportKind === "parsed" && result.rpcOk === false) {
        return createFailedRuntimeResult(
          RUNTIME_KIND.gatewayUnavailable,
          RUNTIME_VERIFICATION_STEP.gatewayRpc,
          formatCommandFailure(
            `OpenClaw did not report a healthy Gateway RPC through "${OPENCLAW_COMMANDS.gatewayRpc.description}". ` +
              `Start OpenClaw normally, then rerun "${VERIFY_COMMAND}".`,
            result
          )
        );
      }

      return undefined;
    },
    validate: (result) => {
      if (result.reportKind === "unparsed") {
        return createFailedRuntimeResult(
          RUNTIME_KIND.unexpectedOutput,
          RUNTIME_VERIFICATION_STEP.gatewayRpc,
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
        RUNTIME_VERIFICATION_STEP.gatewayRpc,
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

  const healthResult = runRuntimeStep<
    SuccessfulRuntimeProbeResult<HealthSnapshotProbeResult>,
    FailedRuntimeProbeResult<HealthSnapshotProbeResult>
  >({
    commandFailureMessage:
      `Unable to run "${OPENCLAW_COMMANDS.healthSnapshot.description}" while checking the local OpenClaw health snapshot. ` +
      `Rerun "${VERIFY_COMMAND}" after the Gateway is healthy.`,
    probe: () => openClawClient.probeHealthSnapshot(),
    step: RUNTIME_VERIFICATION_STEP.healthSnapshot,
    validateFailure: (result) => {
      if (result.reportKind === "parsed" && result.ok === false) {
        return createFailedRuntimeResult(
          RUNTIME_KIND.runtimeUnhealthy,
          RUNTIME_VERIFICATION_STEP.healthSnapshot,
          formatCommandFailure(
            `OpenClaw reported an unhealthy runtime through "${OPENCLAW_COMMANDS.healthSnapshot.description}". ` +
              `Rerun "${VERIFY_COMMAND}" after the Gateway is healthy.`,
            result
          )
        );
      }

      return undefined;
    },
    validate: (result) => {
      if (result.reportKind === "unparsed") {
        return createFailedRuntimeResult(
          RUNTIME_KIND.unexpectedOutput,
          RUNTIME_VERIFICATION_STEP.healthSnapshot,
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
        RUNTIME_VERIFICATION_STEP.healthSnapshot,
        formatCommandFailure(
          `OpenClaw reported an unhealthy runtime through "${OPENCLAW_COMMANDS.healthSnapshot.description}". ` +
            `Rerun "${VERIFY_COMMAND}" after the Gateway is healthy.`,
          result
        )
      );
    }
  });

  if (isRuntimeFailure(healthResult)) {
    return healthResult;
  }

  const resolvedModelResult = runRuntimeStep<
    SuccessfulRuntimeProbeResult<ResolvedPrimaryModelProbeResult>,
    FailedRuntimeProbeResult<ResolvedPrimaryModelProbeResult>
  >({
    commandFailureMessage:
      `Unable to run "${OPENCLAW_COMMANDS.resolvedPrimaryModel.description}" while confirming the resolved primary model. ` +
      `Rerun "${VERIFY_COMMAND}" after OpenClaw finishes loading the config.`,
    probe: () => openClawClient.probeResolvedPrimaryModel(),
    step: RUNTIME_VERIFICATION_STEP.resolvedPrimaryModel,
    validate: (result) => verifyResolvedPrimaryModel(filePath, expectedPrimaryModelRef, result)
  });

  if (isRuntimeFailure(resolvedModelResult)) {
    return resolvedModelResult;
  }

  if (resolvedModelResult.reportKind !== "parsed") {
    return createFailedRuntimeResult(
      RUNTIME_KIND.unexpectedOutput,
      RUNTIME_VERIFICATION_STEP.resolvedPrimaryModel,
      formatUnexpectedTextReport(
        `"${OPENCLAW_COMMANDS.resolvedPrimaryModel.description}"`,
        OPENCLAW_COMMANDS.resolvedPrimaryModel.expectedShape,
        resolvedModelResult
      )
    );
  }

  return createHealthyRuntimeResult(resolvedModelResult.resolvedPrimaryModelRef);
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

  if (result.kind === RUNTIME_KIND.gatewayUnavailable && result.step === RUNTIME_VERIFICATION_STEP.gatewayRpc) {
    return createGatewayUnavailableInstallResult();
  }

  throw new RuntimeVerificationError(result.kind, "install", result.message, {
    step: result.step
  });
}

export function verifyOpenClawRuntimeForVerify(
  filePath: string,
  expectedPrimaryModelRef: string,
  openClawClient: RuntimeProbeClient
): HealthyRuntimeVerificationResult {
  const result = verifyOpenClawRuntime(filePath, expectedPrimaryModelRef, openClawClient);

  if (result.kind !== RUNTIME_KIND.healthy) {
    throw new RuntimeVerificationError(result.kind, "verify", result.message, {
      step: result.step
    });
  }

  return result;
}

function formatCommandFailure(baseMessage: string, result: RuntimeProbeResult): string {
  const outputSuffix = result.output.length > 0 ? `\n\nOpenClaw output:\n${result.output}` : "";

  return `${baseMessage}${outputSuffix}`;
}

function formatProbeCommandFailure(baseMessage: string, result: Extract<RuntimeProbeResult, { commandStatus: "failed" }>): string {
  return formatCommandFailure(`${baseMessage} The command exited ${formatCommandExitStatus(result.status)}.`, result);
}

function formatUnexpectedJsonReport(
  command: string,
  expectedShape: string,
  result: SuccessfulJsonProbeResult
): string {
  const reason = result.reportKind === "unparsed"
    ? formatUnexpectedJsonReason(result.reason)
    : "OpenClaw returned an unexpected JSON payload.";

  return formatCommandFailure(
    `Unable to interpret ${command}. Expected ${expectedShape}, but ${reason}`,
    result
  );
}

function formatUnexpectedTextReport(
  command: string,
  expectedShape: string,
  result: Extract<SuccessfulResolvedPrimaryModelProbeResult, { reportKind: "unparsed" }>
): string {
  return formatCommandFailure(
    `Unable to interpret ${command}. Expected ${expectedShape}, but ${formatUnexpectedTextReason(result.reason)}`,
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

function formatUnexpectedTextReason(reason: string): string {
  switch (reason) {
    case "empty_output":
      return "received empty output.";
    case "invalid_shape":
      return "received output that was not a single model ref line.";
    default:
      return "received unexpected output.";
  }
}

function verifyResolvedPrimaryModel(
  filePath: string,
  expectedPrimaryModelRef: string,
  modelsStatusResult: SuccessfulResolvedPrimaryModelProbeResult
): FailedRuntimeVerificationResult | undefined {
  if (modelsStatusResult.reportKind === "unparsed") {
    return createFailedRuntimeResult(
      RUNTIME_KIND.unexpectedOutput,
      RUNTIME_VERIFICATION_STEP.resolvedPrimaryModel,
      formatUnexpectedTextReport(
        `"${OPENCLAW_COMMANDS.resolvedPrimaryModel.description}"`,
        OPENCLAW_COMMANDS.resolvedPrimaryModel.expectedShape,
        modelsStatusResult
      )
    );
  }

  const resolvedPrimaryModelRef = modelsStatusResult.resolvedPrimaryModelRef;

  if (resolvedPrimaryModelRef !== expectedPrimaryModelRef) {
    return createFailedRuntimeResult(
      RUNTIME_KIND.modelResolutionFailed,
      RUNTIME_VERIFICATION_STEP.resolvedPrimaryModel,
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
  step: RuntimeVerificationStep,
  message: string
): FailedRuntimeVerificationResult {
  return {
    kind,
    message,
    step
  };
}

function runRuntimeStep<
  Success extends RuntimeProbeResult & { commandStatus: "succeeded" },
  Failure extends RuntimeProbeResult & { commandStatus: "failed" }
>(
  step: RuntimeStep<Success, Failure>
): Success | FailedRuntimeVerificationResult {
  const result = step.probe();

  if (result.commandStatus === "failed") {
    return step.validateFailure?.(result)
      ?? createFailedRuntimeResult(
        RUNTIME_KIND.probeCommandFailed,
        step.step,
        formatProbeCommandFailure(step.commandFailureMessage, result)
      );
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
