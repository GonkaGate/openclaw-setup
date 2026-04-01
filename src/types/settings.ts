/**
 * Broad parsed OpenClaw config bag after the root JSON/JSON5 object check.
 * Callers must validate any managed subtrees before trusting them.
 */
export interface OpenClawConfig {
  models?: Record<string, unknown>;
  agents?: Record<string, unknown>;
  gateway?: Record<string, unknown>;
  [key: string]: unknown;
}
