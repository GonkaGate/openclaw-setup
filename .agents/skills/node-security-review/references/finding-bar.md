# Finding Bar

Keep the final output short and findings-first.

## Keep A Finding Only If

- the location or runtime surface is specific
- the broken security guarantee is explicit
- the exploit path is plausible
- the strongest plausible dismissal has been considered and loses
- the operational consequence is concrete
- the fix is the smallest safe change
- the confidence statement is honest about missing context

## Drop Or Demote When

- the comment is a generic slogan such as "use Helmet" or "add rate limiting"
- the point is really product authorization or fraud policy
- the risk depends on context the review does not have and no concrete failure
  is shown
- the issue sounds security-relevant but the strongest non-finding
  interpretation still stands
- the issue is defense-in-depth only and the core guarantee is still intact
- the recommendation broadens into a redesign without first naming the narrow
  broken control

## Severity Cues

- `Blocker`
  Exploitable bypass, secret disclosure, internal reachability, signature
  bypass, or fail-open on missing verification.
- `High`
  Credible exposure growth or credential misuse path with normal production
  assumptions.
- `Medium`
  A real weakness that still needs one adjacent assumption or supporting bug.
- `Low`
  Mention only when it sharply reduces future vulnerability risk.

## Clean Review Standard

If no candidate survives the bar, say so plainly:

- `No security findings within the node-security boundary.`

Then list only residual risk or missing verification surface.
