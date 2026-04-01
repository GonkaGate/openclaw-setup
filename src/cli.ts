import process from "node:process";
import { pathToFileURL } from "node:url";
import { Command, CommanderError, Option } from "commander";
import { GONKAGATE_OPENAI_API, GONKAGATE_OPENAI_BASE_URL } from "./constants/gateway.js";
import {
  DEFAULT_MODEL_KEY,
  SUPPORTED_MODELS,
  SUPPORTED_MODEL_KEYS
} from "./constants/models.js";
import type { CliDisplay } from "./install/cli-display.js";
import { runInstallUseCase as runInstallUseCaseImpl } from "./install/install-use-case.js";
import { getSettingsTarget as getSettingsTargetImpl } from "./install/settings-paths.js";
import { runVerifyUseCase as runVerifyUseCaseImpl } from "./install/verify-use-case.js";
import type { SupportedModelKey } from "./constants/models.js";

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

interface CliHandlers {
  onInstall: (options: ParsedProgramOptions) => void;
  onVerify: () => void;
}

interface CliDependencies {
  getSettingsTarget: typeof getSettingsTargetImpl;
  runInstallUseCase: typeof runInstallUseCaseImpl;
  runVerifyUseCase: typeof runVerifyUseCaseImpl;
}

const defaultCliDependencies = {
  getSettingsTarget: getSettingsTargetImpl,
  runInstallUseCase: runInstallUseCaseImpl,
  runVerifyUseCase: runVerifyUseCaseImpl
} satisfies CliDependencies;

function rejectApiKeyArgs(argv: string[]): void {
  if (argv.some((arg) => arg === "--api-key" || arg.startsWith("--api-key="))) {
    throw new Error("Passing API keys via CLI arguments is intentionally unsupported. Run the installer interactively instead.");
  }
}

function createProgram(handlers: CliHandlers, output?: ProgramOutput): Command {
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
    .action(handlers.onInstall)
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
    .action(handlers.onVerify);

  if (output) {
    program.configureOutput(output);
  }

  return program;
}

export function parseCliRequest(argv: string[], output?: ProgramOutput): CliRequest {
  rejectApiKeyArgs(argv);

  let request: CliRequest = {
    command: "install"
  };
  const program = createProgram(
    {
      onInstall: (options) => {
        request = {
          command: "install",
          modelKey: options.model
        };
      },
      onVerify: () => {
        request = {
          command: "verify"
        };
      }
    },
    output
  );
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

function printVerifyIntro(targetPath: string): void {
  console.log("Verify the local OpenClaw config for GonkaGate.\n");
  console.log("This command is read-only and checks both your active OpenClaw config and the active local runtime.");
  console.log(`Target config: ${targetPath}`);
  console.log(`Expected provider: models.providers.openai -> ${GONKAGATE_OPENAI_BASE_URL}`);
  console.log(`Expected API adapter: ${GONKAGATE_OPENAI_API}\n`);
}

function printDisplay(display: CliDisplay): void {
  for (const section of display.sections) {
    console.log("");

    if (section.heading) {
      console.log(section.heading);
      console.log("");
    }

    for (const line of section.lines) {
      console.log(line);
    }
  }
}

async function runInstall(
  targetPath: string,
  options: CliOptions,
  cliDependencies: CliDependencies
): Promise<void> {
  printIntro(targetPath);
  const request = options.modelKey
    ? {
        modelKey: options.modelKey,
        targetPath
      }
    : {
        targetPath
      };
  const result = await cliDependencies.runInstallUseCase(request);

  printDisplay(result.display);
}

async function runVerify(targetPath: string, cliDependencies: CliDependencies): Promise<void> {
  printVerifyIntro(targetPath);
  const result = await cliDependencies.runVerifyUseCase({
    targetPath
  });

  printDisplay(result.display);
}

export async function run(argv = process.argv.slice(2), dependencies: Partial<CliDependencies> = {}): Promise<void> {
  const cliDependencies: CliDependencies = {
    ...defaultCliDependencies,
    ...dependencies
  };
  const request = parseCliRequest(argv);
  const targetPath = cliDependencies.getSettingsTarget();

  if (request.command === "verify") {
    await runVerify(targetPath, cliDependencies);
    return;
  }

  await runInstall(targetPath, request, cliDependencies);
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
