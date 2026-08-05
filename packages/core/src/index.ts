import { constants } from "node:fs";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  ConfigSchema,
  RESULT_SCHEMA_VERSION,
  type Candidate,
  type CompletedResult,
  type Evidence,
  type GeneratedNames,
  type NamecheckConfig,
  type ProviderResult,
  type QualitySignal,
  type ScoringWeights,
  type TrademarkScreening,
} from "@namescope/schemas";

export * from "@namescope/schemas";

const DEFAULT_STYLES = ["technical", "open-source", "developer-tool"];
const STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "be", "by", "for", "from", "in", "is", "it",
  "of", "on", "or", "that", "the", "this", "to", "with", "tool", "software",
]);
const NEGATIVE_WORDS = ["dead", "kill", "hate", "fraud", "scam", "malware", "virus", "toxic"];
const GENERIC_CONCEPTS = new Set([
  "app", "application", "developer", "developers", "fast", "first", "free", "local", "modern",
  "open", "platform", "project", "service", "simple", "source", "system",
]);

const SYNONYMS: Record<string, string[]> = {
  fast: ["swift", "rapid", "dash"],
  local: ["local", "native", "home", "near"],
  open: ["open", "free", "commons"],
  source: ["forge", "code", "craft"],
  task: ["task", "work", "todo"],
  manager: ["desk", "board", "pilot"],
  database: ["data", "store", "base"],
  migration: ["shift", "move", "bridge"],
  developer: ["dev", "code", "hack"],
  developers: ["dev", "code", "hack"],
  team: ["crew", "squad", "mesh"],
  queue: ["queue", "flow", "line"],
  job: ["job", "task", "work"],
  secure: ["guard", "safe", "lock"],
  monitor: ["watch", "scope", "pulse"],
  name: ["name", "tag", "alias", "label", "identity", "moniker"],
  names: ["name", "tag", "alias", "label", "identity", "moniker"],
  naming: ["name", "tag", "alias", "label", "identity", "moniker"],
  intelligence: ["signal", "insight", "radar", "sense", "scope"],
  validate: ["check", "verify", "proof", "guard", "lint"],
  validation: ["check", "verify", "proof", "guard", "lint"],
  validator: ["check", "verify", "proof", "guard", "lint"],
};

const STYLE_WORDS: Record<string, { prefixes: string[]; suffixes: string[] }> = {
  descriptive: { prefixes: ["open", "smart"], suffixes: ["tool", "kit", "hub"] },
  technical: { prefixes: ["byte", "code", "dev"], suffixes: ["stack", "core", "node"] },
  playful: { prefixes: ["tiny", "happy", "zippy"], suffixes: ["fox", "pop", "bee"] },
  professional: { prefixes: ["prime", "clear", "solid"], suffixes: ["works", "labs", "suite"] },
  minimal: { prefixes: ["neo", "mono", "one"], suffixes: ["io", "ly", "hq"] },
  invented: { prefixes: ["avi", "nexa", "orbi"], suffixes: ["ora", "ivo", "exa"] },
  "open-source": { prefixes: ["open", "libre", "common"], suffixes: ["forge", "commons", "lab"] },
  "command-line": { prefixes: ["shell", "term", "cli"], suffixes: ["ctl", "cmd", "sh"] },
  infrastructure: { prefixes: ["cloud", "infra", "grid"], suffixes: ["mesh", "ops", "plane"] },
  "developer-tool": { prefixes: ["dev", "code", "hack"], suffixes: ["kit", "forge", "tools"] },
};

function title(word: string): string {
  return word ? `${word[0]?.toUpperCase()}${word.slice(1).toLowerCase()}` : "";
}

export function tokenizeDescription(description: string): string[] {
  return [...new Set(description.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word)))];
}

export function normalizeName(name: string): string {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function splitName(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.toLowerCase())
    .filter(Boolean);
}

export function nameVariants(name: string): string[] {
  const words = splitName(name);
  const compact = normalizeName(name);
  const raw = name.toLowerCase();
  return [...new Set([compact, words.join("-"), words.join("_"), ...(/^[a-z0-9._-]+$/.test(raw) ? [raw] : [])])].filter(Boolean);
}

