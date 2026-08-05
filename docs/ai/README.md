# Project knowledge

<!-- aiviron:knowledge:start -->
> This directory is reusable project knowledge generated from repository evidence. It is intended to be committed with the project.

## Documentation map

- [Application API](api/README.md)
- [Architecture](architecture.md)
- [Command-line interface](cli/README.md)
- [Data and persistence](data/README.md)
- [Deployment and infrastructure](deployment/README.md)
- [Development workflow](development.md)
- [External integrations](integrations/README.md)
- [Library API](library/README.md)
- [Project overview](overview.md)
- [Testing strategy](testing/README.md)

## Detected capabilities

- Application API (75% confidence)
- Command-line interface (99% confidence)
- Data and persistence (65% confidence)
- Deployment and infrastructure (75% confidence)
- External integrations (75% confidence)
- Library or package API (99% confidence)
- Testing strategy (75% confidence)

## Maintenance

Run `npx aiviron docs check` to detect missing or stale documents.
<!-- aiviron:knowledge:end -->

## Project guidance

Start with `overview.md` and `architecture.md`. Use CLI and MCP documents for entry surfaces, integrations for provider rules, data for cache behavior, and testing before changing shared contracts. Source files remain authoritative; run `npm run check` and `npx aiviron docs check` after behavior changes.
