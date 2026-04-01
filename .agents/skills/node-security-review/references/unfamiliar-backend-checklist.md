# Unfamiliar Backend Checklist

Use this order for an audit-mode first pass.

1. `Startup and env`
   Check how mandatory secrets are loaded, validated, and failed. Look for
   insecure defaults, fallback secrets, and security plugins that can fail
   silently.
2. `Auth boundary`
   Find the first auth hook, middleware, or decorator. Verify that tokens,
   sessions, cookies, and webhook signatures are verified rather than decoded
   or assumed.
3. `Route trust boundary`
   Check how `headers`, `cookies`, `body`, and `query` are validated before
   security-sensitive use. Pay attention to custom parsing, raw body use, and
   security decisions made before validation.
4. `Cookie and CORS model`
   If the app uses cookies, inspect `Secure`, `HttpOnly`, `SameSite`,
   credentialed origins, and CSRF posture together.
5. `Outbound HTTP`
   Find `fetch`, `axios`, `undici`, SDK wrappers, webhooks, or proxy routes.
   Check URL validation, scheme restrictions, redirect handling, timeouts, DNS
   or private-IP controls, and who chooses the destination.
6. `Error and logging surface`
   Inspect error handlers, response mappers, structured-log redaction, and any
   request or header logging. Look for token, secret, body, or stack leakage.
7. `Secrets and integrations`
   Review webhook secrets, API keys, private keys, signing material, and
   security-sensitive dependency usage.

## Evidence To Capture

- the first file where auth trust is established
- the first file where outbound destinations are chosen
- the first place secrets are defaulted, logged, or validated
- the first error path that can reveal privileged detail

This checklist is for prioritization, not for turning every surface into a
finding.
