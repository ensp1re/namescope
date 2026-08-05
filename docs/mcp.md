# MCP setup

NameScope uses local stdio transport from official MCP TypeScript SDK v2.

```json
{
  "mcpServers": {
    "namescope": {
      "command": "npx",
      "args": ["-y", "namescope", "mcp"]
    }
  }
}
```

Use same command in Claude, Codex, Cursor, VS Code, and other clients accepting stdio MCP configuration. Working directory may contain `namecheck.config.json`.

Tools:

- `generate_names`: local deterministic candidates only; never claims availability.
- `check_name`: full evidence-based report.
- `rank_names`: checked and ranked comparison.
- `check_domains`: selected RDAP checks.
- `check_packages`: selected npm, PyPI, and crates.io checks.
- `check_github`: repository search and account lookup.
- `check_trademark`: preliminary official links and disclaimer.
- `explain_score`: human-readable score decomposition.

Set `offline: true` on network-capable tools to prevent provider calls.
