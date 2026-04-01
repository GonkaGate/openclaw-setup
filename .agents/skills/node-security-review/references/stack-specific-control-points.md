# Stack-Specific Control Points

Use this file when the task is already clearly inside `node-security-review`
and the answer needs concrete implementation anchors from the actual Node and
Fastify surfaces.

These are control points, not a checklist to dump verbatim. Use them to sharpen
where the real bug likely lives and what exact code to inspect next.

## Fastify Request Boundaries

- Security-sensitive routes should have explicit schema coverage for
  `headers`, `cookies`, `body`, `querystring`, and `params` where relevant.
- If auth or security decisions happen before schema validation, inspect those
  boundaries separately; do not assume route schemas protect earlier hooks.
- Treat loose parser or pre-validation behavior as a real trust-boundary seam,
  not as background framework detail.

## Ajv And Input Strictness

- `removeAdditional` belongs to trust-boundary policy when strict object shapes
  matter.
- `allErrors` can turn oversized invalid payloads into unnecessary work; do not
  treat it as a harmless DX setting on exposed boundaries.
- If validation is weakened globally, review whether handlers still assume
  schema-clean input.

## JWT And Session Handling

- `decode` is never enough; the code path must verify signature before trusting
  claims.
- When the system relies on `issuer`, `audience`, or algorithm constraints,
  verify those explicitly rather than assuming library defaults match policy.
- `@fastify/secure-session` defaults help, but still inspect cookie flags,
  `maxAge`, and key-rotation posture.
- Access tokens should not quietly become durable browser state unless the auth
  model explicitly accepts that risk.

## CORS, CSRF, And Cookie Exposure

- `credentials: true` plus wildcard or reflected origins is a first inspection
  point whenever cookies carry identity.
- `SameSite=None` should be treated as an explicit cross-site decision, not as
  a convenience default.
- Review cookie auth and CSRF posture together on state-changing routes; do not
  let them split into separate shallow comments.

## Outbound HTTP / SSRF Control Points

- Prefer `new URL(...)` plus scheme allowlisting over regex or prefix checks.
- If redirects are followed, the destination should be re-validated after each
  hop.
- DNS resolution and final-IP checks matter when the service can reach private,
  loopback, metadata, or internal network space.
- Timeouts and disabled auto-retry are part of the security control when they
  prevent unsafe downgrade or blind internal probing.

## Error And Logging Surfaces

- Pino or equivalent redaction should cover `authorization`, tokens, cookies,
  secrets, and signed payload material where applicable.
- Review `setErrorHandler`, raw `reply.send(err)`, and ad hoc error mapping for
  stack or config leakage.
- Logging raw `request.body`, `headers`, or webhook payloads is a concrete
  exposure review point, not merely a style problem.

## Prisma / SQL Boundaries

- `prisma.$queryRawUnsafe` and `prisma.$executeRawUnsafe` are immediate
  inspection points when user influence reaches SQL.
- ORM use does not remove the need to verify where untrusted input becomes a
  query shape, filter, or raw fragment.

## Headers And Exposure Defaults

- `@fastify/helmet` or equivalent headers are useful, but the finding should be
  tied to a real exposure gap rather than emitted as generic advice.
- HSTS, `X-Content-Type-Options`, `X-Frame-Options`, and `X-Powered-By`
  exposure are strongest when the reviewed surface actually serves browser-
  reachable content or reveals framework details.

## Node Runtime Hardening

- Missing runtime secret validation at startup is a stronger finding than
  optional defense-in-depth flags.
- Node permission model flags are defense-in-depth unless the runtime surface
  clearly benefits from FS or network restriction.
- Do not let optional hardening outrank an actual trust-boundary break.
