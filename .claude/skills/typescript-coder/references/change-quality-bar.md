# Change Quality Bar

A strong implementation change should show all of these:

- the active seam is named
- the preserved decision is named
- the diff is the smallest safe delta
- advanced TypeScript tools have a concrete local payoff
- proof matches the touched risk
- assumptions are explicit
- residual risk is honest
- untouched seams stayed intentionally untouched

Reject these patterns:

- broad cleanup with no seam-local reason
- new abstractions or helper stacks added for aesthetics
- `any`, blind assertions, or hidden runtime assumptions at trust boundaries
- decorative `ts-pattern`, `Result`, or utility-type usage
- silent contract, persistence, or runtime-behavior changes
- tests that exercise code volume more than the actual regression risk

Pressure test:

- what stronger-looking broader refactor was rejected?
- what exact risk would still remain if this smaller change passed?
- what missing fact would most change confidence?
- what did this change deliberately not touch?
