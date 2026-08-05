# Scoring methodology

Default composite weights:

- package uniqueness: 25%
- GitHub uniqueness: 20%
- domain options: 15%
- deterministic name quality: 20%
- search distinctiveness: 10%
- CLI usability: 10%

Weights are configurable. Composite scores divide by actual weight sum, so custom weights need not total 100.

## Deterministic quality signals

Quality score exposes each rule, score, weight, and explanation:

- length, favoring 5–12 normalized characters;
- lexical part count, favoring one or two parts;
- vowel ratio as a limited pronunciation proxy;
- triple repeated letters;
- punctuation dependence;
- number dependence;
- configured negative-language fragments;
- relationship to project-description terms and built-in related words;
- common ambiguous glyph sequences.

These are reproducible heuristics, not human linguistic judgment. Source constants and formulas live in `packages/core/src/index.ts`.

## Provider scoring

Confirmed absence from package registry variants scores 100. Exact or normalized package collision scores 0 and blocks recommendation. Registered domains score 15–20; RDAP 404 scores 100 with medium confidence and registrar warning. Unknown provider states stay near neutral instead of being treated as positive. GitHub exact repositories and account namespaces lower score; no returned exact collision does not become a global availability claim.

Trademark screening stays separate. A strong conflict can cap or block recommendation; version 0.1 provides manual official-search links and never outputs “trademark cleared.”
