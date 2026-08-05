#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createDefaultAdapters } from "@nametagged/adapters";
import { JsonCache, NamingIntelligence, loadConfig, type CheckOptions, type GenerateOptions } from "@nametagged/core";
import type { CompletedResult, ProviderResult } from "@nametagged/schemas";
import { runMcpServer } from "@nametagged/mcp";

type OutputMode = "human" | "json" | "compact-json" | "markdown";

interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Map<string, string | boolean>;
}

const VALUE_FLAGS = new Set([
  "--count", "--styles", "--keywords", "--exclude", "--tlds", "--registries", "--ecosystems",
  "--config", "--timeout", "--cache-ttl", "--jurisdiction", "--nice-classes",
]);

export function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]!;
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const [name, inline] = token.split("=", 2);
    if (inline !== undefined) {
      flags.set(name!, inline);
    } else if (VALUE_FLAGS.has(name!) && rest[index + 1] && !rest[index + 1]!.startsWith("--")) {
      flags.set(name!, rest[++index]!);
    } else {
      flags.set(name!, true);
    }
  }
  return { command, positionals, flags };
}

function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function listFlag(args: ParsedArgs, name: string): string[] | undefined {
  const value = stringFlag(args, name);
  return value?.split(",").map((item) => item.trim()).filter(Boolean);
}

export function parseNiceClassesFlag(args: ParsedArgs): number[] | undefined {
  const raw = args.flags.get("--nice-classes");
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") throw new Error("--nice-classes requires comma-separated integers from 1 to 45");
  const tokens = raw.split(",").map((item) => item.trim());
  const classes = tokens.map(Number);
  if (tokens.some((item) => !item) || classes.some((item) => !Number.isInteger(item) || item < 1 || item > 45)) {
    throw new Error("--nice-classes requires comma-separated integers from 1 to 45");
  }
  return [...new Set(classes)];
}

function numberFlag(args: ParsedArgs, name: string): number | undefined {
  const value = stringFlag(args, name);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${name} requires a number`);
  return number;
}

function parseDuration(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) throw new Error("--cache-ttl requires duration like 30m, 12h, or 2d");
  const amount = Number(match[1]);
  const multiplier = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] ?? "ms"]!;
  return amount * multiplier;
}

function outputMode(args: ParsedArgs): OutputMode {
  if (args.flags.has("--compact-json")) return "compact-json";
  if (args.flags.has("--json")) return "json";
  if (args.flags.has("--markdown")) return "markdown";
  return "human";
}

function statusMarker(status: string): string {
  if (["registered", "collision", "likely_taken", "invalid", "error"].includes(status)) return "[!]";
  if (["available", "no_exact_collision"].includes(status)) return "[confirmed]";
  if (["likely_available"].includes(status)) return "[likely]";
  return "[?]";
}

function renderProviders(results: ProviderResult[]): string {
  return results.map((item) => `${statusMarker(item.status)} ${item.provider.padEnd(10)} ${item.summary}`).join("\n");
}

function renderReport(result: CompletedResult): string {
  const dimensions = Object.entries(result.dimensions)
    .map(([name, dimension]) => `  ${name.padEnd(10)} ${String(dimension.score).padStart(3)}/100  ${dimension.status}`)
    .join("\n");
  const unknown = result.unknownChecks.length ? `\nUnknown: ${result.unknownChecks.join(", ")}` : "";
  return `${result.name}: ${result.score}/100 — ${result.verdict}\n${dimensions}${unknown}\n\n${result.explanation}\n\nWarnings:\n${result.warnings.map((warning) => `- ${warning}`).join("\n")}`;
}

function renderMarkdown(results: CompletedResult[]): string {
  const rows = results.map((result, index) => `| ${index + 1} | ${result.name} | ${result.score} | ${result.verdict} | ${result.dimensions.packages?.score ?? 0} | ${result.dimensions.github?.score ?? 0} | ${result.dimensions.domains?.score ?? 0} |`);
  const details = results.map((result) => `## ${result.name}\n\n${result.explanation}\n\n### Warnings\n\n${result.warnings.map((warning) => `- ${warning}`).join("\n")}`).join("\n\n");
  return `# Nametagged report\n\n| Rank | Name | Score | Verdict | Packages | GitHub | Domains |\n| ---: | --- | ---: | --- | ---: | ---: | ---: |\n${rows.join("\n")}\n\n${details}\n`;
}

