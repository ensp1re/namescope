# Configuration

Default file is `namecheck.config.json` in current directory. Copy `namecheck.config.example.json` and change values.

CLI flags override file values:

- `--tlds com,io,dev`
- `--registries npm,pypi,crates`
- `--timeout 8000`
- `--cache-ttl 24h`
- `--no-cache`
- `--refresh`
- `--offline`

Weights may be any non-negative values. Nametagged normalizes by their sum.
