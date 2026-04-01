# Trust Leak Smells

Treat these as red flags, not harmless cleanup items.

| Smell | Why it leaks trust | Better move |
| --- | --- | --- |
| `as any` or `as unknown as T` near input | bypasses runtime proof entirely | parse or narrow before exporting `T` |
| postfix `!` on boundary data | removes `null` or `undefined` without proof | branch, default, or reject explicitly |
| truthiness check for boundary presence | drops valid empty values like `0` or `""` | check `undefined`, `null`, or exact predicates |
| top-level object check only | nested fields stay unproven | validate the full relied-on surface |
| unstated extra-key behavior | trusted output silently includes or drops fields | state reject, strip, or passthrough explicitly |
| transforms scattered after parsing | trust and normalization become hard to review | centralize normalize logic in the boundary layer |
| DTO or record types imported into core | raw transport or storage shape looks trusted | map to a trusted internal shape first |
| `process.env` read everywhere | config trust boundary becomes invisible | parse once in a config module |
| SDK or cache helpers returning `any` | unsafe data crosses layers invisibly | wrap with `unknown` plus boundary parser |

## Fast rejection test

If you can no longer answer "what exact fields are trusted here and why?" the
boundary is probably leaking.
