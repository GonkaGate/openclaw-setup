import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MODEL, toPrimaryModelRef } from "../src/constants/models.js";
import { readManagedSettingsView } from "../src/install/managed-settings-access.js";
import type { OpenClawConfig } from "../src/types/settings.js";
import { createManagedConfigFixture } from "./test-helpers.js";

test("readManagedSettingsView exposes managed branches without inventing optional structures", () => {
  const settings: OpenClawConfig = {
    ...createManagedConfigFixture({
      defaults: {
        workspace: {
          root: "~/.openclaw/workspace"
        }
      },
      includeAllowlist: false,
      includeOpenAiModels: false,
      openaiProvider: {
        headers: {
          "x-extra-header": "keep-me"
        }
      }
    }),
    gateway: {
      metadata: {
        source: "setup"
      },
      mode: "local"
    }
  };

  const view = readManagedSettingsView(settings, "fixture");

  assert.deepEqual(view.defaults, {
    model: {
      primary: toPrimaryModelRef(DEFAULT_MODEL)
    },
    workspace: {
      root: "~/.openclaw/workspace"
    }
  });
  assert.equal(view.allowlist, undefined);
  assert.equal(view.openaiProvider?.models, undefined);
  assert.deepEqual(view.gateway, {
    metadata: {
      source: "setup"
    },
    mode: "local"
  });
});
