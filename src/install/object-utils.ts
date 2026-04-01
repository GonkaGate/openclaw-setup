export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asPlainObject(value: unknown): Record<string, unknown> | undefined {
  return isPlainObject(value) ? value : undefined;
}

export function clonePlainObject(value: Record<string, unknown> | undefined): Record<string, unknown> {
  return value ? { ...value } : {};
}