export interface GenerateOptions {
  count?: number | undefined;
  styles?: string[] | undefined;
  keywords?: string[] | undefined;
  excludedWords?: string[] | undefined;
}

interface NamingConcept {
  sourceWord: string;
  terms: string[];
  distinctive: boolean;
  order: number;
}

export function generateNames(description: string, options: GenerateOptions = {}): GeneratedNames {
  if (!description.trim()) throw new Error("Project description must not be empty");
  const count = Math.max(1, Math.min(options.count ?? 12, 100));
  const styles = options.styles?.length ? options.styles : DEFAULT_STYLES;
  const excluded = new Set((options.excludedWords ?? []).map(normalizeName));
  const keywordWords = (options.keywords ?? []).flatMap((keyword) => keyword.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2));
  const keywordSet = new Set(keywordWords);
  const source = [...new Set([...keywordWords, ...tokenizeDescription(description)])];
  if (!source.length) source.push("project", "code");
  const concepts: NamingConcept[] = source.map((sourceWord, order) => ({
    sourceWord,
    terms: [...new Set(SYNONYMS[sourceWord] ?? [sourceWord])],
    distinctive: keywordSet.has(sourceWord) || !GENERIC_CONCEPTS.has(sourceWord),
    order,
  })).sort((left, right) => Number(right.distinctive) - Number(left.distinctive) || left.order - right.order);
  const anchors = concepts.some((concept) => concept.distinctive)
    ? concepts.filter((concept) => concept.distinctive)
    : concepts;
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  const add = (name: string, style: string, rationale: string, sourceWords: string[]): boolean => {
    const normalized = normalizeName(name);
    if (normalized.length < 3 || normalized.length > 24 || seen.has(normalized)) return false;
    if ([...excluded].some((word) => word && normalized.includes(word))) return false;
    seen.add(normalized);
    candidates.push({ name, style, rationale, sourceWords });
    return true;
  };

  // Pair distinct project concepts before adding generic style vocabulary. This keeps
  // modifiers such as "local-first" from outranking the product's actual purpose.
  let semanticIndex = 0;
  const semanticPairs: Array<[NamingConcept, NamingConcept]> = [];
  for (let leftIndex = 0; leftIndex < anchors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < anchors.length; rightIndex += 1) {
      semanticPairs.push([anchors[leftIndex]!, anchors[rightIndex]!]);
    }
  }
  if (!semanticPairs.length && anchors.length === 1) {
    for (const companion of concepts) {
      if (companion !== anchors[0]) semanticPairs.push([anchors[0]!, companion]);
    }
  }

  for (const [leftConcept, rightConcept] of semanticPairs) {
    for (const left of leftConcept.terms) {
      for (const right of rightConcept.terms) {
        if (candidates.length >= count) break;
        const style = styles[semanticIndex % styles.length]!;
        if (add(
          `${title(left)}${title(right)}`,
          style,
          `Combines “${left}” from “${leftConcept.sourceWord}” with “${right}” from “${rightConcept.sourceWord}”.`,
          [left, right],
        )) semanticIndex += 1;
      }
      if (candidates.length >= count) break;
    }
    if (candidates.length >= count) break;
  }

  for (const style of styles) {
    const vocabulary = STYLE_WORDS[style] ?? STYLE_WORDS["developer-tool"]!;
    const roots = (anchors.length ? anchors : concepts).flatMap((concept) => concept.terms);
    for (let index = 0; index < roots.length && candidates.length < count; index += 1) {
      const left = roots[index]!;
      const suffix = vocabulary.suffixes[index % vocabulary.suffixes.length]!;
      add(`${title(left)}${title(suffix)}`, style, `Pairs “${left}” with ${style} suffix “${suffix}”.`, [left, suffix]);
      const prefix = vocabulary.prefixes[index % vocabulary.prefixes.length]!;
      add(`${title(prefix)}${title(left)}`, style, `Pairs ${style} prefix “${prefix}” with “${left}”.`, [prefix, left]);
    }
  }

  return {
    projectDescription: description,
    candidates: candidates.slice(0, count),
    generatedAt: new Date().toISOString(),
    availabilityChecked: false,
  };
}

function vowelRatio(value: string): number {
  const letters = value.match(/[a-z]/gi) ?? [];
  if (!letters.length) return 0;
  return letters.filter((letter) => /[aeiouy]/i.test(letter)).length / letters.length;
}

