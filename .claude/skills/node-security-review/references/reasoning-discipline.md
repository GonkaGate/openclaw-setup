# Reasoning Discipline

Use this file to keep the reasoning narrower, more explicit, and harder to
fake.

## Expert Quality Bar

A strong answer in this topic does all of these:

- names the exact broken security guarantee
- identifies the real trust boundary crossing
- shows attacker influence over the entry point
- traces the first privilege, reachability, or exposure pivot
- explains the fail-open or exposure consequence concretely
- defeats the strongest plausible dismissal
- recommends the smallest safe fix
- states residual uncertainty honestly

If the answer is only "security-fluent" but skips one of those, it is still
too shallow for this skill.

## Proof Obligations

Before finalizing a finding, answer each question explicitly:

| Obligation | Question | Bad shortcut to reject |
| --- | --- | --- |
| Broken guarantee | What exact security guarantee failed? | `Auth looks weak.` |
| Trust boundary | Where did untrusted input become trusted too early? | `It processes user input.` |
| Attacker control | What can the attacker actually supply, choose, or influence? | `A bad actor could maybe abuse it.` |
| Pivot | What privileged effect, internal reachability, or secret-bearing path opens next? | `This is risky.` |
| Fail-open check | What happens if verification, normalization, or secret loading fails? | `It probably errors safely.` |
| Dismissal challenge | What is the strongest reason someone would say this is not a finding, and why does that fail? | `Better safe than sorry.` |
| Smallest fix | What is the narrowest change that closes the proven path? | `Rewrite auth.` |
| Residual uncertainty | What fact is still missing, and does it change severity or only confidence? | `Need more context.` |

## Why-Not Challenge

Before keeping a finding, force one of these losing arguments:

- `This is just defense in depth.`
- `The handler checks later.`
- `Only trusted operators can set this.`
- `This is reliability, not security.`
- `Runtime or framework defaults already make this safe.`
- `The attacker would need too many extra assumptions.`

If none of these needs to lose, the issue may not yet be a real security
finding.

## Smallest Safe Fix Test

When proposing a fix:

1. Name the exact hole it closes.
2. Remove the fix mentally.
3. Ask whether the same exploit, leakage, or fail-open path reopens.
4. Keep the fix only if the answer is yes.

This prevents two weak patterns:

- broad redesigns that outrun the proven problem
- fashionable hardening advice that does not close the actual path

## Output Upgrade

If the first draft sounds right but still feels generic, add these internal
checks before finalizing:

- `Broken Guarantee`
- `Shortest Attacker Path`
- `Why This Is Not Just Hardening`
- `Why The Dismissal Loses`
- `Smallest Safe Fix`
- `Residual Uncertainty`
