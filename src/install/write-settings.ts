import { chmod, mkdir } from "node:fs/promises";
import path from "node:path";
import writeFileAtomic from "write-file-atomic";
import type { OpenClawConfig } from "../types/settings.js";
import { resolveOwnerOnlyWriteMode } from "./file-permissions.js";

export async function writeSettings(filePath: string, settings: OpenClawConfig): Promise<void> {
  const directory = path.dirname(filePath);
  const content = `${JSON.stringify(settings, null, 2)}\n`;
  const targetMode = await resolveOwnerOnlyWriteMode(filePath);

  await mkdir(directory, { recursive: true });
  await writeFileAtomic(filePath, content, {
    encoding: "utf8",
    fsync: true,
    mode: targetMode
  });
  await chmod(filePath, targetMode);
}
