# Data sources

| Provider | Query sent | Evidence | Main limitation |
| --- | --- | --- | --- |
| RDAP | candidate plus selected TLD | HTTP status and registration record summary | 404 suggests availability but registrar must confirm |
| npm | exact and separator variants | package endpoint and direct package links | namespace can change immediately |
| PyPI | exact and separator variants | JSON endpoint and project links | normalization rules can evolve |
| crates.io | exact and separator variants | crate endpoint and direct links | rate limits apply |
| GitHub | name search and exact account lookup | counts, matching repositories, account result | unauthenticated rate limit; search is not exhaustive proof |
| Local CLI | normalized candidate | local `PATH` and built-in command list | represents current machine only |
| Trademark | name, jurisdiction, Nice classes | official manual-search links | no comprehensive dataset search in version 0.1 |

All remote calls use public endpoints. `GITHUB_TOKEN` is optional. Credentials are redacted from errors and never cached.
