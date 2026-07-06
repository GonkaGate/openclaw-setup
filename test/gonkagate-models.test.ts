import assert from "node:assert/strict";
import test from "node:test";
import { GonkaGateModelsError } from "../src/install/install-errors.js";
import {
  fetchGonkaGateModelCatalog,
  getPromptDefaultModelKey,
  requireModelInGonkaGateCatalog
} from "../src/install/gonkagate-models.js";

test("fetchGonkaGateModelCatalog fetches, dedupes, and maps arbitrary live model ids", async () => {
  let capturedUrl: string | undefined;
  let capturedAuthorization: string | undefined;

  const catalog = await fetchGonkaGateModelCatalog("gp-test-key", {
    fetchImpl: async (url, init) => {
      capturedUrl = url;
      capturedAuthorization = init.headers.Authorization;

      return {
        status: 200,
        json: async () => ({
          object: "list",
          data: [
            {
              id: "acme/model-alpha",
              name: "Acme Model Alpha",
              object: "model"
            },
            {
              id: "globex/model-beta",
              name: "Globex Model Beta",
              object: "model"
            },
            {
              id: "acme/model-alpha",
              name: "Duplicate Alpha",
              object: "model"
            },
            {
              id: "initech/model-gamma",
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
  assert.deepEqual(catalog.map((entry) => entry.model.modelId), [
    "acme/model-alpha",
    "globex/model-beta",
    "initech/model-gamma"
  ]);
  assert.deepEqual(catalog.map((entry) => entry.providerModel), [
    {
      id: "acme/model-alpha",
      name: "Acme Model Alpha"
    },
    {
      id: "globex/model-beta",
      name: "Globex Model Beta"
    },
    {
      id: "initech/model-gamma",
      name: "initech/model-gamma"
    }
  ]);
  assert.equal(getPromptDefaultModelKey(catalog), "acme/model-alpha");
  assert.equal(requireModelInGonkaGateCatalog("globex/model-beta", catalog).displayName, "Globex Model Beta");
});

test("fetchGonkaGateModelCatalog retries temporary catalog unavailability", async () => {
  let calls = 0;

  const catalog = await fetchGonkaGateModelCatalog("gp-test-key", {
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
              id: "acme/model-alpha"
            }
          ]
        })
      };
    },
    maxAttempts: 2,
    retryDelayMs: 0
  });

  assert.equal(calls, 2);
  assert.deepEqual(catalog.map((entry) => entry.model.modelId), ["acme/model-alpha"]);
});

test("fetchGonkaGateModelCatalog rejects invalid API keys before config writes", async () => {
  await assert.rejects(
    fetchGonkaGateModelCatalog("gp-bad-key", {
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

test("fetchGonkaGateModelCatalog rejects malformed model catalog responses", async () => {
  await assert.rejects(
    fetchGonkaGateModelCatalog("gp-test-key", {
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

test("fetchGonkaGateModelCatalog rejects empty model catalog responses", async () => {
  await assert.rejects(
    fetchGonkaGateModelCatalog("gp-test-key", {
      fetchImpl: async () => ({
        status: 200,
        json: async () => ({
          data: []
        })
      }),
      maxAttempts: 1
    }),
    (error) => {
      assert.ok(error instanceof GonkaGateModelsError);
      assert.equal(error.kind, "empty_catalog");
      return true;
    }
  );
});

test("model selection helper rejects only the explicitly missing selected live id", async () => {
  const catalog = await fetchGonkaGateModelCatalog("gp-test-key", {
    fetchImpl: async () => ({
      status: 200,
      json: async () => ({
        data: [
          {
            id: "acme/model-alpha"
          }
        ]
      })
    }),
    maxAttempts: 1
  });

  assert.throws(
    () => requireModelInGonkaGateCatalog("missing/model", catalog),
    (error) => {
      assert.ok(error instanceof GonkaGateModelsError);
      assert.equal(error.kind, "missing_selected_model");
      return true;
    }
  );
});
