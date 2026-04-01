import { chmod } from "node:fs/promises";

export type ChmodFile = typeof chmod;

export const DEFAULT_OWNER_ONLY_MODE = 0o600;

export function formatUnixMode(mode: number): string {
  return `0o${mode.toString(8).padStart(3, "0")}`;
}

export function hasOwnerOnlyPermissions(mode: number): boolean {
  return mode === DEFAULT_OWNER_ONLY_MODE;
}

export async function normalizeOwnerOnlyPermissions(
  filePath: string,
  chmodFile: ChmodFile = chmod
): Promise<void> {
  await chmodFile(filePath, DEFAULT_OWNER_ONLY_MODE);
}
