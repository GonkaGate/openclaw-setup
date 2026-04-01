# Auth, Session, And Cookie Review

Use this reference when the reviewed path touches JWTs, session cookies, admin
UI auth, API keys carried in headers, or any route that trusts identity-bearing
state.

## Review From The Trust Boundary

Keep these distinctions explicit:

- `decode` is not `verify`
- possession of a token or cookie is not proof of identity
- cookie transport settings are not the same thing as CSRF protection
- authentication proof is not authorization policy

The finding usually lives where code crosses one of those lines too casually.

## High-Signal Findings To Hunt First

- token payload is read via `decode`, parsing, or base64 inspection before
  successful signature verification
- verification error downgrades to guest, partial access, or "let the handler
  decide"
- missing or malformed auth material is treated as optional on privileged
  paths
- JWT verification omits security-relevant constraints that the system relies
  on, such as expected issuer, audience, or algorithm
- auth cookies lack the flags the chosen model depends on:
  `HttpOnly`, `Secure`, `SameSite`
- cookie auth is used on state-changing routes without a coherent CSRF story
- `SameSite=None` is combined with broad credentialed CORS without a narrowly
  trusted origin model
- refresh or long-lived credentials are exposed to script-readable storage or
  returned in logs or errors
- secret fallback values keep auth alive when real signing material is missing

## Concrete Control Points

Inspect these exact implementation seams when present:

- JWT verification path:
  whether signature verification happens before claims are consumed
- JWT policy constraints:
  whether `issuer`, `audience`, and expected algorithm are enforced when the
  system depends on them
- cookie configuration:
  `HttpOnly`, `Secure`, `SameSite`, `domain`, `path`, and effective `maxAge`
- refresh-token handling:
  whether durable credentials live in safer cookie storage rather than
  script-readable state
- startup secret loading:
  whether missing signing material crashes or silently weakens auth
- session plugins:
  whether `@fastify/secure-session` or similar defaults are being relied on
  correctly rather than assumed to solve all auth posture issues

## CORS And Cookie Coupling

When cookies authenticate requests, review these together, not separately:

- which origins can send credentialed requests
- whether `credentials: true` is enabled
- whether `origin` is explicit, reflected, or wildcard-like
- which cookie flags narrow browser sending behavior
- what prevents CSRF on state-changing methods

`CORS is enabled` is not itself a finding.
The finding is the combined trust expansion:
which browser origins can cause authenticated requests to be sent, and what
stops unsafe cross-site state change.

Prefer concrete coupling statements such as:

- `credentials: true` plus wildcard or reflected origins broadens which
  browser contexts can send authenticated requests
- `SameSite=None` is an explicit cross-site choice and should not appear
  accidentally
- cookie transport flags narrow theft risk, but do not by themselves close
  CSRF on state-changing routes

## Fail-Open Questions

- If verification throws, does the request stop?
- If the signing key is missing, does startup fail or does auth quietly weaken?
- If a cookie is absent or malformed, does the code deny or create a soft
  anonymous user that still reaches sensitive handlers?
- If a webhook or HMAC signature check errors, does the request fail closed?

## Minimal Fix Discipline

Prefer the narrowest fix that restores the guarantee:

- verify before reading trusted claims
- deny on verification failure
- require mandatory auth material
- narrow credentialed origins
- add the missing cookie flags or CSRF control that the chosen flow requires

Do not expand into a full auth redesign unless the current flow cannot be made
safe incrementally.
