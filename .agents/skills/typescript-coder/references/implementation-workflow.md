# Implementation Workflow

1. Identify the source of truth first.
   - approved spec or implementation plan
   - visible schema, exported type, or established behavior
   - failing test or regression report
   - prompt-only instruction if no stronger artifact exists
2. If the surface is unfamiliar, inspect it narrowly before editing.
   - touched file
   - direct callers or handlers
   - existing schema/types/constants owner
   - nearby tests for the same path
3. Map the touched seams.
   - TypeScript modeling base is always active
   - add adjacent seams only if the change really crosses them
4. Name the preserved decisions.
   - architecture boundary
   - route or exported contract
   - error model
   - persisted or cached behavior
   - logging/context invariants
5. Choose the smallest change shape.
   - direct edit
   - local extraction
   - boundary parse/normalize step
   - narrow test update
6. Choose the smallest honest proof slice.
   - touched risk -> smallest matching test or check
   - activate `vitest-qa` when proof choice becomes non-trivial
7. Escalate instead of redesigning when:
   - the current change needs a new architecture decision
   - contract or data behavior must change but that change was not approved
   - multiple seams are blocked on missing design truth rather than code
