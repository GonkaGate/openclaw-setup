import { spawnSync } from "node:child_process";

export interface CommandResult {
  status: number | null;
  error?: NodeJS.ErrnoException;
}

export type CommandRunner = (command: string, args: string[]) => CommandResult;

export function ensureOpenClawInstalled(runCommand: CommandRunner = runVersionCheck): void {
  const result = runCommand("openclaw", ["--version"]);

  if (result.error?.code === "ENOENT") {
    throw new Error("OpenClaw CLI was not found in PATH. Install OpenClaw first, then rerun this installer.");
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Unable to verify the local OpenClaw install. "openclaw --version" exited with code ${result.status}.`);
  }
}

export function initializeOpenClawBaseConfig(runCommand: CommandRunner = runSetupCommand): void {
  const result = runCommand("openclaw", ["setup"]);

  if (result.error?.code === "ENOENT") {
    throw new Error("OpenClaw CLI was not found in PATH. Install OpenClaw first, then rerun this installer.");
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Unable to initialize the local OpenClaw config automatically. "openclaw setup" exited with code ${result.status}. Update OpenClaw or run "openclaw setup" manually, then rerun this installer.`
    );
  }
}

function runVersionCheck(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    stdio: "ignore"
  });

  return {
    status: result.status,
    error: result.error ?? undefined
  };
}

function runSetupCommand(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    stdio: "inherit"
  });

  return {
    status: result.status,
    error: result.error ?? undefined
  };
}
