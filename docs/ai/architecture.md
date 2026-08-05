# Architecture

<!-- aiviron:knowledge:start -->
> This source-backed project document is managed by Aiviron. Source code remains the implementation authority.

## Why this document exists

Maps the main modules and their relationships

## Source evidence

- `package.json`
- `packages/adapters/package.json`
- `packages/cli/package.json`
- `packages/core/package.json`
- `packages/mcp/package.json`
- `packages/schemas/package.json`
- `packages/adapters/src/index.ts`
- `packages/cli/src/index.ts`
- `packages/core/src/index.ts`
- `packages/mcp/src/index.ts`
- `packages/schemas/src/index.ts`
<!-- aiviron:knowledge:end -->

## Architecture map

Dependency order is schemas, core, adapters, MCP, then CLI. Schemas own versioned contracts. Core owns deterministic logic and accepts an `AdapterSet`. Adapters isolate remote and local providers. MCP and CLI validate inputs, call core, and format outputs. Both entry surfaces construct the same `NamingIntelligence` service; no business logic should be duplicated outside core.
