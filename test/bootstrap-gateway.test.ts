import assert from "node:assert/strict";
import test from "node:test";
import { ensureFreshInstallLocalGateway } from "../src/install/bootstrap-gateway.js";

test("ensureFreshInstallLocalGateway adds gateway.mode=local when it is missing", () => {
  const result = ensureFreshInstallLocalGateway({
    gateway: {
      auth: {
        mode: "token"
      }
    }
  });

  assert.equal(result.addedLocalGatewayMode, true);
  assert.deepEqual(result.settings.gateway, {
    auth: {
      mode: "token"
    },
    mode: "local"
  });
});

test("ensureFreshInstallLocalGateway preserves an existing gateway.mode", () => {
  const input = {
    gateway: {
      bind: "loopback",
      mode: "trusted-proxy"
    }
  };
  const result = ensureFreshInstallLocalGateway(input);

  assert.equal(result.addedLocalGatewayMode, false);
  assert.equal(result.settings, input);
});
