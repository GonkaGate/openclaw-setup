import type { OpenClawConfig } from "../types/settings.js";
import {
  createOpenClawClient,
  type CreateOpenClawClientOptions,
  type OpenClawClient
} from "./openclaw-client.js";
import {
  validateSettingsBeforeWrite,
  type ValidationFileDependencies
} from "./openclaw-config-validation.js";
import {
  verifyOpenClawRuntimeForInstall,
  verifyOpenClawRuntimeForVerify,
  type HealthyRuntimeVerificationResult,
  type InstallRuntimeCheckResult
} from "./verify-runtime.js";

export interface OpenClawFacade {
  ensureInstalled(): void;
  initializeBaseConfig(): void;
  validateCandidateConfig(targetPath: string, settings: OpenClawConfig): Promise<void>;
  validateConfig(filePath: string): void;
  verifyRuntimeForInstall(filePath: string, expectedPrimaryModelRef: string): InstallRuntimeCheckResult;
  verifyRuntimeForVerify(filePath: string, expectedPrimaryModelRef: string): HealthyRuntimeVerificationResult;
}

export interface CreateOpenClawFacadeOptions extends CreateOpenClawClientOptions {
  client?: OpenClawClient;
  validationFiles?: ValidationFileDependencies;
}

export function createOpenClawFacade(options: CreateOpenClawFacadeOptions = {}): OpenClawFacade {
  const client = options.client ?? createOpenClawClient(options);

  return {
    ensureInstalled: () => client.ensureInstalled(),
    initializeBaseConfig: () => client.initializeBaseConfig(),
    validateCandidateConfig: (targetPath, settings) =>
      validateSettingsBeforeWrite(targetPath, settings, client.validateConfig, options.validationFiles),
    validateConfig: (filePath) => client.validateConfig(filePath),
    verifyRuntimeForInstall: (filePath, expectedPrimaryModelRef) =>
      verifyOpenClawRuntimeForInstall(filePath, expectedPrimaryModelRef, client),
    verifyRuntimeForVerify: (filePath, expectedPrimaryModelRef) =>
      verifyOpenClawRuntimeForVerify(filePath, expectedPrimaryModelRef, client)
  };
}
