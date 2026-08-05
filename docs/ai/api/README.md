# Application API

<!-- aiviron:knowledge:start -->
> This source-backed project document is managed by Aiviron. Source code remains the implementation authority.

## Why this document exists

API routes, schemas, or server framework signals were detected

## Source evidence

- `CODE_OF_CONDUCT.md`
- `LICENSE`
- `packages/adapters/LICENSE`
- `packages/cli/LICENSE`
- `packages/core/LICENSE`
- `packages/mcp/LICENSE`
- `packages/schemas/LICENSE`
- `tests/generator.test.ts`
<!-- aiviron:knowledge:end -->

## Maintained knowledge

No HTTP application API exists. Public programmatic surfaces are versioned Zod result contracts, exported TypeScript library functions, and eight MCP tools. Treat every provider payload as untrusted. Add public fields through schemas first, preserve `namescope-result/v1` compatibility, and update both CLI and MCP verification.
