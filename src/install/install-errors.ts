export const INSTALL_ERROR_CODE = {
  openClawCommandFailed: "openclaw_command_failed",
  openClawNotFound: "openclaw_not_found",
  runtimeVerificationFailed: "runtime_verification_failed",
  settingsParseFailed: "settings_parse_failed",
  temporaryCandidateCleanupFailed: "temporary_candidate_cleanup_failed"
} as const;

export type InstallErrorCode = typeof INSTALL_ERROR_CODE[keyof typeof INSTALL_ERROR_CODE];
export type RuntimeVerificationPhase = "install" | "verify";

export interface OpenClawCommandContext {
  args: readonly string[];
  command: string;
  operation: string;
}

export const OPENCLAW_NOT_FOUND_MESSAGE =
  "OpenClaw CLI was not found in PATH. Install OpenClaw first, then rerun this installer.";

export class InstallError extends Error {
  readonly code: InstallErrorCode;

  constructor(code: InstallErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
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

export class TemporaryCandidateCleanupError extends InstallError {
  readonly candidatePath: string;
  readonly targetPath: string;

  constructor(targetPath: string, candidatePath: string, cause: unknown) {
    const detail = getErrorMessage(cause);
    const detailSuffix = detail ? ` Cleanup detail: ${detail}` : "";

    super(
      INSTALL_ERROR_CODE.temporaryCandidateCleanupFailed,
      `Unable to remove the temporary OpenClaw config candidate ${candidatePath} created while validating ${targetPath}. Remove it manually and rerun this installer.${detailSuffix}`,
      { cause }
    );
    this.candidatePath = candidatePath;
    this.targetPath = targetPath;
  }
}

export class RuntimeVerificationError<Kind extends string = string> extends InstallError {
  readonly kind: Kind;
  readonly phase: RuntimeVerificationPhase;

  constructor(kind: Kind, phase: RuntimeVerificationPhase, message: string, options?: ErrorOptions) {
    super(INSTALL_ERROR_CODE.runtimeVerificationFailed, message, options);
    this.kind = kind;
    this.phase = phase;
  }
}

export function formatCommandInvocation(command: string, args: readonly string[]): string {
  return [command, ...args].join(" ");
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
