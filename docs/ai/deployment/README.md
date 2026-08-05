# Deployment and infrastructure

<!-- aiviron:knowledge:start -->
> This source-backed project document is managed by Aiviron. Source code remains the implementation authority.

## Why this document exists

Deployment, container, CI, or infrastructure configuration was detected

## Source evidence

- `.ai/README.md`
- `docs/data-sources.md`
- `docs/limitations.md`
- `docs/mcp.md`
- `docs/methodology.md`
- `docs/stack-evaluation.md`
- `packages/adapters/src/index.ts`
- `README.md`
<!-- aiviron:knowledge:end -->

## Maintained knowledge

Deployment is npm publication, not a hosted service. Publish version-matched internal workspaces before `namescope`, then verify `npx namescope --help` and stdio MCP from a clean directory. CI runs Node 24 on Linux, macOS, and Windows. No container, database server, web server, or cloud infrastructure is required.