export function analyzeQuality(name: string, projectDescription = ""): { score: number; signals: QualitySignal[] } {
  const normalized = normalizeName(name);
  const words = splitName(name);
  const descriptionWords = new Set(tokenizeDescription(projectDescription));
  const signals: QualitySignal[] = [];
  const push = (id: string, score: number, weight: number, explanation: string): void => {
    signals.push({ id, score: Math.max(0, Math.min(100, Math.round(score))), weight, explanation });
  };

  const lengthScore = normalized.length >= 5 && normalized.length <= 12 ? 100
    : normalized.length >= 3 && normalized.length <= 18 ? 75 : 35;
  push("length", lengthScore, 18, `${normalized.length} characters; 5–12 is easiest to remember and type.`);
  push("word-count", words.length <= 2 ? 95 : words.length === 3 ? 70 : 35, 10, `${words.length || 1} lexical part(s).`);
  const ratio = vowelRatio(normalized);
  push("pronounceability", ratio >= 0.25 && ratio <= 0.65 ? 90 : 48, 16, `Vowel ratio ${ratio.toFixed(2)} used as a documented pronunciation proxy.`);
  const repeated = /(.)\1\1/i.test(normalized);
  push("repeated-letters", repeated ? 30 : 100, 8, repeated ? "Contains three repeated letters." : "No triple-letter sequence.");
  const punctuation = /[-_.]/.test(name);
  push("punctuation", punctuation ? 55 : 100, 10, punctuation ? "Depends on punctuation in at least one spelling." : "Works without punctuation.");
  const hasNumber = /\d/.test(name);
  push("numbers", hasNumber ? 45 : 100, 8, hasNumber ? "Contains a number that may be spoken ambiguously." : "No number dependence.");
  const negative = NEGATIVE_WORDS.find((word) => normalized.includes(word));
  push("negative-language", negative ? 0 : 100, 15, negative ? `Contains negative-language fragment “${negative}”.` : "No configured negative-language fragment found.");
  const relevanceMatches = words.filter((word) => descriptionWords.has(word) || [...descriptionWords].some((term) => (SYNONYMS[term] ?? []).includes(word))).length;
  push("technical-relevance", projectDescription ? Math.min(100, 45 + relevanceMatches * 28) : 60, 10, projectDescription ? `${relevanceMatches} part(s) relate to project description.` : "No project description supplied; relevance remains neutral.");
  const ambiguous = /[lI]{2}|[oO]0|rn/i.test(name);
  push("visual-ambiguity", ambiguous ? 50 : 95, 5, ambiguous ? "Contains a potentially ambiguous glyph sequence." : "No common ambiguous glyph sequence found.");

  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const score = Math.round(signals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / totalWeight);
  return { score, signals };
}

export function createLimit(concurrency: number): <T>(work: () => Promise<T>) => Promise<T> {
  const maximum = Math.max(1, Math.floor(concurrency));
  let active = 0;
  const queue: Array<() => void> = [];
  const release = (): void => {
    active -= 1;
    queue.shift()?.();
  };
  return async <T>(work: () => Promise<T>): Promise<T> => {
    if (active >= maximum) await new Promise<void>((resolvePromise) => queue.push(resolvePromise));
    active += 1;
    try {
      return await work();
    } finally {
      release();
    }
  };
}

interface CacheEntry {
  schemaVersion: 1;
  provider: string;
  query: string;
  result: unknown;
  retrievedAt: string;
  expiresAt: string;
}

export interface CacheOptions {
  path?: string;
  disabled?: boolean;
}

export class JsonCache {
  readonly path: string;
  readonly disabled: boolean;
  private entries: Record<string, CacheEntry> | undefined;
  private loadPromise: Promise<Record<string, CacheEntry>> | undefined;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(options: CacheOptions = {}) {
    const base = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
    this.path = options.path ?? join(base, "namescope", "cache-v1.json");
    this.disabled = options.disabled ?? false;
  }

  private key(provider: string, query: string): string {
    return `${provider}:${query}`;
  }

