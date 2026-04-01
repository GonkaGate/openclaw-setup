import process from "node:process";
import { pathToFileURL } from "node:url";
import { Command, CommanderError, Option } from "commander";
import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL } from "./constants/gateway.js";
import {
  DEFAULT_MODEL_KEY,
  SUPPORTED_MODELS,
  SUPPORTED_MODEL_KEYS,
  requireSupportedModel,
  toPrimaryModelRef
} from "./constants/models.js";
import { createBackup as createBackupImpl } from "./install/backup.js";
import { ensureFreshInstallLocalGateway as ensureFreshInstallLocalGatewayImpl } from "./install/bootstrap-gateway.js";
import {
  ensureOpenClawInstalled as ensureOpenClawInstalledImpl,
  initializeOpenClawBaseConfig as initializeOpenClawBaseConfigImpl
} from "./install/check-openclaw.js";
import { loadSettings as loadSettingsImpl } from "./install/load-settings.js";
import { mergeSettingsWithGonkaGate } from "./install/merge-settings.js";
import {
  validateOpenClawConfig as validateOpenClawConfigImpl,
  validateSettingsBeforeWrite as validateSettingsBeforeWriteImpl
} from "./install/openclaw-config-validation.js";
import { promptForApiKey as promptForApiKeyImpl, promptForModel as promptForModelImpl } from "./install/prompts.js";
import { getSettingsTarget as getSettingsTargetImpl } from "./install/settings-paths.js";
import { validateApiKey as validateApiKeyImpl } from "./install/validate-api-key.js";
import { formatUnixMode, verifySettings as verifySettingsImpl } from "./install/verify-settings.js";
import {
  OpenClawRuntimeVerificationError,
  verifyOpenClawRuntime as verifyOpenClawRuntimeImpl
} from "./install/verify-runtime.js";
import { writeSettings as writeSettingsImpl } from "./install/write-settings.js";
import type { SupportedModel, SupportedModelKey } from "./constants/models.js";

interface CliOptions {
  modelKey?: SupportedModelKey;
}

interface CliRequest extends CliOptions {
  command: "install" | "verify";
}

interface ParsedProgramOptions {
  model?: SupportedModelKey;
}

interface ProgramOutput {
  writeOut?: (str: string) => void;
  writeErr?: (str: string) => void;
}

interface CliDependencies {
  createBackup: typeof createBackupImpl;
  ensureOpenClawInstalled: typeof ensureOpenClawInstalledImpl;
  ensureFreshInstallLocalGateway: typeof ensureFreshInstallLocalGatewayImpl;
  getSettingsTarget: typeof getSettingsTargetImpl;
  initializeOpenClawBaseConfig: typeof initializeOpenClawBaseConfigImpl;
  loadSettings: typeof loadSettingsImpl;
  promptForApiKey: typeof promptForApiKeyImpl;
  promptForModel: typeof promptForModelImpl;
  validateApiKey: typeof validateApiKeyImpl;
  validateOpenClawConfig: typeof validateOpenClawConfigImpl;
  validateSettingsBeforeWrite: typeof validateSettingsBeforeWriteImpl;
  verifyOpenClawRuntime: typeof verifyOpenClawRuntimeImpl;
  verifySettings: typeof verifySettingsImpl;
  writeSettings: typeof writeSettingsImpl;
}

interface HealthyInstallRuntimeResult {
  resolvedPrimaryModelRef: string;
  status: "healthy";
}

interface GatewayUnavailableInstallRuntimeResult {
  nextCommand: "openclaw gateway";
  status: "gateway_unavailable";
}

type InstallRuntimeResult = HealthyInstallRuntimeResult | GatewayUnavailableInstallRuntimeResult;

interface InstallResult {
  backupPath?: string;
  configuredLocalGatewayMode: boolean;
  initializedBaseConfig: boolean;
  runtime: InstallRuntimeResult;
}

const defaultCliDependencies: CliDependencies = {
  createBackup: createBackupImpl,
  ensureOpenClawInstalled: ensureOpenClawInstalledImpl,
  ensureFreshInstallLocalGateway: ensureFreshInstallLocalGatewayImpl,
  getSettingsTarget: getSettingsTargetImpl,
  initializeOpenClawBaseConfig: initializeOpenClawBaseConfigImpl,
  loadSettings: loadSettingsImpl,
  promptForApiKey: promptForApiKeyImpl,
  promptForModel: promptForModelImpl,
  validateApiKey: validateApiKeyImpl,
  validateOpenClawConfig: validateOpenClawConfigImpl,
  validateSettingsBeforeWrite: validateSettingsBeforeWriteImpl,
  verifyOpenClawRuntime: verifyOpenClawRuntimeImpl,
  verifySettings: verifySettingsImpl,
  writeSettings: writeSettingsImpl
};

