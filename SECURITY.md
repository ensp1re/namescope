# Security policy

## Supported versions

Security fixes target latest released minor version.

## Reporting

Use GitHub private vulnerability reporting when repository enables it. Otherwise contact maintainers privately before opening a public issue. Include affected version, reproduction, impact, and suggested mitigation. Do not include real tokens, confidential candidate names, or third-party personal data.

## Security boundaries

Nametagged sends names only to providers selected by user. Offline mode must make no network requests. Tokens must never enter logs, cache, reports, tests, or errors. Provider output is untrusted data and must be validated or rendered as text.
