# Stack-Specific Hard Anchors

## TypeScript Boundaries

- Parse or normalize untrusted input before treating it as a trusted internal
  type.
- Use advanced type machinery only when it reduces local reasoning cost more
  than a named concrete type would.
- Introduce `ts-pattern` only for a real closed decision table or a clearer
  trusted-structure match.
- Extend the existing `neverthrow` or thrown-error boundary style instead of
  mixing competing error flows in one path.

## Fastify And Contract Surfaces

- Keep route schemas, response shapes, and runtime behavior aligned.
- Request lifecycle hooks must either return a Promise or call `done`, never
  both.
- If an async hook sends a response, `return reply`.
- `/v1*` and `/v1/public*` routes use OpenAI-compatible error shapes; internal
  API routes use the standard error envelope.
- Reuse constants for user-facing error text when the repo already owns those
  strings centrally.
- Do not hardcode new user-facing error literals inline when the constants
  layer already owns that wording.

## Data And State

- Use Prisma `Decimal` for money values.
- Keep balance or multi-write invariants inside transactions.
- Verify real schema and identifier names before writing manual SQL.
- For Redis `SET ... NX` guards, use truthiness checks; never compare Lua
  status replies to `'OK'`.
- `request_id` and `inferenceId` are different fields; never swap them in
  persistence or lookup logic.

## Repo-Specific Domain Anchors

- User-facing amounts stay in USD.
- Treat Transfer Agents as routing endpoints, not final inference nodes.

## Config, Imports, And Proof

- Read env through centralized config, not `process.env` in arbitrary code.
- Preserve repo import ordering and path-alias conventions.
- `app.inject()` is strong proof for in-process Fastify behavior, but it does
  not prove real socket or `onListen` behavior.
