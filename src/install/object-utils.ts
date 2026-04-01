export type PlainObject = Record<string, unknown>;

export function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asPlainObject(value: unknown): PlainObject | undefined {
  return isPlainObject(value) ? value : undefined;
}

export function copyPlainObject(value: PlainObject | undefined): PlainObject {
  return value ? { ...value } : {};
}
