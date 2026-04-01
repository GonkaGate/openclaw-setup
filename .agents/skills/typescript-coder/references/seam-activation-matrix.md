# Seam Activation Matrix

| Seam | Activate When | Watch For | Hand Off If Blocked |
| --- | --- | --- | --- |
| TypeScript modeling base | every real implementation task | trusted vs untrusted data, advanced types, result flow, branching clarity, helper restraint | n/a |
| `api-contract` | route schema, request/response shape, serializer behavior, exported contract, OpenAPI-visible type changes | contract drift, schema ownership, public error shape | `api-contract-designer-spec` |
| `fastify-runtime` | hooks, decorators, plugin scope, lifecycle, reply ownership, streaming, error handling | async hook correctness, visibility, lifecycle order | `fastify-runtime-review` |
| `prisma-postgresql` | transactions, `Decimal`, query shape, schema-backed guarantees, migrations, persistence semantics | integrity posture, query/index fit, migration safety | `prisma-postgresql-data-spec` |
| `redis-runtime` | cache semantics, TTL, Lua, coordination guards, replay-sensitive runtime state | ownership of runtime state, Lua/guard correctness, replay risk | `redis-runtime-spec` |
| `vitest-qa` | a code change needs a proof slice, harness choice, or deterministic test behavior | realism, layer choice, cleanup, proof honesty | `vitest-qa-tester` |

Rules:

- do not activate untouched seams for completeness
- do not use this skill to solve architecture or planning gaps
- if the missing decision is about ownership or decomposition, hand off to
  `ts-backend-architect-spec` or `typescript-coder-plan-spec`
