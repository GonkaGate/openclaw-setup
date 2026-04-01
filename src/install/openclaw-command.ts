import { spawnSync, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns } from "node:child_process";

export interface OpenClawCommandResult {
  error?: NodeJS.ErrnoException;
  status: number | null;
  stderr: string;
  stdout: string;
}

export interface RunOpenClawCommandOptions {
  env?: NodeJS.ProcessEnv;
  stdio?: SpawnSyncOptionsWithStringEncoding["stdio"];
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

export function runOpenClawCommand(
  command: string,
  args: string[],
  options: RunOpenClawCommandOptions = {}
): OpenClawCommandResult {
  return normalizeOpenClawCommandResult(spawnSync(command, args, {
    encoding: "utf8",
    ...(options.env ? { env: options.env } : {}),
    stdio: options.stdio ?? "pipe"
  }));
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
