export const INSTALL_ERROR_CODE = {
  apiKeyInvalid: "api_key_invalid",
  cliUsageInvalid: "cli_usage_invalid",
  gonkaGateModelsFailed: "gonkagate_models_failed",
  openClawCommandFailed: "openclaw_command_failed",
  openClawCommandExitedNonZero: "openclaw_command_exited_non_zero",
  openClawConfigValidationFailed: "openclaw_config_validation_failed",
  openClawNotFound: "openclaw_not_found",
  postWriteInstallFailed: "post_write_install_failed",
  promptFailed: "prompt_failed",
  runtimeVerificationFailed: "runtime_verification_failed",
  settingsMissing: "settings_missing",
  settingsParseFailed: "settings_parse_failed",
  settingsShapeInvalid: "settings_shape_invalid",
  settingsVerificationFailed: "settings_verification_failed",
  temporaryCandidatePreparationFailed: "temporary_candidate_preparation_failed",
  temporaryCandidateCleanupFailed: "temporary_candidate_cleanup_failed"
} as const;

export type InstallErrorCode = typeof INSTALL_ERROR_CODE[keyof typeof INSTALL_ERROR_CODE];
export type RuntimeVerificationPhase = "install" | "verify";
export const RUNTIME_VERIFICATION_STEP = {
  gatewayRpc: "gateway_rpc",
  healthSnapshot: "health_snapshot",
  resolvedPrimaryModel: "resolved_primary_model"
} as const;
export type RuntimeVerificationStep = typeof RUNTIME_VERIFICATION_STEP[keyof typeof RUNTIME_VERIFICATION_STEP];
export type ApiKeyValidationKind = "missing" | "wrong_prefix" | "invalid_format";
export type GonkaGateModelsFailureKind =
  | "authentication_failed"
  | "catalog_unavailable"
  | "invalid_response"
  | "missing_supported_models"
  | "missing_selected_model"
  | "no_supported_models"
  | "request_failed";
export type OpenClawConfigValidationKind = "command_failed" | "invalid_config" | "unexpected_validated_path";
export type PromptFailureKind = "cancelled" | "missing_tty" | "model_registry_mismatch" | "no_supported_models";
export type SettingsMissingKind = "post_setup_target_missing" | "target_config_missing";
export type SettingsShapeKind = "expected_array" | "expected_non_empty_string" | "expected_object" | "root_not_object";
export type SettingsVerificationKind =
  | "invalid_api_key"
  | "invalid_permissions"
  | "missing_allowlist_entry"
  | "missing_managed_value"
  | "missing_provider_model_entry"
  | "mismatched_allowlist_alias"
  | "mismatched_managed_value"
  | "permissions_check_failed";
export type TemporaryCandidatePreparationStage = "chmod_candidate" | "create_directory" | "write_candidate";

export interface OpenClawCommandContext {
  args: readonly string[];
  command: string;
  operation: string;
}

export const OPENCLAW_NOT_FOUND_MESSAGE =
  "OpenClaw CLI was not found in PATH. Install OpenClaw first, then rerun this installer.";

export class InstallError extends Error {
  readonly code: InstallErrorCode;
  configTargetPath?: string;
  configWritten = false;

  constructor(code: InstallErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }

  markConfigWritten(targetPath: string): this {
    this.configWritten = true;

    if (!this.configTargetPath) {
      this.configTargetPath = targetPath;
    }

    return this;
  }
}

export class CliUsageError extends InstallError {
  readonly argument?: string;

  constructor(message: string, options: ErrorOptions & { argument?: string } = {}) {
    super(INSTALL_ERROR_CODE.cliUsageInvalid, message, options);
    this.argument = options.argument;
  }
}

export class PromptError<Kind extends PromptFailureKind = PromptFailureKind> extends InstallError {
  readonly kind: Kind;

  constructor(kind: Kind, message: string, options?: ErrorOptions) {
    super(INSTALL_ERROR_CODE.promptFailed, message, options);
    this.kind = kind;
  }
}

export class ApiKeyValidationError<Kind extends ApiKeyValidationKind = ApiKeyValidationKind> extends InstallError {
  readonly kind: Kind;

  constructor(kind: Kind, message: string, options?: ErrorOptions) {
    super(INSTALL_ERROR_CODE.apiKeyInvalid, message, options);
    this.kind = kind;
  }
}

