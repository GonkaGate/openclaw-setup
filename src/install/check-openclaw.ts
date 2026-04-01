import { createOpenClawClient, type OpenClawClientCommandRunner } from "./openclaw-client.js";
import { runOpenClawCommand, type OpenClawCommandResult } from "./openclaw-command.js";

export type CommandResult = OpenClawCommandResult;

export type CommandRunner = (command: string, args: string[]) => CommandResult;

export function ensureOpenClawInstalled(runCommand: CommandRunner = runVersionCheck): void {
  createClientFromLegacyRunner(runCommand).ensureInstalled();
}

export function initializeOpenClawBaseConfig(runCommand: CommandRunner = runSetupCommand): void {
  createClientFromLegacyRunner(runCommand).initializeBaseConfig();
}

const runVersionCheck: CommandRunner = (command, args) => runOpenClawCommand(command, args, {
  stdio: "ignore"
});

const runSetupCommand: CommandRunner = (command, args) => runOpenClawCommand(command, args, {
  stdio: "inherit"
});

function createClientFromLegacyRunner(runCommand: CommandRunner) {
  const adaptedRunner: OpenClawClientCommandRunner = (command, args) => runCommand(command, args);
  return createOpenClawClient({
    runCommand: adaptedRunner
  });
}
