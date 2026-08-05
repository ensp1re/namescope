# Privacy

Project descriptions may be confidential.

- Candidate generation, normalization, quality scoring, ranking math, configuration, cache, and local CLI collision checks run locally.
- A full check sends each candidate only to selected RDAP, package-registry, and GitHub providers.
- `domains` sends only candidate domains to RDAP.
- `packages` sends only candidate variants to selected registries.
- `--offline` prevents every network call. Remote dimensions remain explicitly unknown.
- No telemetry, analytics, account, hosted backend, or query collection exists.
- Environment variables and access tokens are never logged or stored in cache.
- Cache lives under `XDG_CACHE_HOME/namescope` or the platform home cache directory, uses file mode `0600`, and contains provider queries and results.
- `--no-cache` disables cache reads and writes. `--refresh` ignores old entries. Delete cache file to erase local history.

Running through MCP does not change these rules. MCP clients may have separate logging or retention behavior outside this project.
