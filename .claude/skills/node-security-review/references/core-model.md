# Core Model

Use this skill only for application-layer security review in a Node.js backend.

Own these boundaries:

- client or webhook input crossing into trusted server behavior
- auth, session, JWT, cookie, and signature verification
- secret loading, fallback, redaction, and leakage paths
- outbound HTTP or SDK calls that can become SSRF or trust pivots
- exposure through CORS, cookies, headers, logs, and error bodies
- fail-open versus fail-closed behavior when checks or config fail

Do not drift into:

- product authorization policy or fraud policy
- generic rate limiting unless it is part of a security bypass
- generic reliability except where it weakens a security guarantee
- generic observability except unsafe logging or redaction
- infra-wide network posture outside the backend application layer

## Protected Assets

Name the asset before naming the bug:

- privileged actions such as admin routes, settlement, or mutation endpoints
- credential-bearing state such as JWTs, session cookies, API keys, or signed
  webhook headers
- secrets such as env keys, DB credentials, private keys, or signing secrets
- internal reachability through outbound HTTP, SDKs, or proxy endpoints
- sensitive outputs through responses, logs, metrics, traces, or error bodies

## What Counts As A Real Finding

A real finding should describe a broken guarantee, not a missing slogan.

Examples:

- untrusted input becomes trusted without validation or verification
- a failed security check downgrades to allow or guest access
- a missing secret leaves the service running insecurely
- attacker-influenced outbound requests can reach internal or unexpected
  destinations
- logs or errors can leak credentials, tokens, or privileged internal detail

If the review cannot name the asset, the broken guarantee, and the path to
exposure, it is probably not ready to be a finding.
