# Report Template

Use this structure for the final audit report.

## Audit Target

- Stable `OpenClaw` version audited
- Short note on how that version was identified
- Primary sources used

## Verdict

One of:

- `compatible`
- `compatible with caveats`
- `incompatible`

State the verdict in the first sentence and mention whether the impact is on
install, `verify`, or both.

## Confirmed Upstream Evidence

- Confirmed contract changes or confirmed unchanged contracts that materially
  affect this repository
- Direct links to official release notes, docs, source, tests, help text, or
  package metadata

## Repository Impact

- Exact repo surfaces checked
- Exact repo surfaces that remain compatible
- Exact repo surfaces that would break, with a brief reason for each

Prefer grouping by:

- `install`
- `verify`

## Inferred Risk Or Ambiguity

- Anything not directly confirmed by primary sources
- Why it is still a caveat instead of a confirmed incompatibility

## Recommended Fix Areas

Include this section only when the verdict is `compatible with caveats` or
`incompatible`.

Keep it minimal:

- point to the exact files or seams that need follow-up
- say what changed upstream
- do not design the full fix
