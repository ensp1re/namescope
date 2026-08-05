import { evidence, executableInPath, nameVariants, normalizeName, type AdapterSet, type CheckContext, createLimit } from "@nametagged/core";
import type { ProviderResult, TrademarkScreening } from "@nametagged/schemas";

interface HttpResult {
  status: number;
  url: string;
  body: unknown;
  headers: Headers;
}

export class ProviderHttpError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly kind: "timeout" | "rate_limit" | "network" | "response";

  constructor(provider: string, kind: ProviderHttpError["kind"], message: string, status?: number) {
    super(message.replace(/(token|authorization|bearer)[=: ]+[^\s]+/gi, "$1=[redacted]"));
    this.name = "ProviderHttpError";
    this.provider = provider;
    this.kind = kind;
    if (status !== undefined) this.status = status;
  }
}

const lastRequest = new Map<string, number>();

async function throttle(provider: string, minimumGapMs: number): Promise<void> {
  const wait = Math.max(0, (lastRequest.get(provider) ?? 0) + minimumGapMs - Date.now());
  if (wait > 0) await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, wait));
  lastRequest.set(provider, Date.now());
}

async function getJson(provider: string, url: string, context: CheckContext, headers: Record<string, string> = {}, retries = 1): Promise<HttpResult> {
  if (context.offline) throw new ProviderHttpError(provider, "network", "Offline mode prevented network request.");
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await throttle(provider, provider === "github" ? 150 : 75);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "user-agent": "nametagged/0.1 (+https://github.com/ensp1re/nametagged)",
          ...headers,
        },
        signal: controller.signal,
      });
      const body = response.status === 204 ? null : await response.json().catch(() => null);
      if ((response.status === 429 || response.status >= 500) && attempt < retries) continue;
      return { status: response.status, url: response.url || url, body, headers: response.headers };
    } catch (error) {
      if (attempt < retries && !(error instanceof DOMException && error.name === "AbortError")) continue;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ProviderHttpError(provider, "timeout", `Request timed out after ${context.timeoutMs} ms.`);
      }
      throw new ProviderHttpError(provider, "network", error instanceof Error ? error.message : "Network request failed.");
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new ProviderHttpError(provider, "response", "Request failed after safe GET retry.");
}

function errorResult(provider: string, query: string, error: unknown): ProviderResult {
  const detail = error instanceof ProviderHttpError ? error.message : error instanceof Error ? error.message : "Unknown provider error.";
  const status = error instanceof ProviderHttpError && error.kind === "rate_limit" ? "unknown" : "error";
  return {
    provider,
    status,
    score: status === "unknown" ? 50 : 40,
    summary: detail,
    warnings: [detail],
    evidence: [evidence(provider, query, status, detail, "none")],
  };
}

export async function checkDomains(name: string, tlds: string[], context: CheckContext): Promise<ProviderResult[]> {
  const normalized = normalizeName(name);
  const limit = createLimit(3);
  return Promise.all(tlds.map((rawTld) => limit(async () => {
    const tld = rawTld.toLowerCase().replace(/^\./, "");
    const domain = `${normalized}.${tld}`;
    const source = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
    if (!/^[a-z0-9-]{2,63}$/.test(tld) || !normalized) {
      return {
        provider: "rdap",
        status: "unsupported",
        score: 50,
        summary: `${domain} uses an invalid or unsupported TLD format.`,
        warnings: ["RDAP support could not be determined."],
        evidence: [evidence("rdap", domain, "unsupported", "Invalid or unsupported TLD format.", "high", source)],
      } satisfies ProviderResult;
    }
    try {
      const response = await getJson("rdap", source, context);
      if (response.status === 404) {
        return {
          provider: "rdap",
          status: "available",
          score: 100,
          summary: `${domain} was not found by RDAP and appears available.`,
          warnings: ["Confirm current availability with a registrar before purchase."],
          evidence: [evidence("rdap", domain, "available", "RDAP returned HTTP 404 (not found).", "medium", source)],
        } satisfies ProviderResult;
      }
      if (response.status >= 200 && response.status < 300) {
        const object = response.body as { handle?: string; status?: string[] } | null;
        return {
          provider: "rdap",
          status: "registered",
          score: 15,
          summary: `${domain} is registered according to RDAP.`,
          warnings: [],
          evidence: [evidence("rdap", domain, "registered", `RDAP record${object?.handle ? ` handle ${object.handle}` : ""}${object?.status?.length ? `; status ${object.status.join(", ")}` : ""}.`, "high", source)],
        } satisfies ProviderResult;
      }
      if ([400, 501].includes(response.status)) {
        return {
          provider: "rdap",
          status: "unsupported",
          score: 50,
          summary: `${domain} could not be checked by this RDAP bootstrap service.`,
          warnings: ["Use a registrar for manual verification."],
          evidence: [evidence("rdap", domain, "unsupported", `RDAP returned HTTP ${response.status}.`, "medium", source)],
        } satisfies ProviderResult;
      }
      return {
        provider: "rdap",
        status: "unknown",
        score: 50,
        summary: `${domain} availability is unknown.`,
        warnings: [`RDAP returned HTTP ${response.status}; not treated as available.`],
        evidence: [evidence("rdap", domain, "unknown", `RDAP returned HTTP ${response.status}.`, "none", source)],
      } satisfies ProviderResult;
    } catch (error) {
      return errorResult("rdap", domain, error);
    }
  })));
}

