import { spawnSync } from "node:child_process";
import { normalizeOpenClawCommandResult, throwIfOpenClawCommandErrored, type OpenClawCommandResult } from "./openclaw-command.js";

export type CommandResult = OpenClawCommandResult;

export type CommandRunner = (command: string, args: string[]) => CommandResult;

export function ensureOpenClawInstalled(runCommand: CommandRunner = runVersionCheck): void {
  const result = runCommand("openclaw", ["--version"]);
  throwIfOpenClawCommandErrored(result);

  if (result.status !== 0) {
    throw new Error(`Unable to verify the local OpenClaw install. "openclaw --version" exited with code ${result.status}.`);
  }
}

export function initializeOpenClawBaseConfig(runCommand: CommandRunner = runSetupCommand): void {
  const result = runCommand("openclaw", ["setup"]);
  throwIfOpenClawCommandErrored(result);

  if (result.status !== 0) {
    throw new Error(
      `Unable to initialize the local OpenClaw config automatically. "openclaw setup" exited with code ${result.status}. Update OpenClaw or run "openclaw setup" manually, then rerun this installer.`
    );
  }
}

function runVersionCheck(command: string, args: string[]): CommandResult {
  return normalizeOpenClawCommandResult(spawnSync(command, args, {
    encoding: "utf8",
    stdio: "ignore"
  }));
}

function runSetupCommand(command: string, args: string[]): CommandResult {
  return normalizeOpenClawCommandResult(spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit"
  }));
}
