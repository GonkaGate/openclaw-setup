import { stat } from "node:fs/promises";

export const DEFAULT_OWNER_ONLY_MODE = 0o600;

export function formatUnixMode(mode: number): string {
  return `0o${mode.toString(8).padStart(3, "0")}`;
}

export function hasOwnerOnlyPermissions(mode: number): boolean {
  return (mode & 0o077) === 0 && (mode & 0o700) !== 0;
}

export function toOwnerOnlyWriteMode(mode: number): number {
  return (mode & DEFAULT_OWNER_ONLY_MODE) || DEFAULT_OWNER_ONLY_MODE;
}

export async function resolveOwnerOnlyWriteMode(filePath: string): Promise<number> {
  try {
    const existingMode = (await stat(filePath)).mode & 0o777;
    return toOwnerOnlyWriteMode(existingMode);
  } catch {
    return DEFAULT_OWNER_ONLY_MODE;
  }
}
