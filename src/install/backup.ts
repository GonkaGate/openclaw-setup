import { chmod, copyFile } from "node:fs/promises";
import { DEFAULT_OWNER_ONLY_MODE } from "./file-permissions.js";

function toBackupSuffix(timestamp = new Date()): string {
  return timestamp.toISOString().replace(/[:.]/g, "-");
}

export async function createBackup(filePath: string): Promise<string> {
  const backupPath = `${filePath}.backup-${toBackupSuffix()}`;
  await copyFile(filePath, backupPath);
  await chmod(backupPath, DEFAULT_OWNER_ONLY_MODE);
  return backupPath;
}
