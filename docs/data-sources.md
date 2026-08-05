# Data sources

| Provider | Query sent | Evidence | Main limitation |
| --- | --- | --- | --- |
| RDAP | candidate plus selected TLD | HTTP status and registration record summary | 404 suggests availability but registrar must confirm |
| npm | candidate plus exact and separator variants | local `validate-npm-package-name` verdict, package endpoint, and direct package links | namespace can change immediately; similarity policy may still block publication |
| PyPI | exact and separator variants | JSON endpoint and project links | normalization rules can evolve |
| crates.io | exact and separator variants | crate endpoint and direct links | rate limits apply |
| GitHub | name search and exact account lookup | counts, matching repositories, account result | unauthenticated rate limit; search is not exhaustive proof |
| Local CLI | normalized candidate | local `PATH` and built-in command list | represents current machine only |
| Trademark | name, jurisdiction, Nice classes | official manual-search links | no comprehensive dataset search in version 0.1 |

All remote calls use public endpoints. `GITHUB_TOKEN` is optional. Credentials are redacted from errors and never cached.

npm structural validation follows the workflow from [ensp1re/ai-naming-skill](https://github.com/ensp1re/ai-naming-skill): validate locally first, then query the live registry. Invalid names never trigger a registry request and never appear available.
