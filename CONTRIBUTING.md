# Contributing

Nametagged welcomes fixes, provider adapters, language data, tests, and documentation under the MIT license.

## Setup

1. Install Node.js 24 LTS or newer.
2. Run `npm install`.
3. Create a focused branch.
4. Run `npm run check` before opening a pull request.

## Design rules

- Keep generation deterministic and model-free by default.
- Keep CLI and MCP behavior in shared core; outer packages only adapt inputs and outputs.
- Treat timeouts, rate limits, blocked requests, and unexpected responses as unknown or error, never available.
- Add evidence, timestamp, source, and confidence to provider results.
- Do not add telemetry, required accounts, paid services, crypto, hosted backends, or required API keys.
- Do not scrape against provider terms. Prefer official public APIs and direct manual links.
- Preserve trademark disclaimer and never claim legal clearance.
- Document every scoring rule and default weight.

## Adding a provider

Implement adapter behind `AdapterSet`, rate-limit requests, use bounded concurrency, retry only safe idempotent requests, redact credentials, define cache behavior, and add offline tests. Include provider limitations in `docs/data-sources.md`.

## Commits and pull requests

Use Conventional Commits. Explain why and what changed. Report exact verification commands. Keep one reviewable purpose per pull request.