interface RegistryDefinition {
  id: "npm" | "pypi" | "crates";
  endpoint(name: string): string;
  packageUrl(name: string): string;
  label: string;
}

const REGISTRIES: Record<string, RegistryDefinition> = {
  npm: {
    id: "npm",
    endpoint: (name) => `https://registry.npmjs.org/${encodeURIComponent(name)}`,
    packageUrl: (name) => `https://www.npmjs.com/package/${encodeURIComponent(name)}`,
    label: "npm",
  },
  pypi: {
    id: "pypi",
    endpoint: (name) => `https://pypi.org/pypi/${encodeURIComponent(name)}/json`,
    packageUrl: (name) => `https://pypi.org/project/${encodeURIComponent(name)}/`,
    label: "PyPI",
  },
  crates: {
    id: "crates",
    endpoint: (name) => `https://crates.io/api/v1/crates/${encodeURIComponent(name)}`,
    packageUrl: (name) => `https://crates.io/crates/${encodeURIComponent(name)}`,
    label: "crates.io",
  },
};

async function checkRegistry(name: string, registry: RegistryDefinition, context: CheckContext): Promise<ProviderResult> {
  const variants = nameVariants(name);
  const matches: string[] = [];
  const checked: string[] = [];
  try {
    for (const variant of variants) {
      const response = await getJson(registry.id, registry.endpoint(variant), context, registry.id === "crates" ? { "x-requested-with": "nametagged" } : {});
      checked.push(variant);
      if (response.status >= 200 && response.status < 300) matches.push(variant);
      else if (response.status !== 404) {
        return {
          provider: registry.id,
          status: "unknown",
          score: 50,
          summary: `${registry.label} collision status is unknown.`,
          warnings: [`${registry.label} returned HTTP ${response.status}; absence was not inferred.`],
          evidence: [evidence(registry.id, variant, "unknown", `Registry returned HTTP ${response.status}.`, "none", registry.endpoint(variant))],
        };
      }
    }
    const exact = matches.includes(name.toLowerCase()) || matches.includes(normalizeName(name));
    if (matches.length) {
      return {
        provider: registry.id,
        status: "collision",
        score: exact ? 0 : 15,
        summary: `${registry.label} has ${exact ? "an exact or normalized" : "a separator-variant"} collision: ${matches.join(", ")}.`,
        warnings: exact ? [`Exact or normalized ${registry.label} package collision found.`] : [`Separator variation exists on ${registry.label}.`],
        evidence: matches.map((match) => evidence(registry.id, match, "collision", `Package exists as “${match}”.`, "high", registry.packageUrl(match))),
      };
    }
    return {
      provider: registry.id,
      status: "no_exact_collision",
      score: 100,
      summary: `No exact or common separator collision found on ${registry.label}.`,
      warnings: ["Registry state can change after this check."],
      evidence: checked.map((variant) => evidence(registry.id, variant, "no_exact_collision", "Registry returned HTTP 404.", "high", registry.packageUrl(variant))),
    };
  } catch (error) {
    return errorResult(registry.id, normalizeName(name), error);
  }
}

export async function checkPackages(name: string, registries: string[], context: CheckContext): Promise<ProviderResult[]> {
  const limit = createLimit(3);
  return Promise.all(registries.map((id) => {
    const registry = REGISTRIES[id.toLowerCase()];
    if (!registry) return Promise.resolve({
      provider: id,
      status: "unsupported",
      score: 50,
      summary: `${id} adapter is not supported in version 0.1.`,
      warnings: ["Supported registries: npm, pypi, crates."],
      evidence: [evidence(id, name, "unsupported", "No adapter is installed.", "high")],
    } satisfies ProviderResult);
    return limit(() => checkRegistry(name, registry, context));
  }));
}

