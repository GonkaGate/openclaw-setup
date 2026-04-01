import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

export async function createTempDirectory(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

export async function createTempFilePath(prefix: string, fileName = "openclaw.json"): Promise<string> {
  const directory = await createTempDirectory(prefix);
  return path.join(directory, fileName);
}

export async function withMutedConsoleLog<T>(fn: () => Promise<T> | T): Promise<T> {
  const originalConsoleLog = console.log;
  console.log = (() => {}) as typeof console.log;

  try {
    return await fn();
  } finally {
    console.log = originalConsoleLog;
  }
}

export async function withCapturedConsoleLog<T>(
  fn: () => Promise<T> | T
): Promise<{
  logs: string[];
  result: T;
}> {
  const logs: string[] = [];
  const originalConsoleLog = console.log;
  console.log = ((...args: unknown[]) => {
    logs.push(args.map((arg) => String(arg)).join(" "));
  }) as typeof console.log;

  try {
    return {
      logs,
      result: await fn()
    };
  } finally {
    console.log = originalConsoleLog;
  }
}

export async function withPatchedTty<T>(
  stdinIsTTY: boolean | undefined,
  stdoutIsTTY: boolean | undefined,
  fn: () => Promise<T> | T
): Promise<T> {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");

  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value: stdinIsTTY
  });
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: stdoutIsTTY
  });

  try {
    return await fn();
  } finally {
    restoreProperty(process.stdin, "isTTY", stdinDescriptor);
    restoreProperty(process.stdout, "isTTY", stdoutDescriptor);
  }
}

function restoreProperty(target: object, property: string, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor);
    return;
  }

  Reflect.deleteProperty(target, property);
}