function rejectApiKeyArgs(argv: string[]): void {
  if (argv.some((arg) => arg === "--api-key" || arg.startsWith("--api-key="))) {
    throw new Error("Passing API keys via CLI arguments is intentionally unsupported. Run the installer interactively instead.");
  }
}

function createProgram(request: CliRequest, output?: ProgramOutput): Command {
  const supportedModelLines = SUPPORTED_MODELS.map((model) => {
    const defaultSuffix = model.key === DEFAULT_MODEL_KEY ? " (default)" : "";
    return `  ${model.key}  ${model.displayName}${defaultSuffix}`;
  }).join("\n");

  const program = new Command()
    .name("gonkagate-openclaw")
    .description("GonkaGate OpenClaw installer and config verifier")
    .addOption(
      new Option("--model <model-key>", "Skip the model prompt with a curated supported model.").choices(SUPPORTED_MODEL_KEYS)
    )
    .action((options: ParsedProgramOptions) => {
      request.command = "install";
      request.modelKey = options.model;
    })
    .helpOption("-h, --help", "Show this help.")
    .version("0.1.0", "-v, --version", "Show the package version.")
    .addHelpText(
      "after",
      `
Examples:
  npx @gonkagate/openclaw
  npx @gonkagate/openclaw --model ${DEFAULT_MODEL_KEY}
  npx @gonkagate/openclaw verify

Supported model keys:
${supportedModelLines}
`
    )
    .exitOverride();

  program
    .command("verify")
    .description("Check that OpenClaw is configured correctly for GonkaGate.")
    .action(() => {
      request.command = "verify";
    });

  if (output) {
    program.configureOutput(output);
  }

  return program;
}

export function parseCliRequest(argv: string[], output?: ProgramOutput): CliRequest {
  rejectApiKeyArgs(argv);

  const request: CliRequest = {
    command: "install"
  };
  const program = createProgram(request, output);
  program.parse(["node", "gonkagate-openclaw", ...argv]);

  return request;
}

export function parseCliOptions(argv: string[], output?: ProgramOutput): CliOptions {
  return {
    modelKey: parseCliRequest(argv, output).modelKey
  };
}

function printIntro(targetPath: string): void {
  console.log("Connect OpenClaw to GonkaGate in one step.\n");
  console.log("This installer updates your active OpenClaw config directly.");
  console.log(`Target config: ${targetPath}`);
  console.log(`Managed provider: models.providers.openai -> ${GONKAGATE_OPENAI_BASE_URL}`);
  console.log(`Managed API adapter: ${GONKAGATE_OPENAI_API}`);
  console.log(`Curated model choice: ${SUPPORTED_MODEL_KEYS.join(", ")}.\n`);
}

function printMissingConfigSetup(targetPath: string): void {
  console.log(`OpenClaw config was not found at ${targetPath}.`);
  console.log('Running "openclaw setup" once to initialize the base config and workspace before applying GonkaGate settings.\n');
}

function printSuccess(targetPath: string, selectedModel: SupportedModel, result: InstallResult): void {
  console.log("\nInstall complete.\n");
  console.log(`Config: ${targetPath}`);
  console.log(`Model: ${selectedModel.displayName} (${selectedModel.modelId})`);

  if (result.initializedBaseConfig) {
    console.log("Base setup: initialized automatically with OpenClaw defaults");
  }

  if (result.configuredLocalGatewayMode) {
    console.log('Gateway mode: set to "local" for first-run local startup');
  }

  if (result.backupPath) {
    console.log(`Backup: ${result.backupPath}`);
  }

  if (result.runtime.status === "gateway_unavailable") {
    console.log("\nNext step:");
    console.log(result.runtime.nextCommand);
    return;
  }

  console.log(`Resolved model: ${result.runtime.resolvedPrimaryModelRef}`);
  console.log("Gateway RPC: reachable");
  console.log("Health snapshot: ok");
  console.log("\nNext steps:");
  console.log("1. OpenClaw should hot-reload this config automatically.");
  console.log("2. Verify with: npx @gonkagate/openclaw verify");
  console.log("3. Double-check the resolved model with: openclaw models status");
  console.log("4. In chat, run: /status");
  console.log("5. If the change does not appear, run: openclaw gateway restart");
}

function printVerifyIntro(targetPath: string): void {
  console.log("Verify the local OpenClaw config for GonkaGate.\n");
  console.log("This command is read-only and checks both your active OpenClaw config and the active local runtime.");
  console.log(`Target config: ${targetPath}`);
  console.log(`Expected provider: models.providers.openai -> ${GONKAGATE_OPENAI_BASE_URL}`);
  console.log(`Expected API adapter: ${GONKAGATE_OPENAI_API}\n`);
}