export async function checkGithub(name: string, context: CheckContext): Promise<ProviderResult> {
  const normalized = normalizeName(name);
  const token = process.env.GITHUB_TOKEN;
  const headers = token ? { authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" } : { "x-github-api-version": "2022-11-28" };
  const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(`${normalized} in:name`)}&per_page=10`;
  const userUrl = `https://api.github.com/users/${encodeURIComponent(normalized)}`;
  try {
    const [search, user] = await Promise.all([
      getJson("github", searchUrl, context, headers),
      getJson("github", userUrl, context, headers),
    ]);
    if (search.status === 403 || search.status === 429) {
      const remaining = search.headers.get("x-ratelimit-remaining");
      throw new ProviderHttpError("github", "rate_limit", `GitHub rate limit prevented search${remaining === "0" ? " (remaining: 0)" : ""}.`, search.status);
    }
    if (search.status < 200 || search.status >= 300) {
      return errorResult("github", normalized, new ProviderHttpError("github", "response", `GitHub returned HTTP ${search.status}.`, search.status));
    }
    const body = search.body as { total_count?: number; items?: Array<{ name?: string; full_name?: string; html_url?: string; stargazers_count?: number }> };
    const items = body.items ?? [];
    const exact = items.filter((item) => normalizeName(item.name ?? "") === normalized);
    const popularSimilar = items.filter((item) => (item.stargazers_count ?? 0) >= 100 && normalizeName(item.name ?? "") !== normalized);
    const userExists = user.status >= 200 && user.status < 300;
    const collision = exact.length > 0 || userExists;
    const score = collision ? Math.max(5, 45 - exact.length * 10 - (userExists ? 10 : 0)) : popularSimilar.length ? 65 : 90;
    const evidenceItems = [
      evidence("github", normalized, collision ? "collision" : "no_exact_collision", `Repository search returned ${body.total_count ?? items.length} result(s); ${exact.length} normalized exact match(es).`, collision ? "high" : "medium", `https://github.com/search?q=${encodeURIComponent(`${normalized} in:name`)}&type=repositories`),
      evidence("github", normalized, userExists ? "collision" : user.status === 404 ? "no_exact_collision" : "unknown", userExists ? "GitHub user or organization namespace exists." : user.status === 404 ? "No exact user or organization namespace was returned." : `Namespace lookup returned HTTP ${user.status}.`, userExists || user.status === 404 ? "high" : "none", `https://github.com/${encodeURIComponent(normalized)}`),
      ...exact.slice(0, 5).map((item) => evidence("github", normalized, "collision", `${item.full_name ?? item.name} has ${item.stargazers_count ?? 0} star(s).`, "high", item.html_url)),
    ];
    return {
      provider: "github",
      status: collision ? "collision" : "no_exact_collision",
      score,
      summary: collision ? `${exact.length} exact repository match(es) and ${userExists ? "an occupied" : "no"} account namespace.` : `No exact repository or account collision returned; ${popularSimilar.length} popular similar result(s).`,
      warnings: ["GitHub search is rate-limited and cannot prove global availability."],
      evidence: evidenceItems,
    };
  } catch (error) {
    return errorResult("github", normalized, error);
  }
}

const RESERVED_COMMANDS = new Set([
  "alias", "bg", "break", "cd", "command", "continue", "eval", "exec", "exit", "export", "false", "fg", "git", "hash", "jobs", "kill", "node", "npm", "npx", "pwd", "read", "return", "set", "shift", "test", "trap", "true", "type", "ulimit", "umask", "unalias", "unset", "wait", "bash", "sh", "zsh", "python", "python3", "cargo", "rustc", "go", "java", "ruby", "docker", "kubectl",
]);

export async function checkCli(name: string): Promise<ProviderResult> {
  const command = normalizeName(name);
  const reserved = RESERVED_COMMANDS.has(command);
  const executable = command ? await executableInPath(command) : undefined;
  const collision = reserved || Boolean(executable);
  return {
    provider: "cli",
    status: collision ? "collision" : "no_exact_collision",
    score: collision ? 0 : command.length <= 12 ? 100 : 75,
    summary: collision ? `${command} collides with ${executable ? "an executable in PATH" : "a common or reserved command"}.` : `${command} has no local PATH or common-command collision.`,
    warnings: ["Local command checks describe only this machine and built-in command list."],
    evidence: [evidence("cli", command, collision ? "collision" : "no_exact_collision", executable ? `Executable found at ${executable}.` : reserved ? "Name is in documented common/reserved command list." : "No executable found in PATH and no reserved-list match.", "high")],
  };
}

export async function checkTrademark(name: string, jurisdiction: string, niceClasses: number[]): Promise<TrademarkScreening> {
  const normalizedJurisdiction = jurisdiction.toUpperCase();
  const links = normalizedJurisdiction === "EU"
    ? [`https://euipo.europa.eu/eSearch/#details/trademarks?text=${encodeURIComponent(name)}`]
    : [`https://tmsearch.uspto.gov/search/search-results?query=${encodeURIComponent(name)}`];
  links.push(`https://branddb.wipo.int/en/quicksearch?by=brandName&v=${encodeURIComponent(name)}`);
  const classText = niceClasses.length ? ` Nice classes requested: ${niceClasses.join(", ")}.` : "";
  return {
    status: "manual_review_required",
    blocking: false,
    disclaimer: "Trademark results are preliminary informational screening and are not legal advice or a comprehensive clearance search. Consult a qualified trademark attorney before relying on a name for commercial use.",
    officialSearchLinks: links,
    evidence: [evidence("trademark", name, "manual_verification_required", `Version 0.1 provides official search links and does not claim clearance.${classText}`, "none", links[0])],
  };
}

export function createDefaultAdapters(): AdapterSet {
  return {
    domains: checkDomains,
    packages: checkPackages,
    github: checkGithub,
    cli: checkCli,
    trademark: checkTrademark,
  };
}
