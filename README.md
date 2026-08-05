# Nametagged

Free, open-source project-naming intelligence for developers. Generate names locally, check public software namespaces, compare evidence, and run the same engine through an `npx` CLI or local MCP stdio server.

Nametagged targets software-project naming. It does not promise business-name availability, domain ownership, social-handle availability, or legal trademark clearance.

## Quick start

Requires Node.js 24 LTS or newer.

```bash
npx nametagged find "a fast open-source database migration tool"
npx nametagged check taskforge
npx nametagged rank taskforge taskmint orbitdesk
npx nametagged domains taskforge --tlds com,io,dev,app
npx nametagged packages taskforge
npx nametagged check taskforge --json
npx nametagged check taskforge --offline
npx nametagged mcp
```

No account, API key, subscription, wallet, payment, hosted backend, Docker installation, or language model is required. `GITHUB_TOKEN` is optional and only raises GitHub API rate limits.

## What version 0.1 checks

- deterministic candidates from project words, related terms, compounds, affixes, and blends;
- domains through public RDAP for `.com`, `.org`, `.net`, `.io`, `.dev`, `.app`, `.ai`, and `.co` by default;
- npm publishability through `validate-npm-package-name`, followed by exact, normalized, hyphen, and underscore collision checks on npm, PyPI, and crates.io;
- GitHub repository search plus exact user or organization namespaces;
- local `PATH`, common commands, language toolchains, and shell-reserved commands;
- transparent quality signals and configurable ranking weights;
- preliminary trademark search links with explicit legal limitations.

Timeouts, rate limits, blocked requests, unsupported sources, and malformed responses remain `unknown`, `unsupported`, or `error`. They are never converted to “available.”

## Privacy

Generation and quality analysis run locally. Checks send only the requested candidate to providers needed for that command. `--offline` prevents every network request. Nametagged has no telemetry and does not collect names or descriptions. See [privacy documentation](docs/privacy.md).

## Output

Human output distinguishes confirmed, likely, unknown, warning, and error states. Use `--json`, `--compact-json`, or `--markdown` for machine-readable and report output. Every completed report contains evidence, timestamps, confidence, warnings, unknown checks, dimensions, weights, and explanation.

## Configuration

Copy [`namecheck.config.example.json`](namecheck.config.example.json) to `namecheck.config.json`. CLI flags override file values.

## MCP clients

Use stdio command `npx -y nametagged mcp`. Example client entry:

```json
{
  "mcpServers": {
    "nametagged": {
      "command": "npx",
      "args": ["-y", "nametagged", "mcp"]
    }
  }
}
```

Available tools: `generate_names`, `check_name`, `rank_names`, `check_domains`, `check_packages`, `check_github`, `check_trademark`, and `explain_score`. See [MCP guide](docs/mcp.md).

## Development

```bash
npm install
npm run check
npm run build
node packages/cli/dist/index.js find "an open-source TypeScript job queue" --offline
```

Architecture and decisions live in [`docs/`](docs/architecture.md). Contributions follow [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Legal limitation

Trademark results are preliminary informational screening and are not legal advice or a comprehensive clearance search. Consult a qualified trademark attorney before relying on a name for commercial use.

## License

MIT
