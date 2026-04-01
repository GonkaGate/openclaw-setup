import { DEFAULT_MODEL_KEY, SUPPORTED_MODELS, requireSupportedModel, toPrimaryModelRef } from "../constants/models.js";
import type { SupportedModel, SupportedModelKey } from "../constants/models.js";
import type { OpenClawConfig } from "../types/settings.js";
import { createBackup as createBackupImpl } from "./backup.js";
import { ensureFreshInstallLocalGateway as ensureFreshInstallLocalGatewayImpl } from "./bootstrap-gateway.js";
import { createOpenClawClient, type OpenClawClient } from "./openclaw-client.js";
import { loadSettings as loadSettingsImpl, requireLoadedSettings } from "./load-settings.js";
import { mergeSettingsWithGonkaGate } from "./merge-settings.js";
import { validateSettingsBeforeWrite as validateSettingsBeforeWriteImpl } from "./openclaw-config-validation.js";
import { promptForApiKey as promptForApiKeyImpl, promptForModel as promptForModelImpl } from "./prompts.js";
import { validateApiKey as validateApiKeyImpl } from "./validate-api-key.js";
import {
  verifyOpenClawRuntimeForInstall as verifyOpenClawRuntimeForInstallImpl,
  type InstallRuntimeCheckResult
} from "./verify-runtime.js";
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
  runtime: InstallRuntimeCheckResult;
  selectedModel: SupportedModel;
  targetPath: string;
}

export interface InstallUseCaseDependencies {
  createBackup: typeof createBackupImpl;
  ensureFreshInstallLocalGateway: typeof ensureFreshInstallLocalGatewayImpl;
  loadSettings: typeof loadSettingsImpl;
  openClaw: Pick<OpenClawClient, "ensureInstalled" | "initializeBaseConfig" | "validateConfig">;
  promptForApiKey: typeof promptForApiKeyImpl;
  promptForModel: typeof promptForModelImpl;
  validateApiKey: typeof validateApiKeyImpl;
  validateSettingsBeforeWrite: typeof validateSettingsBeforeWriteImpl;
  verifyOpenClawRuntimeForInstall: typeof verifyOpenClawRuntimeForInstallImpl;
  writeSettings: typeof writeSettingsImpl;
}

export const defaultInstallUseCaseDependencies = {
  createBackup: createBackupImpl,
  ensureFreshInstallLocalGateway: ensureFreshInstallLocalGatewayImpl,
  loadSettings: loadSettingsImpl,
  openClaw: createOpenClawClient(),
  promptForApiKey: promptForApiKeyImpl,
  promptForModel: promptForModelImpl,
  validateApiKey: validateApiKeyImpl,
  validateSettingsBeforeWrite: validateSettingsBeforeWriteImpl,
  verifyOpenClawRuntimeForInstall: verifyOpenClawRuntimeForInstallImpl,
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

  await dependencies.validateSettingsBeforeWrite(request.targetPath, mergedSettings);
  const backupPath = configPreparation.source === "existing" ? await dependencies.createBackup(request.targetPath) : undefined;

  await dependencies.writeSettings(request.targetPath, mergedSettings);
  const runtime = dependencies.verifyOpenClawRuntimeForInstall(request.targetPath, toPrimaryModelRef(selectedModel));

  return {
    backupPath,
    configPreparation,
    runtime,
    selectedModel,
    targetPath: request.targetPath
  };
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
    `OpenClaw setup completed but did not create ${targetPath}. Run "openclaw setup" manually, then rerun this installer.`
  );
  const gatewayBootstrap = dependencies.ensureFreshInstallLocalGateway(loadedSettings.settings);

  return {
    addedLocalGatewayMode: gatewayBootstrap.addedLocalGatewayMode,
    settings: gatewayBootstrap.settings,
    source: "fresh"
  };
}
