import { chmod, copyFile } from "node:fs/promises";

function toBackupSuffix(timestamp = new Date()): string {
  return timestamp.toISOString().replace(/[:.]/g, "-");
}

export async function createBackup(filePath: string): Promise<string> {
  const backupPath = `${filePath}.backup-${toBackupSuffix()}`;
  await copyFile(filePath, backupPath);
  await chmod(backupPath, 0o600);
  return backupPath;
}
