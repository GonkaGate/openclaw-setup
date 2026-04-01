import process from "node:process";
import { homedir } from "node:os";
import path from "node:path";
import type { SettingsTarget } from "../types/settings.js";

const OPENCLAW_CONFIG_FILE_NAME = "openclaw.json";
const OPENCLAW_CONFIG_DIRECTORY_NAME = ".openclaw";

export function getSettingsTarget(userHome = homedir(), env: NodeJS.ProcessEnv = process.env): SettingsTarget {
  const configuredConfigPath = getConfiguredEnvPath(env.OPENCLAW_CONFIG_PATH);

  if (configuredConfigPath) {
    return {
      path: configuredConfigPath
    };
  }

  const configuredStateDirectory = getConfiguredEnvPath(env.OPENCLAW_STATE_DIR);

  if (configuredStateDirectory) {
    return {
      path: path.join(configuredStateDirectory, OPENCLAW_CONFIG_FILE_NAME)
    };
  }

  const configuredHomeDirectory = getConfiguredEnvPath(env.OPENCLAW_HOME);

  if (configuredHomeDirectory) {
    return {
      path: path.join(configuredHomeDirectory, OPENCLAW_CONFIG_DIRECTORY_NAME, OPENCLAW_CONFIG_FILE_NAME)
    };
  }

  return {
    path: path.join(userHome, OPENCLAW_CONFIG_DIRECTORY_NAME, OPENCLAW_CONFIG_FILE_NAME)
  };
}

function getConfiguredEnvPath(value: string | undefined): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  return value;
}
