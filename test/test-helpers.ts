import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL } from "../src/constants/gateway.js";
import { toPrimaryModelRef, type GonkaGateModel } from "../src/constants/models.js";
import { createGonkaGateModelCatalog, type LiveGonkaGateModel } from "../src/install/gonkagate-models.js";
import type { OpenClawConfig } from "../src/types/settings.js";

export const TEST_LIVE_MODELS: readonly LiveGonkaGateModel[] = [
  {
    id: "acme/model-alpha",
    name: "Acme Model Alpha"
  },
  {
    id: "globex/model-beta",
    name: "Globex Model Beta"
  }
];

export const TEST_MODEL: GonkaGateModel = {
  displayName: "Acme Model Alpha",
  key: "acme/model-alpha",
  modelId: "acme/model-alpha"
};

export const TEST_MODEL_BETA: GonkaGateModel = {
  displayName: "Globex Model Beta",
  key: "globex/model-beta",
  modelId: "globex/model-beta"
};

export function createTestModelCatalog(models: readonly LiveGonkaGateModel[] = TEST_LIVE_MODELS) {
  return createGonkaGateModelCatalog(models);
}

export async function createTempDirectory(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

export async function createTempFilePath(prefix: string, fileName = "openclaw.json"): Promise<string> {
  const directory = await createTempDirectory(prefix);
  return path.join(directory, fileName);
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

interface ManagedConfigFixtureOptions {
  allowlist?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  includeAllowlist?: boolean;
  includeOpenAiModels?: boolean;
  openaiProvider?: Record<string, unknown>;
  primaryModelRef?: string;
  selectedModel?: GonkaGateModel;
}

export function createManagedConfigFixture(options: ManagedConfigFixtureOptions = {}): OpenClawConfig {
  const selectedModel = options.selectedModel ?? TEST_MODEL;
  const primaryModelRef = options.primaryModelRef ?? toPrimaryModelRef(selectedModel);
  const defaults = asRecord(options.defaults);
  const defaultModel = asRecord(defaults.model);
  const modelCatalog = createTestModelCatalog();
  const allowlist = options.allowlist ?? Object.fromEntries(
    modelCatalog.map((entry) => [entry.primaryModelRef, entry.allowlistEntry])
  );

  return {
    models: {
      providers: {
        openai: {
          baseUrl: GONKAGATE_OPENAI_BASE_URL,
          api: GONKAGATE_OPENAI_API,
          apiKey: "gp-test-key",
          ...(options.includeOpenAiModels === false
            ? {}
            : { models: modelCatalog.map((entry) => entry.providerModel) }),
          ...options.openaiProvider
        }
      }
    },
    agents: {
      defaults: {
        ...defaults,
        model: {
          ...defaultModel,
          primary: primaryModelRef
        },
        ...(options.includeAllowlist === false ? {} : { models: allowlist })
      }
    }
  };
}

function restoreProperty(target: object, property: string, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor);
    return;
  }

  Reflect.deleteProperty(target, property);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
