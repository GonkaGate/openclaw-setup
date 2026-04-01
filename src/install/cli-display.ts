import type { SupportedModel } from "../constants/models.js";
import { formatUnixMode } from "./file-permissions.js";

export interface CliDisplaySection {
  heading?: string;
  lines: readonly string[];
}

export interface CliDisplay {
  sections: readonly CliDisplaySection[];
}

interface InstallDisplayInput {
  backupPath?: string;
  configPreparation: {
    addedLocalGatewayMode: boolean;
    source: "existing" | "fresh";
  };
  runtime:
    | {
        kind: "gateway_unavailable";
        nextCommand: string;
      }
    | {
        kind: "healthy";
        resolvedPrimaryModelRef: string;
      };
  selectedModel: SupportedModel;
  targetPath: string;
}

interface VerifyDisplayInput {
  configMode: number;
  resolvedPrimaryModelRef: string;
  selectedModel: SupportedModel;
  targetPath: string;
}

export function createInstallSuccessDisplay(input: InstallDisplayInput): CliDisplay {
  const summaryLines = [
    `Config: ${input.targetPath}`,
    `Model: ${input.selectedModel.displayName} (${input.selectedModel.modelId})`,
    ...(input.configPreparation.source === "fresh"
      ? ["Base setup: initialized automatically with OpenClaw defaults"]
      : []),
    ...(input.configPreparation.addedLocalGatewayMode
      ? ['Gateway mode: set to "local" for first-run local startup']
      : []),
    ...(input.backupPath ? [`Backup: ${input.backupPath}`] : [])
  ];

  if (input.runtime.kind === "gateway_unavailable") {
    return {
      sections: [
        {
          heading: "Install complete.",
          lines: summaryLines
        },
        {
          heading: "Next step:",
          lines: [input.runtime.nextCommand]
        }
      ]
    };
  }

  return {
    sections: [
      {
        heading: "Install complete.",
        lines: summaryLines
      },
      {
        lines: [
          `Resolved model: ${input.runtime.resolvedPrimaryModelRef}`,
          "Gateway RPC: reachable",
          "Health snapshot: ok"
        ]
      },
      {
        heading: "Next steps:",
        lines: [
          "1. OpenClaw should hot-reload this config automatically.",
          "2. Verify with: npx @gonkagate/openclaw verify",
          "3. Double-check the resolved model with: openclaw models status",
          "4. In chat, run: /status",
          "5. If the change does not appear, run: openclaw gateway restart"
        ]
      }
    ]
  };
}

export function createVerifySuccessDisplay(input: VerifyDisplayInput): CliDisplay {
  return {
    sections: [
      {
        heading: "Verification complete.",
        lines: [
          `Config: ${input.targetPath}`,
          `Model: ${input.selectedModel.displayName} (${input.selectedModel.modelId})`,
          `Resolved model: ${input.resolvedPrimaryModelRef}`,
          "API key: present and matches the expected gp-... format",
          `Permissions: ${formatUnixMode(input.configMode)}`,
          "Gateway RPC: reachable",
          "Health snapshot: ok"
        ]
      },
      {
        lines: ["OpenClaw is configured correctly for GonkaGate."]
      }
    ]
  };
}
