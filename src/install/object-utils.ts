export type PlainObject = Record<string, unknown>;

export function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asPlainObject(value: unknown): PlainObject | undefined {
  return isPlainObject(value) ? value : undefined;
}

export function toPlainObject(value: unknown): PlainObject {
  const plainObject = asPlainObject(value);

  return plainObject ? { ...plainObject } : {};
}

export function copyArray<Value>(value: readonly Value[] | undefined): Value[] {
  return value ? [...value] : [];
}
