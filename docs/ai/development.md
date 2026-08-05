# Development workflow

<!-- aiviron:knowledge:start -->
> This source-backed project document is managed by Aiviron. Source code remains the implementation authority.

## Why this document exists

Build, test, and repository commands were detected

## Source evidence

- `package.json`
- `packages/adapters/package.json`
- `packages/cli/package.json`
- `packages/core/package.json`
- `packages/mcp/package.json`
- `packages/schemas/package.json`
- `.github/workflows/ci.yml`
- `tests/cli.test.ts`
- `tests/fixtures/collisions.json`
- `tests/generator.test.ts`
- `tests/mcp.test.ts`
- `tests/npm-validation.test.ts`
- `tests/offline.test.ts`
- `tests/scoring.test.ts`

## Detected commands

- `npm run build`
- `npm run check`
- `npm run clean`
- `npm run cli`
- `npm run mcp`
- `npm run prepack`
- `npm run test`
- `npm run test:coverage`
- `npm run typecheck`
<!-- aiviron:knowledge:end -->

## Setup and workflow

Use Node.js 24 LTS or newer and `npm install`. Run `npm run check` for strict TypeScript plus tests, `npm run build` for project-reference output, and offline CLI smoke tests before provider tests. Keep workspace versions aligned. Provider changes require failure-state, timeout, privacy, and offline coverage.