export class GonkaGateModelsError<Kind extends GonkaGateModelsFailureKind = GonkaGateModelsFailureKind> extends InstallError {
  readonly actual?: string;
  readonly expected?: string;
  readonly kind: Kind;
  readonly status?: number;

  constructor(options: {
    actual?: string;
    expected?: string;
    kind: Kind;
    message: string;
    status?: number;
  } & ErrorOptions) {
    super(INSTALL_ERROR_CODE.gonkaGateModelsFailed, options.message, options);
    this.actual = options.actual;
    this.expected = options.expected;
    this.kind = options.kind;
    this.status = options.status;
  }
}

export class OpenClawNotFoundError extends InstallError {
  constructor() {
    super(INSTALL_ERROR_CODE.openClawNotFound, OPENCLAW_NOT_FOUND_MESSAGE);
  }
}

export class OpenClawCommandError extends InstallError {
  readonly args: readonly string[];
  readonly command: string;
  readonly operation: string;

  constructor(context: OpenClawCommandContext, cause: unknown) {
    const invocation = formatCommandInvocation(context.command, context.args);
    const detail = getErrorMessage(cause);
    const detailSuffix = detail ? `: ${detail}` : ".";

    super(
      INSTALL_ERROR_CODE.openClawCommandFailed,
      `Unable to ${context.operation}. "${invocation}" could not be started${detailSuffix}`,
      { cause }
    );
    this.args = context.args;
    this.command = context.command;
    this.operation = context.operation;
  }
}

export class OpenClawCommandExitError extends InstallError {
  readonly args: readonly string[];
  readonly command: string;
  readonly operation: string;
  readonly output: string;
  readonly status: number | null;

  constructor(
    context: OpenClawCommandContext,
    status: number | null,
    output: string,
    message: string,
    options?: ErrorOptions
  ) {
    super(INSTALL_ERROR_CODE.openClawCommandExitedNonZero, message, options);
    this.args = context.args;
    this.command = context.command;
    this.operation = context.operation;
    this.output = output;
    this.status = status;
  }
}

export class OpenClawConfigValidationError<Kind extends OpenClawConfigValidationKind = OpenClawConfigValidationKind> extends InstallError {
  readonly filePath: string;
  readonly kind: Kind;
  readonly issues?: readonly OpenClawValidationIssueSummary[];
  readonly output?: string;
  readonly reportedPath?: string;
  readonly status: number | null;

  constructor(options: {
    filePath: string;
    kind: Kind;
    message: string;
    issues?: readonly OpenClawValidationIssueSummary[];
    output?: string;
    reportedPath?: string;
    status: number | null;
  } & ErrorOptions) {
    super(INSTALL_ERROR_CODE.openClawConfigValidationFailed, options.message, options);
    this.filePath = options.filePath;
    this.kind = options.kind;
    this.issues = options.issues;
    this.output = options.output;
    this.reportedPath = options.reportedPath;
    this.status = options.status;
  }
}

export interface OpenClawValidationIssueSummary {
  message?: string;
  path?: string;
}

export class SettingsMissingError<Kind extends SettingsMissingKind = SettingsMissingKind> extends InstallError {
  readonly filePath: string;
  readonly kind: Kind;

  constructor(kind: Kind, filePath: string, message: string, options?: ErrorOptions) {
    super(INSTALL_ERROR_CODE.settingsMissing, message, options);
    this.filePath = filePath;
    this.kind = kind;
  }
}

export class SettingsParseError extends InstallError {
  readonly filePath: string;

  constructor(filePath: string, cause: unknown) {
    const detail = getErrorMessage(cause);
    const detailSuffix = detail ? ` Parser detail: ${detail}` : "";

    super(
      INSTALL_ERROR_CODE.settingsParseFailed,
      `Failed to parse JSON5 in ${filePath}. Fix or restore that file before rerunning the installer.${detailSuffix}`,
      { cause }
    );
    this.filePath = filePath;
  }
}

export class SettingsShapeError<Kind extends SettingsShapeKind = SettingsShapeKind> extends InstallError {
  readonly actual?: string;
  readonly expected: string;
  readonly fieldPath?: string;
  readonly kind: Kind;
  readonly sourceLabel: string;

