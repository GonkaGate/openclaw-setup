import { chmod, mkdir } from "node:fs/promises";
import path from "node:path";
import writeFileAtomic from "write-file-atomic";
import type { OpenClawConfig } from "../types/settings.js";
import { DEFAULT_OWNER_ONLY_MODE, normalizeOwnerOnlyPermissions } from "./file-permissions.js";
import { serializeSettings } from "./settings-serialization.js";

export async function writeSettings(filePath: string, settings: OpenClawConfig): Promise<void> {
  const directory = path.dirname(filePath);
  const content = serializeSettings(settings);

  await mkdir(directory, { recursive: true });
  await writeFileAtomic(filePath, content, {
    encoding: "utf8",
    fsync: true,
    mode: DEFAULT_OWNER_ONLY_MODE
  });
  await normalizeOwnerOnlyPermissions(filePath, chmod);
}
