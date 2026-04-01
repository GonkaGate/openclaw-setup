# Attacker Lens

Use this pass for every non-trivial review.

## Exploit Path Template

For each candidate issue, write the shortest plausible chain:

1. `Entry`
   What attacker-controlled input or circumstance starts the path?
2. `Trust Mistake`
   What assumption turns that input into trusted behavior?
3. `Pivot`
   What privileged action, internal reachability, or secret-bearing operation
   becomes reachable?
4. `Effect`
   What concrete exposure, state change, or fail-open outcome follows?
5. `Stop Condition`
   Which smallest control would break the chain?

## Pressure Questions

- Can an attacker supply or influence this value directly?
- Is the code decoding, parsing, or defaulting where it should be verifying?
- If the check errors, times out, or lacks config, does the system deny or
  silently continue?
- Can this outbound call be redirected, re-resolved, or re-targeted to an
  internal address?
- Can logs, errors, or traces reveal a token, secret, signed payload, or
  internal topology detail?
- Is this a real privilege change or just a general hardening preference?

## Dismissal Challenge

Before you keep a finding, name the strongest reason someone would dismiss it:

- `the handler checks later`
- `only internal users reach this`
- `the framework already validates that`
- `this is reliability noise, not security`
- `this is just defense in depth`

Then answer with the single fact that defeats that dismissal.

If you cannot defeat the best dismissal cleanly, the finding is probably still
too soft.

## Abuse Path Discipline

Treat "abuse path" here as a technical exploit path:

- spoofed identity
- reused or stolen credential
- signature bypass
- SSRF pivot
- secret leakage
- security-control downgrade

Do not relabel missing business policy as a technical exploit unless the code
itself breaks a trust boundary.
