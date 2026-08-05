# Stack evaluation

Evaluated 5 August 2026 for a free, local-first TypeScript CLI and MCP server.

## Selected stack

- **Node.js 24 LTS baseline.** Node 24 is an LTS line; Node 26 is Current. Version 24 gives native `fetch`, `AbortController`, test coverage support, modern ESM, and broad production support without a request library. Source: [Node.js releases](https://nodejs.org/en/about/previous-releases).
- **TypeScript 6 with strict NodeNext ESM.** TypeScript 6 is current and prepares projects for TypeScript 7 while keeping the familiar type system. `strict`, `exactOptionalPropertyTypes`, and project references make provider boundaries explicit. Source: [TypeScript 6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html).
- **npm workspaces and TypeScript project references.** npm ships with Node and keeps contributor setup to one package manager. Five packages preserve the requested boundaries without a monorepo framework.
- **Official MCP TypeScript SDK v2.** `@modelcontextprotocol/server` 2.x is the stable line for the 2026-07-28 specification and provides native stdio. Source: [official SDK repository](https://github.com/modelcontextprotocol/typescript-sdk).
- **Zod 4.** One runtime schema definition supplies TypeScript inference, CLI/config validation, MCP inputs, and JSON Schema. Zod 4 is stable. Source: [Zod versioning](https://zod.dev/v4/versioning).
- **Native fetch plus a small adapter layer.** Avoids a general HTTP dependency. The wrapper enforces GET-only safe retries, timeouts, redacted errors, rate pacing, and explicit status mapping.
- **Versioned JSON cache.** More inspectable and dependency-free than SQLite for version 0.1. Atomic replacement and mode `0600` protect local data. SQLite remains appropriate if query volume or multi-process locking becomes important.
- **Node test runner through `tsx`.** Tests execute TypeScript directly and use Node's maintained assertions and process APIs. Production build remains plain `tsc`.
- **Aiviron repository harness.** Aiviron records bounded context, verification evidence, and reusable project knowledge without adding a hosted runtime dependency.

## Rejected options

- **Database server or Redis:** violates zero-service local setup and adds no value at version 0.1 scale.
- **Docker requirement:** conflicts with direct `npx` acceptance criteria.
- **Required LLM:** candidate generation must remain deterministic, auditable, and offline.
- **Commander or oclif:** convenient, but command surface is small enough for a documented parser; avoiding them reduces install and supply-chain weight.
- **HTTP framework:** stdio MCP and an `npx` CLI need no listening server.
- **SDK v1:** supported temporarily but no longer current stable MCP line.

## Main risks

- Public providers change response formats and rate limits. Adapters isolate this drift and never infer availability from unexpected failures.
- A JSON cache lacks cross-process locking. Atomic writes prevent partial files; concurrent writers remain a documented version 0.1 limitation.
- Deterministic pronunciation and memorability scores are proxies, not linguistic truth. Methodology exposes every rule and weight.
