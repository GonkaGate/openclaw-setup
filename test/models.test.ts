import assert from "node:assert/strict";
import test from "node:test";
import { modelFromPrimaryRef, toManagedModelSelection, toPrimaryModelRef } from "../src/constants/models.js";
import { TEST_MODEL } from "./test-helpers.js";

test("model helpers format OpenClaw refs without a checked-in registry", () => {
  assert.equal(toPrimaryModelRef(TEST_MODEL), "openai/acme/model-alpha");
  assert.deepEqual(toManagedModelSelection(TEST_MODEL), {
    allowlistEntry: {
      alias: "acme/model-alpha"
    },
    primaryModelRef: "openai/acme/model-alpha",
    selectedModel: TEST_MODEL
  });
  assert.deepEqual(modelFromPrimaryRef("openai/acme/model-alpha"), {
    displayName: "acme/model-alpha",
    key: "acme/model-alpha",
    modelId: "acme/model-alpha"
  });
  assert.equal(modelFromPrimaryRef("anthropic/acme/model-alpha"), undefined);
});
