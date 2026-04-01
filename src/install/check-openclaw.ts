import { createOpenClawClient, type OpenClawClientCommandRunner } from "./openclaw-client.js";
import { runOpenClawCommand } from "./openclaw-command.js";

export type CommandRunner = OpenClawClientCommandRunner;

export function ensureOpenClawInstalled(runCommand: CommandRunner = runOpenClawCommand): void {
  createOpenClawClient({ runCommand }).ensureInstalled();
}

export function initializeOpenClawBaseConfig(runCommand: CommandRunner = runOpenClawCommand): void {
  createOpenClawClient({ runCommand }).initializeBaseConfig();
}
