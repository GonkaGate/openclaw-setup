import { chmod, copyFile } from "node:fs/promises";
import { normalizeOwnerOnlyPermissions } from "./file-permissions.js";

function toBackupSuffix(timestamp = new Date()): string {
  return timestamp.toISOString().replace(/[:.]/g, "-");
}

export async function createBackup(filePath: string): Promise<string> {
  const backupPath = `${filePath}.backup-${toBackupSuffix()}`;
  await copyFile(filePath, backupPath);
  await normalizeOwnerOnlyPermissions(backupPath, chmod);
  return backupPath;
}
