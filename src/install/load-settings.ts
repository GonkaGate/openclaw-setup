import { readFile } from "node:fs/promises";
import JSON5 from "json5";
import type { OpenClawConfig } from "../types/settings.js";
import { SettingsParseError } from "./install-errors.js";
import { assertManagedSettingsShape } from "./managed-settings-access.js";
import { isPlainObject } from "./object-utils.js";

export interface LoadedSettingsResult {
  kind: "loaded";
  settings: OpenClawConfig;
}

export interface MissingSettingsResult {
  kind: "missing";
}

export type LoadSettingsResult = LoadedSettingsResult | MissingSettingsResult;

export async function loadSettings(filePath: string): Promise<LoadSettingsResult> {
  let raw: string;

  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return {
        kind: "missing"
      };
    }

    throw error;
  }

  let parsed: unknown;

  try {
    parsed = JSON5.parse(raw);
  } catch (error) {
    throw new SettingsParseError(filePath, error);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`Expected ${filePath} to contain a JSON5 object.`);
  }
  assertManagedSettingsShape(parsed, filePath);

  return {
    kind: "loaded",
    settings: parsed
  };
}

export function requireLoadedSettings(result: LoadSettingsResult, missingMessage: string): LoadedSettingsResult {
  if (result.kind === "missing") {
    throw new Error(missingMessage);
  }

  return result;
}
function isNodeErrorWithCode(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
