# Source Surface Matrix

Use this matrix to keep the boundary concrete.

| Source surface | Raw default stance | First trusted boundary usually lives in | Common policy hotspots | Typical trusted output |
| --- | --- | --- | --- | --- |
| HTTP or transport input | `unknown` or weak DTO | route adapter, transport parser, request mapper | unknown keys, string-to-number/date normalization, missing fields | input object the service can actually rely on |
| Config or `process.env` | `Record<string, string | undefined>` | startup config module | required vars, defaults, number or URL parsing, one-time normalization | `TrustedConfig` only |
| External API response | raw provider payload or weak SDK type | adapter response parser | partial provider drift, optional fields, passthrough temptation | normalized adapter result |
| Persistence record | record or document shape, especially JSON fields as untrusted | repository mapper or data-boundary parser | nullable columns, JSON blobs, row shape versus domain shape | internal model or repository result |
| Cache value | stale or weak serialized blob | cache decode layer | version drift, partial payloads, stale envelope versus payload trust | decoded cache envelope or trusted cached model |
| `JSON.parse` result | `unknown` | immediate parse wrapper | cast temptation, nested shape proof | trusted parsed structure or parse result |
| `catch (err)` | `unknown` | local error normalization helper | assuming `Error`, missing non-Error handling | narrowed internal error view |

## Default reminder

The question is not "what library should I use?"

The question is:

- where does this source stop being raw
- what exact claim becomes trustworthy
- what policy makes that claim honest
