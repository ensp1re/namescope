# Architecture

NameScope is an npm workspace with one dependency direction:

```text
schemas
   |
 core
   |
adapters
   |
 mcp
   |
 cli
```

`@namescope/schemas` owns versioned Zod contracts and JSON Schema. `@namescope/core` owns deterministic generation, normalization, quality rules, scoring, configuration, cache, concurrency, and orchestration. `@namescope/adapters` implements RDAP, npm, PyPI, crates.io, GitHub, local command, and trademark-link providers. `@namescope/mcp` maps validated MCP tools to core calls. Published package `namescope` provides CLI parsing and output formatting.

Both CLI and MCP construct `NamingIntelligence` with the same adapters. Business logic is not duplicated.

## Check flow

1. Parse and validate configuration.
2. Normalize candidate only for queries; preserve display spelling.
3. In offline mode, skip all remote adapters.
4. Otherwise read unexpired cache unless `--refresh`.
5. Run provider groups with bounded concurrency and request timeouts.
6. Map responses to explicit states with evidence and confidence.
7. Run local quality and command analysis.
8. Compute weighted dimensions and apply blocking conflicts.
9. Return versioned structured result and format only at outer boundary.

Provider failures are data. They become `unknown` or `error` evidence instead of aborting unrelated checks.
