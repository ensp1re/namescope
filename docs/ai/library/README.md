# Library API

<!-- aiviron:knowledge:start -->
> This source-backed project document is managed by Aiviron. Source code remains the implementation authority.

## Why this document exists

A reusable package or exported library surface was detected

## Source evidence

- `package.json`
- `packages/adapters/package.json`
- `packages/cli/package.json`
- `packages/core/package.json`
- `packages/mcp/package.json`
- `packages/schemas/package.json`
- `tsconfig.base.json`
<!-- aiviron:knowledge:end -->

## Maintained knowledge

`@namescope/schemas` exports contracts; `@namescope/core` exports deterministic and orchestration APIs; `@namescope/adapters` exports default providers; `@namescope/mcp` exports server construction. Packages are ESM, strict TypeScript, and NodeNext. Public result changes must be validated by Zod and preserve versioned schema semantics.
