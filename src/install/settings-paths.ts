import { existsSync } from "node:fs";
import process from "node:process";
import { homedir } from "node:os";
import path from "node:path";

const OPENCLAW_CONFIG_FILE_NAME = "openclaw.json";
const OPENCLAW_CONFIG_DIRECTORY_NAME = ".openclaw";
const LEGACY_CONFIG_FILE_NAMES = ["clawdbot.json"];
const LEGACY_CONFIG_DIRECTORY_NAMES = [".clawdbot"];

interface SettingsTargetDependencies {
  fileExists?: (filePath: string) => boolean;
}

export function getSettingsTarget(
  userHome = homedir(),
  env: NodeJS.ProcessEnv = process.env,
  dependencies: SettingsTargetDependencies = {}
): string {
  const configuredConfigPath = getConfiguredEnvPath(env.OPENCLAW_CONFIG_PATH);

  if (configuredConfigPath) {
    return configuredConfigPath;
  }

  const fileExists = dependencies.fileExists ?? defaultFileExists;
  const candidates = getSettingsTargetCandidates(userHome, env);
  const existingCandidate = candidates.find((candidate) => fileExists(candidate));

  return existingCandidate ?? candidates[0];
}

function getSettingsTargetCandidates(userHome: string, env: NodeJS.ProcessEnv): string[] {
  const configuredStateDirectory = getConfiguredEnvPath(env.OPENCLAW_STATE_DIR);

  if (configuredStateDirectory) {
    return getConfigFileCandidates(configuredStateDirectory);
  }

  const configuredHomeDirectory = getConfiguredEnvPath(env.OPENCLAW_HOME);

  return getDefaultHomeConfigCandidates(configuredHomeDirectory ?? userHome);
}

function getDefaultHomeConfigCandidates(userHome: string): string[] {
  return [
    path.join(userHome, OPENCLAW_CONFIG_DIRECTORY_NAME),
    ...LEGACY_CONFIG_DIRECTORY_NAMES.map((directoryName) => path.join(userHome, directoryName))
  ].flatMap((directoryPath) => getConfigFileCandidates(directoryPath));
}

function getConfigFileCandidates(directoryPath: string): string[] {
  return [
    path.join(directoryPath, OPENCLAW_CONFIG_FILE_NAME),
    ...LEGACY_CONFIG_FILE_NAMES.map((fileName) => path.join(directoryPath, fileName))
  ];
}

function defaultFileExists(filePath: string): boolean {
  try {
    return existsSync(filePath);
  } catch {
    return false;
  }
}

function getConfiguredEnvPath(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return undefined;
  }

  return normalizedValue;
}