function emit(value: unknown, mode: OutputMode): void {
  if (mode === "compact-json") {
    process.stdout.write(`${JSON.stringify(value)}\n`);
    return;
  }
  if (mode === "json") {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  if (mode === "markdown") {
    const results = Array.isArray(value) ? value as CompletedResult[] : [value as CompletedResult];
    process.stdout.write(renderMarkdown(results));
    return;
  }
  if (Array.isArray(value)) {
    if (!value.length) process.stdout.write("No results.\n");
    else if ("dimensions" in (value[0] as object)) process.stdout.write(`${(value as CompletedResult[]).map((item, index) => `${index + 1}. ${renderReport(item)}`).join("\n\n")}\n`);
    else process.stdout.write(`${renderProviders(value as ProviderResult[])}\n`);
    return;
  }
  process.stdout.write(`${renderReport(value as CompletedResult)}\n`);
}

function help(): string {
  return `Nametagged 0.1 — free local-first project naming intelligence

Usage:
  nametagged find <description> [--count 12] [--styles technical,playful]
  nametagged check <name>
  nametagged rank <name...>
  nametagged domains <name> [--tlds com,io,dev,app]
  nametagged packages <name> [--registries npm,pypi,crates]
  nametagged mcp

Common options:
  --offline                 Prevent all network requests
  --json                    Pretty JSON output
  --compact-json            Single-line JSON output
  --markdown                Markdown report output
  --config <path>           Configuration file (default: namecheck.config.json)
  --timeout <ms>            Per-request timeout
  --no-cache                Do not read or write cache
  --refresh                 Ignore cached results and refresh
  --cache-ttl <duration>    Cache TTL, for example 12h or 2d
  --include-trademark       Add preliminary trademark links and disclaimer

Network checks send only requested names to selected providers. --offline sends nothing.
`;
}

function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} is required`);
  return value;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (["help", "--help", "-h"].includes(args.command) || args.flags.has("--help")) {
    process.stdout.write(help());
    return;
  }
  if (args.command === "mcp") {
    await runMcpServer({ configFile: stringFlag(args, "--config") });
    return;
  }

  const tldsOverride = listFlag(args, "--tlds");
  const registriesOverride = listFlag(args, "--registries") ?? listFlag(args, "--ecosystems");
  const timeoutOverride = numberFlag(args, "--timeout");
  const niceClasses = parseNiceClassesFlag(args);
  const config = await loadConfig(stringFlag(args, "--config") ?? "namecheck.config.json", {
    ...(tldsOverride ? { tlds: tldsOverride } : {}),
    ...(registriesOverride ? { registries: registriesOverride as Array<"npm" | "pypi" | "crates"> } : {}),
    ...(timeoutOverride ? { timeoutMs: timeoutOverride } : {}),
  });
  const cache = new JsonCache({ disabled: args.flags.has("--no-cache") });
  const intelligence = new NamingIntelligence(createDefaultAdapters(), config, cache);
  const mode = outputMode(args);
  const checkOptions: CheckOptions = {
    offline: args.flags.has("--offline"),
    refresh: args.flags.has("--refresh"),
    noCache: args.flags.has("--no-cache"),
    includeTrademark: args.flags.has("--include-trademark"),
    ...(numberFlag(args, "--timeout") ? { timeoutMs: numberFlag(args, "--timeout") } : {}),
    ...(parseDuration(stringFlag(args, "--cache-ttl")) ? { cacheTtlMs: parseDuration(stringFlag(args, "--cache-ttl")) } : {}),
    ...(listFlag(args, "--tlds") ? { tlds: listFlag(args, "--tlds") } : {}),
    ...(listFlag(args, "--registries") ?? listFlag(args, "--ecosystems") ? { ecosystems: listFlag(args, "--registries") ?? listFlag(args, "--ecosystems") } : {}),
    ...(stringFlag(args, "--jurisdiction") ? { jurisdiction: stringFlag(args, "--jurisdiction") } : {}),
    ...(niceClasses ? { niceClasses } : {}),
  };

  switch (args.command) {
    case "find": {
      const description = required(args.positionals.join(" "), "Project description");
      const generateOptions: GenerateOptions = {
        ...(numberFlag(args, "--count") ? { count: numberFlag(args, "--count") } : {}),
        ...(listFlag(args, "--styles") ? { styles: listFlag(args, "--styles") } : {}),
        ...(listFlag(args, "--keywords") ? { keywords: listFlag(args, "--keywords") } : {}),
        ...(listFlag(args, "--exclude") ? { excludedWords: listFlag(args, "--exclude") } : {}),
      };
      emit(await intelligence.find(description, { ...checkOptions, ...generateOptions }), mode);
      break;
    }
    case "check":
      emit(await intelligence.checkName(required(args.positionals[0], "Name"), checkOptions), mode);
      break;
    case "rank":
      if (args.positionals.length < 2) throw new Error("rank requires at least two names");
      emit(await intelligence.rankNames(args.positionals, checkOptions), mode);
      break;
    case "domains":
      emit(await intelligence.checkDomains(required(args.positionals[0], "Name"), checkOptions.tlds ?? config.tlds, checkOptions), mode);
      break;
    case "packages":
      emit(await intelligence.checkPackages(required(args.positionals[0], "Name"), checkOptions.ecosystems ?? config.registries, checkOptions), mode);
      break;
    default:
      throw new Error(`Unknown command: ${args.command}\n\n${help()}`);
  }
}

process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

export function isExecutedDirectly(moduleUrl: string, argvEntry: string | undefined): boolean {
  if (!argvEntry) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argvEntry);
  } catch {
    return false;
  }
}

if (isExecutedDirectly(import.meta.url, process.argv[1])) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(`nametagged: ${message}\n`);
    process.exitCode = 1;
  });
}
