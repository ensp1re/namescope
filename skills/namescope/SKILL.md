---
name: namescope
description: Generate, check, and rank software project names with the NameScope CLI or MCP server - npm, PyPI, crates.io, GitHub, RDAP domains, local CLI commands, name quality, and optional trademark links. Use when the user wants a name for a project, package, repo, or CLI, asks whether a name is taken, or wants several names compared.
---

# NameScope

Run NameScope for every availability claim. Do not guess whether a package, repo, or domain is
free from memory, and do not turn an `unknown` result into "available".

## Runtime

Published npm CLI: `namescope@0.1.0`. Requires Node 24 or newer. Pin the version.

```sh
npx namescope@0.1.0 find "a fast open-source database migration tool" --json
npx namescope@0.1.0 check taskforge --json
npx namescope@0.1.0 rank taskforge taskmint orbitdesk --json
npx namescope@0.1.0 domains taskforge --tlds com,io,dev --json
npx namescope@0.1.0 packages taskforge --registries npm,pypi,crates --json
```

If `namescope` is already on PATH, use that binary. If the NameScope MCP server is connected,
its tools do the same work: `generate_names`, `check_name`, `rank_names`, `check_domains`,
`check_packages`, `check_github`, `check_trademark`, `explain_score`.

## Repository development

From a NameScope checkout only. Do not use these after the skill is installed elsewhere.

```sh
npm install
npm run build
node packages/cli/dist/index.js check taskforge --offline --json
```

## Skill install

Project-local (omit `-g` unless the user asks for a user-wide install). Installer IDs are from
`npx skills@1.5.25`. Cursor, Codex, OpenCode, GitHub Copilot, and Gemini CLI share
`.agents/skills/namescope`.

```sh
npx skills add ensp1re/namescope --skill namescope --yes --agent cursor
npx skills add ensp1re/namescope --skill namescope --yes --agent codex
npx skills add ensp1re/namescope --skill namescope --yes --agent claude-code
npx skills add ensp1re/namescope --skill namescope --yes --agent opencode
npx skills add ensp1re/namescope --skill namescope --yes --agent github-copilot
npx skills add ensp1re/namescope --skill namescope --yes --agent grok
npx skills add ensp1re/namescope --skill namescope --yes --agent gemini-cli
npx skills add ensp1re/namescope --skill namescope --yes --agent windsurf
```

Global (user-wide): add `-g` to the same command.

Update / uninstall:

```sh
npx skills update namescope --yes
npx skills remove namescope --yes
```

Copy fallback when the installer is unavailable. The skill root is the directory that contains
`SKILL.md`, and it must also contain `references/` and `examples/`.

```sh
mkdir -p .agents/skills .claude/skills
cp -R skills/namescope .agents/skills/namescope
cp -R skills/namescope .claude/skills/namescope
```

## Pick the command first

| The user has | Command | MCP tool |
| --- | --- | --- |
| a project description, no names yet | `find <description>` | `generate_names`, then `rank_names` |
| one name | `check <name>` | `check_name` |
| two or more names | `rank <name...>` | `rank_names` |
| a name and only cares about domains | `domains <name> --tlds ...` | `check_domains` |
| a name and only cares about package registries | `packages <name> --registries ...` | `check_packages` |
| a score they want explained | — | `explain_score` |

`generate_names` only makes ideas. Its output has `availabilityChecked: false`. Never present
those names as free until `check` or `rank` has run on them.

## Flags

- `--json` for anything you will read back. `--markdown` when the user wants a report to paste.
- `--offline` sends no network requests. Every remote check becomes `unknown`. Use it when the
  user asks for no network access, and say that the result is local-only.
- `--count 12`, `--styles technical,playful`, `--keywords a,b`, `--exclude a,b` shape `find`.
- `--include-trademark --nice-classes 9,42 --jurisdiction US` adds official manual-search links
  and a disclaimer. It is not a trademark search.
- `--config <path>` reads a config file; default is `namecheck.config.json` in the working
  directory. Example: [examples/namecheck.config.json](examples/namecheck.config.json).
- `--timeout <ms>`, `--no-cache`, `--refresh`, `--cache-ttl 12h` control requests and cache.
- `GITHUB_TOKEN` in the environment only raises GitHub rate limits. It is optional. Never ask
  the user to paste a token into the chat.

## Read the result

Each `check` result, and each item of a `rank` or `find` array, matches
[references/result.schema.json](references/result.schema.json) (`schemaVersion`
`namescope-result/v1`). A full offline example:
[examples/check-offline.json](examples/check-offline.json).

- `score` is 0-100. `verdict` is one of `strong candidate` (80+), `promising candidate` (65+),
  `high conflict risk`, `blocked by conflict`, `invalid npm package name`.
- A package collision or a blocking trademark result caps the score at 59 and sets
  `blocked by conflict`. Say which provider caused it.
- `unknownChecks` lists what could not be checked. Name them when you report the result. A
  high score with many unknowns is weak evidence.
- Provider `status` values: `available`, `no_exact_collision`, `likely_available` are
  favourable; `registered`, `collision`, `likely_taken`, `invalid` are conflicts; `unknown`,
  `unsupported`, `error`, `manual_verification_required` mean "not known". Report them as
  they are.
- `evidence[].source` is the URL that was checked. Quote it when the user asks why.

## Report

1. Lead with the ranked names, score, and verdict.
2. For each name, list conflicts first, then unknown checks.
3. Say that results are a snapshot: registries, GitHub, and domains can change at any time.
4. If trademark output was requested, repeat that it is not legal advice.
