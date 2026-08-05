# Data and persistence

<!-- aiviron:knowledge:start -->
> This source-backed project document is managed by Aiviron. Source code remains the implementation authority.

## Why this document exists

Database schemas, migrations, or persistence libraries were detected

## Source evidence

- `.ai/config.yaml`
- `docs/stack-evaluation.md`
<!-- aiviron:knowledge:end -->

## Maintained knowledge

Only runtime persistence is versioned JSON provider cache. Default path is `XDG_CACHE_HOME/namescope/cache-v1.json` or platform home cache directory. Writes are serialized, atomically renamed, and mode `0600`. Entries record provider, query, result, retrieval time, expiry, and schema version. `--no-cache` disables reads and writes; `--refresh` ignores existing entries.
