import { ApiKeyValidationError } from "./install-errors.js";

const GONKAGATE_API_KEY_PATTERN = /^gp-[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function validateApiKey(rawValue: string): string {
  const apiKey = rawValue.trim();

  if (apiKey.length === 0) {
    throw new ApiKeyValidationError("missing", "API key is required.");
  }

  if (!apiKey.startsWith("gp-")) {
    throw new ApiKeyValidationError("wrong_prefix", 'Expected a GonkaGate API key that starts with "gp-".');
  }

  if (!GONKAGATE_API_KEY_PATTERN.test(apiKey)) {
    throw new ApiKeyValidationError(
      "invalid_format",
      "The API key format looks invalid. Expected a regular GonkaGate API key like gp-..."
    );
  }

  return apiKey;
}
