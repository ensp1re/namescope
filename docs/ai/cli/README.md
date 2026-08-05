# Command-line interface

<!-- aiviron:knowledge:start -->
> This source-backed project document is managed by Aiviron. Source code remains the implementation authority.

## Why this document exists

CLI entry points or argument-processing libraries were detected

## Source evidence

- `docs/stack-evaluation.md`
- `package-lock.json`
- `packages/cli/LICENSE`
- `packages/cli/package.json`
- `packages/cli/README.md`
- `packages/cli/src/index.ts`
- `packages/cli/tsconfig.json`
<!-- aiviron:knowledge:end -->

## Maintained knowledge

`packages/cli/src/index.ts` owns parsing and presentation only. Commands are `find`, `check`, `rank`, `domains`, `packages`, and `mcp`. `--json`, `--compact-json`, and `--markdown` format structured core results. `--offline` must reach core before any remote adapter call. New flags should override configuration without changing shared defaults silently.
