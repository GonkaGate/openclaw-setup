# Outbound, Exposure, And Fail-Open Review

Use this reference when the reviewed path touches outbound HTTP, webhook
dispatch or intake, user-influenced URLs, secret loading, error reporting, or
logging.

## Outbound Trust Boundary

Treat attacker-influenced outbound destinations as a trust boundary, not as an
ordinary integration detail.

High-signal findings usually look like:

- regex-only or string-prefix URL checks instead of structured parsing
- no scheme restriction before outbound requests
- redirects followed without re-validating the destination
- DNS or resolved IP never checked when internal reachability matters
- private, loopback, metadata, or service-network addresses remain reachable
- proxy or callback endpoints let user input choose where the server connects

The core question is simple:
can untrusted input turn your server into a credentialed client to somewhere it
should not talk to?

## Concrete Control Points

Inspect these exact implementation seams when present:

- URL normalization via `new URL(...)` before any allow or deny logic
- scheme allowlisting for `http` and `https` only
- redirect policy:
  whether redirects are disabled or every hop is re-validated
- DNS or final-address checks:
  whether private, loopback, metadata, or internal network destinations are
  blocked after resolution
- timeout and retry behavior:
  whether unsafe destinations or verification failures can still consume
  privileged outbound attempts

## Webhook And Signature Trust

Look for:

- payload trust before signature verification
- verification after parsing or mutation that changes the signed bytes
- missing raw-body discipline where the signature scheme depends on it
- signature-check exceptions that become retries, warnings, or accepted events
- secret or signature material leaking into logs or error responses

When the signature depends on raw bytes, inspect whether body parsing happens
before verification and whether the exact signed bytes are still available.

## Exposure Review

A security finding exists when sensitive material can realistically leave the
trusted boundary through:

- auth headers
- cookies
- bearer tokens
- webhook bodies
- raw request bodies
- stack traces or internal error objects
- internal hostnames, paths, or config values in user-facing errors

Review log statements and error mappers for actual leak paths, not just for
"too much logging" in the abstract.

Concrete leak anchors:

- `authorization` header logging
- cookie logging
- raw webhook body logging
- stack traces returned to clients
- error payloads that include internal hosts, paths, config, or secret-bearing
  objects

## Fail-Open Patterns

Prioritize these:

- missing mandatory secrets replaced by defaults
- verifier or validator exceptions that allow the operation to continue
- "accept for retry" or "best effort" branches that preserve unsafe behavior
- security plugin initialization failures that do not stop startup
- lookup or normalization failure that becomes implicit allow

When a security gate depends on a secret, verification result, or safe
destination decision, failure should usually deny, stop, or quarantine.

## Minimal Fix Discipline

Prefer the smallest corrective move:

- parse and normalize the URL before policy checks
- re-check redirects and resolved destinations
- fail startup when mandatory secrets are absent
- redact or drop sensitive fields from logs and responses
- turn downgrade-on-error branches into explicit deny paths

Do not broaden the answer into generic networking or observability advice
unless it directly closes the security exposure.
