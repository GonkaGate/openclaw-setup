import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MODEL,
  DEFAULT_MODEL_KEY,
  getSupportedModelByKey,
  requireSupportedModel,
  SUPPORTED_MODEL_KEYS,
  toPrimaryModelRef
} from "../src/constants/models.js";

test("curated registry includes Kimi K2.6 as the default model", () => {
  assert.equal(DEFAULT_MODEL_KEY, "kimi-k2.6");
  assert.equal(DEFAULT_MODEL.modelId, "moonshotai/Kimi-K2.6");
  assert.deepEqual(SUPPORTED_MODEL_KEYS, ["qwen3-235b", "kimi-k2.6"]);

  const kimi = requireSupportedModel("kimi-k2.6");

  assert.equal(kimi.displayName, "Kimi K2.6");
  assert.equal(kimi.modelId, "moonshotai/Kimi-K2.6");
  assert.equal(toPrimaryModelRef(kimi), "openai/moonshotai/Kimi-K2.6");
  assert.equal(DEFAULT_MODEL, kimi);
  assert.equal(getSupportedModelByKey("missing-model"), undefined);
});
