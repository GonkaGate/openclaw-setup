import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MODEL, requireSupportedModel } from "../src/constants/models.js";
import { GonkaGateModelsError } from "../src/install/install-errors.js";
import {
  fetchCuratedGonkaGateModelCatalog,
  getPromptDefaultModelKey,
  requireModelInGonkaGateCatalog
} from "../src/install/gonkagate-models.js";

test("fetchCuratedGonkaGateModelCatalog fetches and maps live curated model metadata", async () => {
  let capturedUrl: string | undefined;
  let capturedAuthorization: string | undefined;

  const catalog = await fetchCuratedGonkaGateModelCatalog("gp-test-key", {
    fetchImpl: async (url, init) => {
      capturedUrl = url;
      capturedAuthorization = init.headers.Authorization;

      return {
        status: 200,
        json: async () => ({
          object: "list",
          data: [
            {
              id: "moonshotai/Kimi-K2.6",
              name: "Kimi K2.6 Live",
              object: "model"
            },
            {
              id: "unsupported/provider-model",
              name: "Unsupported",
              object: "model"
            },
            {
              context_length: 262144,
              id: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
              name: "Qwen3 235B A22B Instruct 2507 FP8",
              object: "model"
            }
          ]
        })
      };
    },
    maxAttempts: 1
  });

  assert.equal(capturedUrl, "https://api.gonkagate.com/v1/models");
  assert.equal(capturedAuthorization, "Bearer gp-test-key");
  assert.deepEqual(catalog.map((entry) => entry.model.key), ["qwen3-235b", "kimi-k2.6"]);
  assert.deepEqual(catalog[0]?.providerModel, {
    contextWindow: 262144,
    id: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    name: "Qwen3 235B A22B Instruct 2507 FP8"
  });
  assert.deepEqual(catalog[1]?.providerModel, {
    id: "moonshotai/Kimi-K2.6",
    name: "Kimi K2.6 Live"
  });
});

test("fetchCuratedGonkaGateModelCatalog retries temporary catalog unavailability", async () => {
  let calls = 0;

  const catalog = await fetchCuratedGonkaGateModelCatalog("gp-test-key", {
    fetchImpl: async () => {
      calls += 1;

      if (calls === 1) {
        return {
          status: 503,
          json: async () => ({})
        };
      }

      return {
        status: 200,
        json: async () => ({
          data: [
            {
              id: DEFAULT_MODEL.modelId
            },
            {
              id: "qwen/qwen3-235b-a22b-instruct-2507-fp8"
            }
          ]
        })
      };
    },
    maxAttempts: 2,
    retryDelayMs: 0
  });

  assert.equal(calls, 2);
  assert.deepEqual(catalog.map((entry) => entry.model.key), ["qwen3-235b", DEFAULT_MODEL.key]);
});

test("fetchCuratedGonkaGateModelCatalog rejects invalid API keys before config writes", async () => {
  await assert.rejects(
    fetchCuratedGonkaGateModelCatalog("gp-bad-key", {
      fetchImpl: async () => ({
        status: 401,
        json: async () => ({
          error: {
            code: "invalid_api_key"
          }
        })
      }),
      maxAttempts: 1
    }),
    (error) => {
      assert.ok(error instanceof GonkaGateModelsError);
      assert.equal(error.kind, "authentication_failed");
      assert.equal(error.status, 401);
      return true;
    }
  );
});

test("fetchCuratedGonkaGateModelCatalog rejects malformed model catalog responses", async () => {
  await assert.rejects(
    fetchCuratedGonkaGateModelCatalog("gp-test-key", {
      fetchImpl: async () => ({
        status: 200,
        json: async () => ({
          data: [
            {
              id: 42
            }
          ]
        })
      }),
      maxAttempts: 1
    }),
    (error) => {
      assert.ok(error instanceof GonkaGateModelsError);
      assert.equal(error.kind, "invalid_response");
      assert.match(error.message, /data\[0\]\.id/);
      return true;
    }
  );
});

test("fetchCuratedGonkaGateModelCatalog rejects catalogs that omit a curated supported model", async () => {
  await assert.rejects(
    fetchCuratedGonkaGateModelCatalog("gp-test-key", {
      fetchImpl: async () => ({
        status: 200,
        json: async () => ({
          data: [
            {
              id: "qwen/qwen3-235b-a22b-instruct-2507-fp8"
            }
          ]
        })
      }),
      maxAttempts: 1
    }),
    (error) => {
      assert.ok(error instanceof GonkaGateModelsError);
      assert.equal(error.kind, "missing_supported_models");
      assert.match(error.message, /moonshotai\/Kimi-K2\.6/);
      return true;
    }
  );
});

test("model selection helpers keep selected models inside the live curated catalog", () => {
  const qwen = requireSupportedModel("qwen3-235b");
  const kimi = requireSupportedModel("kimi-k2.6");
  const catalog = [
    {
      allowlistEntry: {
        alias: qwen.key
      },
      model: qwen,
      primaryModelRef: "openai/qwen/qwen3-235b-a22b-instruct-2507-fp8" as const,
      providerModel: {
        id: qwen.modelId,
        name: qwen.displayName
      }
    }
  ];

  assert.equal(getPromptDefaultModelKey(catalog, kimi.key), qwen.key);
  assert.doesNotThrow(() => requireModelInGonkaGateCatalog(qwen, catalog));
  assert.throws(
    () => requireModelInGonkaGateCatalog(kimi, catalog),
    (error) => {
      assert.ok(error instanceof GonkaGateModelsError);
      assert.equal(error.kind, "missing_selected_model");
      return true;
    }
  );
});
