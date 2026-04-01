import type { SpawnSyncReturns } from "node:child_process";

export interface OpenClawCommandResult {
  error?: NodeJS.ErrnoException;
  status: number | null;
  stderr: string;
  stdout: string;
}

const OPENCLAW_NOT_FOUND_MESSAGE =
  "OpenClaw CLI was not found in PATH. Install OpenClaw first, then rerun this installer.";

export function normalizeOpenClawCommandResult(result: SpawnSyncReturns<string>): OpenClawCommandResult {
  return {
    error: result.error ?? undefined,
    status: result.status,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? ""
  };
}

export function throwIfOpenClawCommandErrored(result: Pick<OpenClawCommandResult, "error">): void {
  if (result.error?.code === "ENOENT") {
    throw new Error(OPENCLAW_NOT_FOUND_MESSAGE);
  }

  if (result.error) {
    throw result.error;
  }
}

export function formatOpenClawCommandOutput(result: Pick<OpenClawCommandResult, "stdout" | "stderr">): string {
  return [result.stdout.trim(), result.stderr.trim()].filter((chunk) => chunk.length > 0).join("\n");
}