function printVerifySuccess(
  targetPath: string,
  selectedModel: SupportedModel,
  configMode: number,
  resolvedPrimaryModelRef: string
): void {
  console.log("\nVerification complete.\n");
  console.log(`Config: ${targetPath}`);
  console.log(`Model: ${selectedModel.displayName} (${selectedModel.modelId})`);
  console.log(`Resolved model: ${resolvedPrimaryModelRef}`);
  console.log("API key: present and matches the expected gp-... format");
  console.log(`Permissions: ${formatUnixMode(configMode)}`);
  console.log("Gateway RPC: reachable");
  console.log("Health snapshot: ok");
  console.log("\nOpenClaw is configured correctly for GonkaGate.");
}

async function runInstall(
  targetPath: string,
  options: CliOptions,
  cliDependencies: CliDependencies
): Promise<void> {
  printIntro(targetPath);
  cliDependencies.ensureOpenClawInstalled();

  const initialLoad = await cliDependencies.loadSettings(targetPath);
  let loaded = initialLoad;
  let initializedBaseConfig = false;
  let configuredLocalGatewayMode = false;

  if (!initialLoad.exists) {
    printMissingConfigSetup(targetPath);
    cliDependencies.initializeOpenClawBaseConfig();
    loaded = await cliDependencies.loadSettings(targetPath);
    initializedBaseConfig = true;

    if (!loaded.exists) {
      throw new Error(
        `OpenClaw setup completed but did not create ${targetPath}. Run "openclaw setup" manually, then rerun this installer.`
      );
    }

    const gatewayBootstrap = cliDependencies.ensureFreshInstallLocalGateway(loaded.settings);
    loaded = {
      ...loaded,
      settings: gatewayBootstrap.settings
    };
    configuredLocalGatewayMode = gatewayBootstrap.configuredLocalMode;
  }

  cliDependencies.validateOpenClawConfig(targetPath);

  const apiKey = cliDependencies.validateApiKey(await cliDependencies.promptForApiKey());
  const selectedModel = options.modelKey
    ? requireSupportedModel(options.modelKey)
    : await cliDependencies.promptForModel(SUPPORTED_MODELS, DEFAULT_MODEL_KEY);
  const mergedSettings = mergeSettingsWithGonkaGate(loaded.settings, apiKey, selectedModel);
  await cliDependencies.validateSettingsBeforeWrite(targetPath, mergedSettings);
  const backupPath = initialLoad.exists ? await cliDependencies.createBackup(targetPath) : undefined;

  await cliDependencies.writeSettings(targetPath, mergedSettings);
  const runtime = verifyInstallRuntime(targetPath, toPrimaryModelRef(selectedModel), cliDependencies.verifyOpenClawRuntime);
  printSuccess(targetPath, selectedModel, {
    backupPath,
    configuredLocalGatewayMode,
    initializedBaseConfig,
    runtime
  });
}

async function runVerify(targetPath: string, cliDependencies: CliDependencies): Promise<void> {
  printVerifyIntro(targetPath);
  cliDependencies.ensureOpenClawInstalled();

  const loaded = await cliDependencies.loadSettings(targetPath);

  if (!loaded.exists) {
    throw new Error(`OpenClaw config was not found at ${targetPath}. Run "npx @gonkagate/openclaw" first.`);
  }

  cliDependencies.validateOpenClawConfig(targetPath);
  const result = await cliDependencies.verifySettings(targetPath, loaded.settings);
  const runtimeResult = cliDependencies.verifyOpenClawRuntime(targetPath, toPrimaryModelRef(result.selectedModel));
  printVerifySuccess(targetPath, result.selectedModel, result.configMode, runtimeResult.resolvedPrimaryModelRef);
}

function verifyInstallRuntime(
  targetPath: string,
  expectedPrimaryModelRef: string,
  verifyOpenClawRuntime: CliDependencies["verifyOpenClawRuntime"]
): InstallRuntimeResult {
  try {
    const result = verifyOpenClawRuntime(targetPath, expectedPrimaryModelRef);
    return {
      resolvedPrimaryModelRef: result.resolvedPrimaryModelRef,
      status: "healthy"
    };
  } catch (error) {
    if (error instanceof OpenClawRuntimeVerificationError && error.kind === "gateway_unavailable") {
      return {
        nextCommand: "openclaw gateway",
        status: "gateway_unavailable"
      };
    }

    throw error;
  }
}

export async function run(argv = process.argv.slice(2), dependencies: Partial<CliDependencies> = {}): Promise<void> {
  const cliDependencies = {
    ...defaultCliDependencies,
    ...dependencies
  };
  const request = parseCliRequest(argv);
  const target = cliDependencies.getSettingsTarget();

  if (request.command === "verify") {
    await runVerify(target.path, cliDependencies);
    return;
  }

  await runInstall(target.path, request, cliDependencies);
}

function handleCliError(error: unknown): void {
  if (error instanceof CommanderError) {
    process.exitCode = error.exitCode;
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nError: ${message}`);
  process.exitCode = 1;
}

const isEntrypoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  run().catch(handleCliError);
}
