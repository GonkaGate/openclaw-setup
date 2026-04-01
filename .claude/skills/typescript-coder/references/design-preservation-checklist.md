# Design Preservation Checklist

Before editing, answer these:

1. What artifact currently decides this behavior?
   - user request
   - spec
   - implementation plan
   - route schema
   - exported type
   - existing test
2. Which surfaces must stay stable?
   - architecture boundary
   - request/response shape
   - error key or envelope
   - persisted shape or transaction ownership
   - Redis key/guard semantics
   - request context or logging fields
   - repo-owned money, billing, or user-visible amount semantics
3. Which existing owners should be reused instead of duplicated?
   - schema/constants/helpers
   - shared error classes
   - boundary parsing or normalization points
   - route-level schema and error mappers
   - existing transaction or cache owner
4. Does the change need a new decision rather than a code edit?
   - new route/public contract
   - new data/state ownership
   - new architecture boundary
   - new proof strategy

Stop and escalate when:

- the edit would silently change a preserved surface
- the current source of truth is contradictory
- the "fix" only works by widening the touched seam
- the implementation would need a new user-visible error literal, API shape,
  or persistence contract that no existing owner currently defines
