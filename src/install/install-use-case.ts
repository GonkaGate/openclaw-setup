import { DEFAULT_MODEL_KEY, SUPPORTED_MODELS, requireSupportedModel, toPrimaryModelRef } from "../constants/models.js";
import type { SupportedModel, SupportedModelKey } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { createBackup as createBackupImpl } from "./backup.js";
import { ensureFreshInstallLocalGateway as ensureFreshInstallLocalGatewayImpl } from "./bootstrap-gateway.js";
import { createInstallSuccessDisplay, type CliDisplay } from "./cli-display.js";
import { loadSettings as loadSettingsImpl, requireLoadedSettings } from "./load-settings.js";
import { mergeSettingsWithGonkaGate } from "./merge-settings.js";
import { createOpenClawFacade, type OpenClawFacade } from "./openclaw-facade.js";
import { markInstallErrorConfigWritten, SettingsMissingError } from "./install-errors.js";
import { promptForApiKey as promptForApiKeyImpl, promptForModel as promptForModelImpl } from "./prompts.js";
import { validateApiKey as validateApiKeyImpl } from "./validate-api-key.js";
import { type InstallRuntimeCheckResult } from "./verify-runtime.js";
import { writeSettings as writeSettingsImpl } from "./write-settings.js";

export interface InstallConfigPreparationResult {
  addedLocalGatewayMode: boolean;
  settings: OpenClawConfig;
  source: "existing" | "fresh";
}

export interface InstallRequest {
  modelKey?: SupportedModelKey;
  targetPath: string;
}

export interface InstallOutcome {
  backupPath?: string;
  configPreparation: InstallConfigPreparationResult;
  display: CliDisplay;
  runtime: InstallRuntimeCheckResult;
  selectedModel: SupportedModel;
  targetPath: string;
}

export interface InstallUseCaseDependencies {
  createBackup: typeof createBackupImpl;
  ensureFreshInstallLocalGateway: typeof ensureFreshInstallLocalGatewayImpl;
  loadSettings: typeof loadSettingsImpl;
  openClaw: Pick<
    OpenClawFacade,
    "ensureInstalled" | "initializeBaseConfig" | "validateCandidateConfig" | "validateConfig" | "verifyRuntimeForInstall"
  >;
  promptForApiKey: typeof promptForApiKeyImpl;
  promptForModel: typeof promptForModelImpl;
  validateApiKey: typeof validateApiKeyImpl;
  writeSettings: typeof writeSettingsImpl;
}

export const defaultInstallUseCaseDependencies = {
  createBackup: createBackupImpl,
  ensureFreshInstallLocalGateway: ensureFreshInstallLocalGatewayImpl,
  loadSettings: loadSettingsImpl,
  openClaw: createOpenClawFacade(),
  promptForApiKey: promptForApiKeyImpl,
  promptForModel: promptForModelImpl,
  validateApiKey: validateApiKeyImpl,
  writeSettings: writeSettingsImpl
} satisfies InstallUseCaseDependencies;

export async function runInstallUseCase(
  request: InstallRequest,
  dependencies: InstallUseCaseDependencies = defaultInstallUseCaseDependencies
): Promise<InstallOutcome> {
  dependencies.openClaw.ensureInstalled();
  const configPreparation = await prepareInstallConfig(request.targetPath, dependencies);

  dependencies.openClaw.validateConfig(request.targetPath);

  const apiKey = dependencies.validateApiKey(await dependencies.promptForApiKey());
  const selectedModel = request.modelKey
    ? requireSupportedModel(request.modelKey)
    : await dependencies.promptForModel(SUPPORTED_MODELS, DEFAULT_MODEL_KEY);
  const mergedSettings = mergeSettingsWithGonkaGate(configPreparation.settings, apiKey, selectedModel);

  await dependencies.openClaw.validateCandidateConfig(request.targetPath, mergedSettings);
  const backupPath = configPreparation.source === "existing" ? await dependencies.createBackup(request.targetPath) : undefined;

  await dependencies.writeSettings(request.targetPath, mergedSettings);

  try {
    const runtime = dependencies.openClaw.verifyRuntimeForInstall(request.targetPath, toPrimaryModelRef(selectedModel));

    return {
      backupPath,
      configPreparation,
      display: createInstallSuccessDisplay({
        backupPath,
        configPreparation,
        runtime,
        selectedModel,
        targetPath: request.targetPath
      }),
      runtime,
      selectedModel,
      targetPath: request.targetPath
    };
  } catch (error) {
    throw markInstallErrorConfigWritten(error, request.targetPath);
  }
}

async function prepareInstallConfig(
  targetPath: string,
  dependencies: Pick<InstallUseCaseDependencies, "ensureFreshInstallLocalGateway" | "loadSettings" | "openClaw">
): Promise<InstallConfigPreparationResult> {
  const initialLoad = await dependencies.loadSettings(targetPath);

  if (initialLoad.kind === "loaded") {
    return {
      addedLocalGatewayMode: false,
      settings: initialLoad.settings,
      source: "existing"
    };
  }

  dependencies.openClaw.initializeBaseConfig();

  const loadedSettings = requireLoadedSettings(
    await dependencies.loadSettings(targetPath),
    new SettingsMissingError(
      "post_setup_target_missing",
      targetPath,
      `OpenClaw setup completed but did not create ${targetPath}. Run "openclaw setup" manually, then rerun this installer.`
    )
  );
  const gatewayBootstrap = dependencies.ensureFreshInstallLocalGateway(loadedSettings.settings);

  return {
    addedLocalGatewayMode: gatewayBootstrap.addedLocalGatewayMode,
    settings: gatewayBootstrap.settings,
    source: "fresh"
  };
}
