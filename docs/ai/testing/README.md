# Testing strategy

<!-- aiviron:knowledge:start -->
> This source-backed project document is managed by Aiviron. Source code remains the implementation authority.

## Why this document exists

Tests or test frameworks were detected

## Source evidence

- `tests/cli.test.ts`
- `tests/fixtures/collisions.json`
- `tests/generator.test.ts`
- `tests/github.test.ts`
- `tests/mcp.test.ts`
- `tests/npm-validation.test.ts`
- `tests/offline.test.ts`
- `tests/scoring.test.ts`
<!-- aiviron:knowledge:end -->

## Maintained knowledge

Node test runner executes TypeScript through `tsx`. Fixtures cover normalization variants. Unit tests cover deterministic generation and score signals. Integration-style tests cover schema-valid composite reports, collision blocking, CLI parsing, MCP construction, and strict offline prevention of remote adapter calls. Live provider smoke checks are manual because public state and rate limits are unstable.