  constructor(options: {
    actual?: string;
    expected: string;
    fieldPath?: string;
    kind: Kind;
    message: string;
    sourceLabel: string;
  } & ErrorOptions) {
    super(INSTALL_ERROR_CODE.settingsShapeInvalid, options.message, options);
    this.actual = options.actual;
    this.expected = options.expected;
    this.fieldPath = options.fieldPath;
    this.kind = options.kind;
    this.sourceLabel = options.sourceLabel;
  }
}

export class SettingsVerificationError<Kind extends SettingsVerificationKind = SettingsVerificationKind> extends InstallError {
  readonly actual?: string;
  readonly expected?: string;
  readonly fieldPath?: string;
  readonly filePath: string;
  readonly kind: Kind;

  constructor(options: {
    actual?: string;
    expected?: string;
    fieldPath?: string;
    filePath: string;
    kind: Kind;
    message: string;
  } & ErrorOptions) {
    super(INSTALL_ERROR_CODE.settingsVerificationFailed, options.message, options);
    this.actual = options.actual;
    this.expected = options.expected;
    this.fieldPath = options.fieldPath;
    this.filePath = options.filePath;
    this.kind = options.kind;
  }
}

export class TemporaryCandidatePreparationError<
  Stage extends TemporaryCandidatePreparationStage = TemporaryCandidatePreparationStage
> extends InstallError {
  readonly candidatePath: string;
  readonly stage: Stage;
  readonly targetPath: string;

  constructor(stage: Stage, targetPath: string, candidatePath: string, message: string, options?: ErrorOptions) {
    super(INSTALL_ERROR_CODE.temporaryCandidatePreparationFailed, message, options);
    this.candidatePath = candidatePath;
    this.stage = stage;
    this.targetPath = targetPath;
  }
}

export class TemporaryCandidateCleanupError extends InstallError {
  readonly candidatePath: string;
  readonly primaryError?: unknown;
  readonly targetPath: string;

  constructor(targetPath: string, candidatePath: string, cause: unknown, primaryError?: unknown) {
    const cleanupDetail = getErrorMessage(cause);
    const cleanupDetailSuffix = cleanupDetail ? ` Cleanup detail: ${cleanupDetail}` : "";
    const primaryDetail = getErrorMessage(primaryError);
    const primaryDetailSuffix = primaryDetail
      ? ` The earlier validation failure was: ${primaryDetail}`
      : "";

    super(
      INSTALL_ERROR_CODE.temporaryCandidateCleanupFailed,
      `Unable to remove the temporary OpenClaw config candidate ${candidatePath} created while validating ${targetPath}. Remove it manually before rerunning this installer.${primaryDetailSuffix}${cleanupDetailSuffix}`,
      { cause }
    );
    this.candidatePath = candidatePath;
    this.primaryError = primaryError;
    this.targetPath = targetPath;
  }
}

export class PostWriteInstallError extends InstallError {
  readonly targetPath: string;

  constructor(targetPath: string, cause: unknown) {
    const detail = getErrorMessage(cause);
    const detailSuffix = detail ? ` ${detail}` : "";

    super(
      INSTALL_ERROR_CODE.postWriteInstallFailed,
      `A follow-up install check failed after writing the GonkaGate settings to ${targetPath}.${detailSuffix}`,
      { cause }
    );
    this.targetPath = targetPath;
    this.markConfigWritten(targetPath);
  }
}

export class RuntimeVerificationError<Kind extends string = string> extends InstallError {
  readonly kind: Kind;
  readonly phase: RuntimeVerificationPhase;
  readonly step?: RuntimeVerificationStep;

  constructor(
    kind: Kind,
    phase: RuntimeVerificationPhase,
    message: string,
    options: (ErrorOptions & { step?: RuntimeVerificationStep }) = {}
  ) {
    super(INSTALL_ERROR_CODE.runtimeVerificationFailed, message, options);
    this.kind = kind;
    this.phase = phase;
    this.step = options.step;
  }
}

export function formatCommandInvocation(command: string, args: readonly string[]): string {
  return [command, ...args].join(" ");
}

export function formatCommandExitStatus(status: number | null): string {
  return status === null ? "without an exit code" : `with exit code ${status}`;
}

export function describeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  const valueType = typeof value;

  if (valueType === "object") {
    return "object";
  }

  return valueType;
}

export function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    const trimmed = error.message.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

export function markInstallErrorConfigWritten(error: unknown, targetPath: string): InstallError {
  if (error instanceof InstallError) {
    return error.markConfigWritten(targetPath);
  }

  return new PostWriteInstallError(targetPath, error);
}
