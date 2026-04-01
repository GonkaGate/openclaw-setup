import {
  ensureOpenClawInstalled as ensureOpenClawInstalledWithRunner,
  initializeOpenClawBaseConfig as initializeOpenClawBaseConfigWithRunner,
  type OpenClawClientCommandRunner
} from "./openclaw-client.js";
import { runOpenClawCommand } from "./openclaw-command.js";

export type CommandRunner = OpenClawClientCommandRunner;

export function ensureOpenClawInstalled(runCommand: CommandRunner = runOpenClawCommand): void {
  ensureOpenClawInstalledWithRunner(runCommand);
}

export function initializeOpenClawBaseConfig(runCommand: CommandRunner = runOpenClawCommand): void {
  initializeOpenClawBaseConfigWithRunner(runCommand);
}
