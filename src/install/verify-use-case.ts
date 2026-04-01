import { toPrimaryModelRef } from "../constants/models.js";
import { createVerifySuccessDisplay, type CliDisplay } from "./cli-display.js";
import { SettingsMissingError } from "./install-errors.js";
import { loadSettings as loadSettingsImpl, requireLoadedSettings } from "./load-settings.js";
import { createOpenClawFacade, type OpenClawFacade } from "./openclaw-facade.js";
import { verifySettings as verifySettingsImpl } from "./verify-settings.js";

export interface VerifyRequest {
  targetPath: string;
}

export interface VerifyOutcome {
  configMode: number;
  display: CliDisplay;
  resolvedPrimaryModelRef: string;
  selectedModel: Awaited<ReturnType<typeof verifySettingsImpl>>["selectedModel"];
  targetPath: string;
}

export interface VerifyUseCaseDependencies {
  loadSettings: typeof loadSettingsImpl;
  openClaw: Pick<OpenClawFacade, "ensureInstalled" | "validateConfig" | "verifyRuntimeForVerify">;
  verifySettings: typeof verifySettingsImpl;
}

export const defaultVerifyUseCaseDependencies = {
  loadSettings: loadSettingsImpl,
  openClaw: createOpenClawFacade(),
  verifySettings: verifySettingsImpl
} satisfies VerifyUseCaseDependencies;

export async function runVerifyUseCase(
  request: VerifyRequest,
  dependencies: VerifyUseCaseDependencies = defaultVerifyUseCaseDependencies
): Promise<VerifyOutcome> {
  dependencies.openClaw.ensureInstalled();

  const loaded = requireLoadedSettings(
    await dependencies.loadSettings(request.targetPath),
    new SettingsMissingError(
      "target_config_missing",
      request.targetPath,
      `OpenClaw config was not found at ${request.targetPath}. Run "npx @gonkagate/openclaw" first.`
    )
  );

  dependencies.openClaw.validateConfig(request.targetPath);
  const result = await dependencies.verifySettings(request.targetPath, loaded.settings);
  const runtimeResult = dependencies.openClaw.verifyRuntimeForVerify(
    request.targetPath,
    toPrimaryModelRef(result.selectedModel)
  );

  return {
    configMode: result.configMode,
    display: createVerifySuccessDisplay({
      configMode: result.configMode,
      resolvedPrimaryModelRef: runtimeResult.resolvedPrimaryModelRef,
      selectedModel: result.selectedModel,
      targetPath: request.targetPath
    }),
    resolvedPrimaryModelRef: runtimeResult.resolvedPrimaryModelRef,
    selectedModel: result.selectedModel,
    targetPath: request.targetPath
  };
}
