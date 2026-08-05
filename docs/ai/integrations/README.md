# External integrations

<!-- aiviron:knowledge:start -->
> This source-backed project document is managed by Aiviron. Source code remains the implementation authority.

## Why this document exists

External-service adapters or SDKs were detected

## Source evidence

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/pull_request_template.md`
- `.github/workflows/ci.yml`
- `docs/architecture.md`
- `docs/data-sources.md`
- `README.md`
- `SECURITY.md`
<!-- aiviron:knowledge:end -->

## Maintained knowledge

Version 0.1 integrates public RDAP, npm, PyPI, crates.io, GitHub, and official trademark-search links. Remote adapters use GET, bounded concurrency, timeouts, minimal pacing, and one safe retry for transient responses. Only selected names are sent. Timeouts, rate limits, unexpected statuses, and parse failures remain unknown or error. `GITHUB_TOKEN` is optional and must never reach cache, evidence, or error text.
