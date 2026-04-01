export type PlainObject = Record<string, unknown>;
export type ReadonlyPlainObject = Readonly<PlainObject>;

export function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

export function asPlainObject(value: unknown): PlainObject | undefined {
  return isPlainObject(value) ? value : undefined;
}

export function clonePlainArray(value: readonly unknown[]): unknown[] {
  return value.map((entry) => cloneUnknownValue(entry));
}

export function clonePlainObject(value: PlainObject | ReadonlyPlainObject): PlainObject {
  const clone = createPlainObject();

  for (const [key, entry] of Object.entries(value)) {
    definePlainProperty(clone, key, cloneUnknownValue(entry));
  }

  return clone;
}

export function cloneUnknownValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return clonePlainArray(value);
  }

  const objectValue = asPlainObject(value);

  return objectValue ? clonePlainObject(objectValue) : value;
}

export function copyPlainObject(value: PlainObject | ReadonlyPlainObject | undefined): PlainObject {
  return value ? clonePlainObject(value) : createPlainObject();
}

function createPlainObject(): PlainObject {
  return {};
}

function definePlainProperty(target: PlainObject, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
}
