import { OPENCLAW_PROVIDER_ID } from "./gateway.js";

export interface GonkaGateModel {
  displayName: string;
  key: string;
  modelId: string;
}

export type GonkaGateModelKey = string;
export type GonkaGatePrimaryModelRef = `${typeof OPENCLAW_PROVIDER_ID}/${string}`;

export interface ManagedAllowlistEntry {
  alias: string;
}

export interface ManagedModelSelection {
  allowlistEntry: ManagedAllowlistEntry;
  primaryModelRef: GonkaGatePrimaryModelRef;
  selectedModel: GonkaGateModel;
}

export function toPrimaryModelRef(model: GonkaGateModel): GonkaGatePrimaryModelRef {
  return `${OPENCLAW_PROVIDER_ID}/${model.modelId}`;
}

export function toManagedModelSelection(selectedModel: GonkaGateModel): ManagedModelSelection {
  return {
    allowlistEntry: {
      alias: selectedModel.modelId
    },
    primaryModelRef: toPrimaryModelRef(selectedModel),
    selectedModel
  };
}

export function modelFromPrimaryRef(primaryModelRef: string, displayName?: string): GonkaGateModel | undefined {
  const prefix = `${OPENCLAW_PROVIDER_ID}/`;

  if (!primaryModelRef.startsWith(prefix) || primaryModelRef.length === prefix.length) {
    return undefined;
  }

  const modelId = primaryModelRef.slice(prefix.length);

  return {
    displayName: displayName ?? modelId,
    key: modelId,
    modelId
  };
}
