import { readFile } from "node:fs/promises";
import JSON5 from "json5";
import type { OpenClawConfig } from "../types/settings.js";
import { SettingsMissingError, SettingsParseError, SettingsShapeError, describeValue } from "./install-errors.js";
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
    throw new SettingsShapeError({
      actual: describeValue(parsed),
      expected: "JSON5 object",
      kind: "root_not_object",
      message: `Expected ${filePath} to contain a JSON5 object.`,
      sourceLabel: filePath
    });
  }
  assertManagedSettingsShape(parsed, filePath);

  return {
    kind: "loaded",
    settings: parsed
  };
}

export function requireLoadedSettings(result: LoadSettingsResult, missingError: SettingsMissingError): LoadedSettingsResult {
  if (result.kind === "missing") {
    throw missingError;
  }

  return result;
}
function isNodeErrorWithCode(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
