import process from "node:process";
import { homedir } from "node:os";
import path from "node:path";

const OPENCLAW_CONFIG_FILE_NAME = "openclaw.json";
const OPENCLAW_CONFIG_DIRECTORY_NAME = ".openclaw";

export function getSettingsTarget(userHome = homedir(), env: NodeJS.ProcessEnv = process.env): string {
  const configuredConfigPath = getConfiguredEnvPath(env.OPENCLAW_CONFIG_PATH);

  if (configuredConfigPath) {
    return configuredConfigPath;
  }

  const configuredStateDirectory = getConfiguredEnvPath(env.OPENCLAW_STATE_DIR);

  if (configuredStateDirectory) {
    return path.join(configuredStateDirectory, OPENCLAW_CONFIG_FILE_NAME);
  }

  const configuredHomeDirectory = getConfiguredEnvPath(env.OPENCLAW_HOME);

  if (configuredHomeDirectory) {
    return path.join(configuredHomeDirectory, OPENCLAW_CONFIG_DIRECTORY_NAME, OPENCLAW_CONFIG_FILE_NAME);
  }

  return path.join(userHome, OPENCLAW_CONFIG_DIRECTORY_NAME, OPENCLAW_CONFIG_FILE_NAME);
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
