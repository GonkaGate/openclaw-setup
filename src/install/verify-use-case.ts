import { toPrimaryModelRef } from "../constants/models.js";
import { createOpenClawClient, type OpenClawClient } from "./openclaw-client.js";
import { loadSettings as loadSettingsImpl, requireLoadedSettings } from "./load-settings.js";
import { verifyOpenClawRuntimeForVerify as verifyOpenClawRuntimeForVerifyImpl } from "./verify-runtime.js";
import { verifySettings as verifySettingsImpl } from "./verify-settings.js";

export interface VerifyRequest {
  targetPath: string;
}

export interface VerifyOutcome {
  configMode: number;
  resolvedPrimaryModelRef: string;
  selectedModel: Awaited<ReturnType<typeof verifySettingsImpl>>["selectedModel"];
  targetPath: string;
}

export interface VerifyUseCaseDependencies {
  loadSettings: typeof loadSettingsImpl;
  openClaw: Pick<OpenClawClient, "ensureInstalled" | "validateConfig">;
  verifyOpenClawRuntimeForVerify: typeof verifyOpenClawRuntimeForVerifyImpl;
  verifySettings: typeof verifySettingsImpl;
}

export const defaultVerifyUseCaseDependencies = {
  loadSettings: loadSettingsImpl,
  openClaw: createOpenClawClient(),
  verifyOpenClawRuntimeForVerify: verifyOpenClawRuntimeForVerifyImpl,
  verifySettings: verifySettingsImpl
} satisfies VerifyUseCaseDependencies;

export async function runVerifyUseCase(
  request: VerifyRequest,
  dependencies: VerifyUseCaseDependencies = defaultVerifyUseCaseDependencies
): Promise<VerifyOutcome> {
  dependencies.openClaw.ensureInstalled();

  const loaded = requireLoadedSettings(
    await dependencies.loadSettings(request.targetPath),
    `OpenClaw config was not found at ${request.targetPath}. Run "npx @gonkagate/openclaw" first.`
  );

  dependencies.openClaw.validateConfig(request.targetPath);
  const result = await dependencies.verifySettings(request.targetPath, loaded.settings);
  const runtimeResult = dependencies.verifyOpenClawRuntimeForVerify(
    request.targetPath,
    toPrimaryModelRef(result.selectedModel)
  );

  return {
    configMode: result.configMode,
    resolvedPrimaryModelRef: runtimeResult.resolvedPrimaryModelRef,
    selectedModel: result.selectedModel,
    targetPath: request.targetPath
  };
}
