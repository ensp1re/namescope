# Limitations

- Results are snapshots. Registries, domains, and namespaces can change immediately.
- RDAP coverage and semantics vary by registry. Only a 404 from a valid RDAP request is considered an availability signal, and still requires registrar confirmation.
- GitHub search does not prove a name is globally available or free of confusing similarity.
- Package checks cover exact, normalized, hyphen, and underscore forms, not every typo or semantic similarity.
- Quality scores are deterministic heuristics, not user research.
- Search distinctiveness remains neutral until an optional public search adapter is configured in a future release.
- Social handles are not checked in version 0.1.
- Trademark output is preliminary informational screening, not legal advice or clearance.
- JSON cache uses atomic replacement but no cross-process lock.
- Local command checks vary by machine and cannot enumerate every shell function or alias.

Unknown results never mean available.
