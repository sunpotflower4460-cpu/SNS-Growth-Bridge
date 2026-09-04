# Phase 7A — Security and failure modes

| Mode | Behavior |
|---|---|
| Malformed JSONL | fail closed |
| Non-object JSONL row | fail closed |
| Missing file | fail closed |
| Oversized file / too many rows | fail closed |
| Empty workspaceId / socialAccountId / accountId | fail closed |
| Missing My-SNS or SNS-AI descriptor | fail closed |
| Platform mismatch (config vs descriptor vs evidence) | fail closed |
| Duplicate / identical links | fail closed |
| Disabled link used for resolution or linked strategy | blocked (`link-disabled`) |
| No active explicit link | do not attach `workspaceId` |
| Unrelated JSONL accounts | ignored, not mixed |
| Private / signed `mediaUrl` | never copied; strategy uses `hasLegacyMediaUrl` only |
| Absolute local paths | never present on the bundle |
| Empty source commit SHA / loadedAt | fail closed |
| Invalid `loadedAt` (not offset ISO datetime) | fail closed; no mapped bundle |
| `maxBytesPerFile` / `maxRowsPerFile` not a finite positive integer | fail closed before I/O |
| Automatic account fallback (handle, name, credentialKey) | never |

No network. No My-SNS database. No SNS-AI config writes. `manualOnly` remains true.