  private async load(): Promise<Record<string, CacheEntry>> {
    if (this.entries) return this.entries;
    this.loadPromise ??= (async () => {
      try {
        const parsed = JSON.parse(await readFile(this.path, "utf8")) as { schemaVersion?: number; entries?: Record<string, CacheEntry> };
        this.entries = parsed.schemaVersion === 1 && parsed.entries ? parsed.entries : {};
      } catch {
        this.entries = {};
      }
      return this.entries;
    })();
    return this.loadPromise;
  }

  async get<T>(provider: string, query: string): Promise<T | undefined> {
    if (this.disabled) return undefined;
    const entry = (await this.load())[this.key(provider, query)];
    if (!entry || Date.parse(entry.expiresAt) <= Date.now()) return undefined;
    return entry.result as T;
  }

  async set<T>(provider: string, query: string, result: T, ttlMs: number): Promise<void> {
    if (this.disabled) return;
    this.writeChain = this.writeChain.then(async () => {
      const now = new Date();
      const entries = await this.load();
      entries[this.key(provider, query)] = {
        schemaVersion: 1,
        provider,
        query,
        result,
        retrievedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      };
      await mkdir(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.${process.pid}.tmp`;
      await writeFile(temporary, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, this.path);
    });
    await this.writeChain;
  }
}

export async function loadConfig(file = "namecheck.config.json", overrides: Partial<NamecheckConfig> = {}): Promise<NamecheckConfig> {
  let configured: unknown = {};
  try {
    configured = JSON.parse(await readFile(resolve(file), "utf8"));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw new Error(`Unable to read configuration: ${code ?? "invalid JSON"}`);
  }
  const base = ConfigSchema.parse(configured);
  return ConfigSchema.parse({
    ...base,
    ...overrides,
    weights: { ...base.weights, ...(overrides.weights ?? {}) },
  });
}

export interface CheckContext {
  timeoutMs: number;
  offline: boolean;
}

export interface AdapterSet {
  domains(name: string, tlds: string[], context: CheckContext): Promise<ProviderResult[]>;
  packages(name: string, registries: string[], context: CheckContext): Promise<ProviderResult[]>;
  github(name: string, context: CheckContext): Promise<ProviderResult>;
  cli(name: string): Promise<ProviderResult>;
  trademark(name: string, jurisdiction: string, niceClasses: number[]): Promise<TrademarkScreening>;
}

export interface CheckOptions {
  projectDescription?: string | undefined;
  ecosystems?: string[] | undefined;
  tlds?: string[] | undefined;
  includeSocial?: boolean | undefined;
  includeTrademark?: boolean | undefined;
  jurisdiction?: string | undefined;
  niceClasses?: number[] | undefined;
  scoringWeights?: { [Key in keyof ScoringWeights]?: ScoringWeights[Key] | undefined } | undefined;
  offline?: boolean | undefined;
  refresh?: boolean | undefined;
  noCache?: boolean | undefined;
  timeoutMs?: number | undefined;
  cacheTtlMs?: number | undefined;
}

function unknownResult(provider: string, query: string, detail: string): ProviderResult {
  const checkedAt = new Date().toISOString();
  return {
    provider,
    status: "unknown",
    summary: detail,
    warnings: [detail],
    evidence: [{ provider, query, status: "unknown", detail, checkedAt, confidence: "none" }],
  };
}

function mean(values: number[], fallback = 50): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : fallback;
}

function statusScore(result: ProviderResult): number {
  if (typeof result.score === "number") return result.score;
  return {
    available: 100,
    no_exact_collision: 100,
    likely_available: 80,
    registered: 20,
    collision: 0,
    likely_taken: 20,
    invalid: 0,
    unknown: 50,
    unsupported: 50,
    error: 40,
    manual_verification_required: 50,
  }[result.status];
}

export class NamingIntelligence {
  readonly config: NamecheckConfig;
  readonly adapters: AdapterSet;
  readonly cache: JsonCache;

  constructor(adapters: AdapterSet, config: NamecheckConfig = ConfigSchema.parse({}), cache = new JsonCache()) {
    this.adapters = adapters;
    this.config = config;
    this.cache = cache;
  }

  generate(description: string, options: GenerateOptions = {}): GeneratedNames {
    return generateNames(description, { excludedWords: this.config.excludedWords, ...options });
  }

  private async cached<T>(provider: string, query: string, options: CheckOptions, work: () => Promise<T>): Promise<T> {
    if (!options.noCache && !options.refresh) {
      const cached = await this.cache.get<T>(provider, query);
      if (cached !== undefined) return cached;
    }
    const result = await work();
    if (!options.noCache) await this.cache.set(provider, query, result, options.cacheTtlMs ?? this.config.cacheTtlHours * 3_600_000);
    return result;
  }

  async checkDomains(name: string, tlds: string[] = this.config.tlds, options: CheckOptions = {}): Promise<ProviderResult[]> {
    if (options.offline) return tlds.map((tld) => unknownResult("rdap", `${normalizeName(name)}.${tld}`, "Offline mode prevented RDAP request."));
    const query = `${normalizeName(name)}|${[...tlds].sort().join(",")}`;
    return this.cached("rdap", query, options, () => this.adapters.domains(name, tlds, {
      timeoutMs: options.timeoutMs ?? this.config.timeoutMs,
      offline: false,
    }));
  }

  async checkPackages(name: string, registries: string[] = this.config.registries, options: CheckOptions = {}): Promise<ProviderResult[]> {
    if (options.offline) return registries.map((registry) => unknownResult(registry, normalizeName(name), "Offline mode prevented package-registry request."));
    const query = `${normalizeName(name)}|${[...registries].sort().join(",")}`;
    return this.cached("packages", query, options, () => this.adapters.packages(name, registries, {
      timeoutMs: options.timeoutMs ?? this.config.timeoutMs,
      offline: false,
    }));
  }

  async checkGithub(name: string, options: CheckOptions = {}): Promise<ProviderResult> {
    if (options.offline) return unknownResult("github", normalizeName(name), "Offline mode prevented GitHub request.");
    return this.cached("github", normalizeName(name), options, () => this.adapters.github(name, {
      timeoutMs: options.timeoutMs ?? this.config.timeoutMs,
      offline: false,
    }));
  }

  async checkTrademark(name: string, jurisdiction = "US", niceClasses: number[] = []): Promise<TrademarkScreening> {
    return this.adapters.trademark(name, jurisdiction, niceClasses);
  }

  async checkName(name: string, options: CheckOptions = {}): Promise<CompletedResult> {
    if (!normalizeName(name)) throw new Error("Name must contain letters or numbers");
    const registries = options.ecosystems ?? this.config.registries;
    const tlds = options.tlds ?? this.config.tlds;
    const [domains, packages, github, cli, trademark] = await Promise.all([
      this.checkDomains(name, tlds, options),
      this.checkPackages(name, registries, options),
      this.checkGithub(name, options),
      this.adapters.cli(name),
      options.includeTrademark ? this.checkTrademark(name, options.jurisdiction, options.niceClasses) : Promise.resolve(undefined),
    ]);
    const { score: qualityScore, signals } = analyzeQuality(name, options.projectDescription);
    const providers = [...domains, ...packages, github, cli];
    const weights: ScoringWeights = { ...this.config.weights };
    for (const [key, value] of Object.entries(options.scoringWeights ?? {})) {
      if (typeof value === "number") weights[key as keyof ScoringWeights] = value;
    }
    const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0) || 100;
    const domainScore = mean(domains.map(statusScore));
    const packageScore = mean(packages.map(statusScore));
    const githubScore = statusScore(github);
    const cliScore = statusScore(cli);
    const searchScore = 50;
    const dimensions = {
      packages: { score: packageScore, status: summarize(packages), weight: weights.packages, evidence: packages.flatMap((item) => item.evidence) },
      github: { score: githubScore, status: github.summary, weight: weights.github, evidence: github.evidence },
      domains: { score: domainScore, status: summarize(domains), weight: weights.domains, evidence: domains.flatMap((item) => item.evidence) },
      quality: { score: qualityScore, status: qualityScore >= 80 ? "strong deterministic quality" : qualityScore >= 60 ? "acceptable deterministic quality" : "quality concerns found", weight: weights.quality, evidence: [] },
      search: { score: searchScore, status: "optional web-search adapter not configured", weight: weights.search, evidence: [] },
      cli: { score: cliScore, status: cli.summary, weight: weights.cli, evidence: cli.evidence },
    };
    const rawScore = Object.entries(dimensions).reduce((sum, [key, dimension]) => sum + dimension.score * weights[key as keyof ScoringWeights], 0) / totalWeight;
    const invalidPackage = packages.some((item) => item.status === "invalid");
    const blocking = Boolean(trademark?.blocking) || invalidPackage || packages.some((item) => item.status === "collision");
    const score = Math.round(blocking ? Math.min(rawScore, 59) : rawScore);
    const unknownChecks = providers.filter((item) => ["unknown", "unsupported", "error", "manual_verification_required"].includes(item.status)).map((item) => item.provider);
    if (!options.includeSocial) unknownChecks.push("social handles (not requested)");
    unknownChecks.push("web search (adapter not configured)");
    const warnings = [...new Set([
      ...providers.flatMap((item) => item.warnings),
      "Domain availability can change; confirm with a registrar before purchase.",
      "GitHub search cannot prove global namespace availability.",
      "Trademark screening is preliminary information, not legal clearance.",
      ...(trademark?.blocking ? ["Trademark screening found a potential blocking conflict."] : []),
    ])];
    const verdict = invalidPackage ? "invalid npm package name" : blocking ? "blocked by conflict" : score >= 80 ? "strong candidate" : score >= 65 ? "promising candidate" : "high conflict risk";
    const explanation = `${name} scores ${score}/100 (${verdict}). Package uniqueness ${packageScore}, GitHub uniqueness ${githubScore}, domain options ${domainScore}, name quality ${qualityScore}, search distinctiveness ${searchScore}, and CLI usability ${cliScore}. ${unknownChecks.length} check(s) remain unknown or unrequested.`;
    return {
      schemaVersion: RESULT_SCHEMA_VERSION,
      name,
      normalizedName: normalizeName(name),
      score,
      verdict,
      dimensions,
      qualitySignals: signals,
      providers,
      ...(trademark ? { trademark } : {}),
      warnings,
      unknownChecks: [...new Set(unknownChecks)],
      scoringWeights: weights,
      explanation,
      checkedAt: new Date().toISOString(),
    };
  }

  async rankNames(names: string[], options: CheckOptions = {}): Promise<CompletedResult[]> {
    const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    const limit = createLimit(this.config.concurrency);
    const results = await Promise.all(unique.map((name) => limit(() => this.checkName(name, options))));
    return results.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  }

  async find(description: string, options: GenerateOptions & CheckOptions = {}): Promise<CompletedResult[]> {
    const generated = this.generate(description, options);
    return this.rankNames(generated.candidates.map((candidate) => candidate.name), { ...options, projectDescription: description });
  }
}

function summarize(results: ProviderResult[]): string {
  const collisions = results.filter((result) => result.status === "collision" || result.status === "registered").length;
  const favorable = results.filter((result) => result.status === "available" || result.status === "no_exact_collision").length;
  const unknown = results.length - collisions - favorable;
  return `${favorable} favorable, ${collisions} collision/registered, ${unknown} unknown`;
}

export function explainScore(result: CompletedResult): string {
  const totalWeight = Object.values(result.dimensions).reduce((sum, dimension) => sum + dimension.weight, 0);
  const dimensions = Object.entries(result.dimensions)
    .map(([name, value]) => {
      const share = totalWeight > 0 ? (value.weight / totalWeight) * 100 : 0;
      return `${name}: ${value.score}/100 at ${share.toFixed(1)}% of composite weight — ${value.status}`;
    })
    .join("\n");
  return `${result.name}: ${result.verdict} (${result.score}/100)\n${dimensions}\n\n${result.explanation}`;
}

export async function executableInPath(command: string): Promise<string | undefined> {
  const pathValue = process.env.PATH ?? "";
  for (const directory of pathValue.split(process.platform === "win32" ? ";" : ":").filter(Boolean)) {
    const extensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
    for (const extension of extensions) {
      const candidate = join(directory, `${command}${extension}`);
      try {
        await access(candidate, constants.X_OK);
        return candidate;
      } catch {
        // Keep local-only PATH inspection best effort.
      }
    }
  }
  return undefined;
}

export function evidence(provider: string, query: string, status: string, detail: string, confidence: Evidence["confidence"], source?: string): Evidence {
  return {
    provider,
    query,
    status,
    detail,
    checkedAt: new Date().toISOString(),
    confidence,
    ...(source ? { source } : {}),
  };
}
