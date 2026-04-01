const GONKAGATE_API_KEY_PATTERN = /^gp-[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function validateApiKey(rawValue: string): string {
  const apiKey = rawValue.trim();

  if (apiKey.length === 0) {
    throw new Error("API key is required.");
  }

  if (!apiKey.startsWith("gp-")) {
    throw new Error('Expected a GonkaGate API key that starts with "gp-".');
  }

  if (!GONKAGATE_API_KEY_PATTERN.test(apiKey)) {
    throw new Error("The API key format looks invalid. Expected a regular GonkaGate API key like gp-...");
  }

  return apiKey;
}
