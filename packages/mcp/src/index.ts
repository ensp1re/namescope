import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { createDefaultAdapters } from "@namescope/adapters";
import { CompletedResultSchema } from "@namescope/schemas";
import { JsonCache, NamingIntelligence, explainScore, loadConfig } from "@namescope/core";

export interface McpServerOptions {
  configFile?: string | undefined;
}

export const MCP_TOOL_NAMES = [
  "generate_names",
  "check_name",
  "rank_names",
  "check_domains",
  "check_packages",
  "check_github",
  "check_trademark",
  "explain_score",
] as const;

function response(value: unknown): { content: Array<{ type: "text"; text: string }>; structuredContent: Record<string, unknown> } {
  const structuredContent = Array.isArray(value) ? { results: value } : value as Record<string, unknown>;
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent,
  };
}

export async function createNameScopeMcpServer(options: McpServerOptions = {}): Promise<McpServer> {
  const config = await loadConfig(options.configFile ?? "namecheck.config.json");
  const intelligence = new NamingIntelligence(createDefaultAdapters(), config, new JsonCache());
  const server = new McpServer({ name: "namescope", version: "0.1.0" });
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

  server.registerTool("generate_names", {
    title: "Generate project names",
    description: "Generate deterministic software-project name candidates locally. This tool makes no availability claims.",
    inputSchema: z.object({
      projectDescription: z.string().min(1),
      count: z.number().int().min(1).max(100).default(12),
      styles: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
      excludedWords: z.array(z.string()).optional(),
    }),
    annotations: { ...readOnly, openWorldHint: false },
  }, async (input) => response(intelligence.generate(input.projectDescription, input)));

  server.registerTool("check_name", {
    title: "Check project name",
    description: "Check one software-project name against selected public sources and deterministic quality rules.",
    inputSchema: z.object({
      name: z.string().min(1),
      projectDescription: z.string().optional(),
      ecosystems: z.array(z.enum(["npm", "pypi", "crates"])).optional(),
      tlds: z.array(z.string()).optional(),
      includeSocial: z.boolean().default(false),
      includeTrademark: z.boolean().default(false),
      offline: z.boolean().default(false),
    }),
    annotations: readOnly,
  }, async ({ name, ...input }) => response(await intelligence.checkName(name, input)));

  server.registerTool("rank_names", {
    title: "Rank project names",
    description: "Check and rank candidate names with evidence, per-dimension scores, unknowns, and blocking conflicts.",
    inputSchema: z.object({
      names: z.array(z.string().min(1)).min(2).max(50),
      projectDescription: z.string().optional(),
      scoringWeights: z.object({
        packages: z.number().min(0).optional(),
        github: z.number().min(0).optional(),
        domains: z.number().min(0).optional(),
        quality: z.number().min(0).optional(),
        search: z.number().min(0).optional(),
        cli: z.number().min(0).optional(),
      }).optional(),
      ecosystems: z.array(z.enum(["npm", "pypi", "crates"])).optional(),
      tlds: z.array(z.string()).optional(),
      offline: z.boolean().default(false),
    }),
    annotations: readOnly,
  }, async ({ names, ...input }) => response(await intelligence.rankNames(names, input)));

  server.registerTool("check_domains", {
    title: "Check domains",
    description: "Check domains through public RDAP. Timeouts and blocked requests remain unknown, never available.",
    inputSchema: z.object({
      name: z.string().min(1),
      tlds: z.array(z.string()).default(config.tlds),
      offline: z.boolean().default(false),
    }),
    annotations: readOnly,
  }, async ({ name, tlds, offline }) => response(await intelligence.checkDomains(name, tlds, { offline })));

  server.registerTool("check_packages", {
    title: "Check package registries",
    description: "Validate npm publishability, then check exact, normalized, hyphen, and underscore collisions on npm, PyPI, and crates.io.",
    inputSchema: z.object({
      name: z.string().min(1),
      registries: z.array(z.enum(["npm", "pypi", "crates"])).default(config.registries),
      offline: z.boolean().default(false),
    }),
    annotations: readOnly,
  }, async ({ name, registries, offline }) => response(await intelligence.checkPackages(name, registries, { offline })));

  server.registerTool("check_github", {
    title: "Check GitHub collisions",
    description: "Check repository-name search results and exact user or organization namespace collisions through GitHub public API.",
    inputSchema: z.object({
      name: z.string().min(1),
      offline: z.boolean().default(false),
    }),
    annotations: readOnly,
  }, async ({ name, offline }) => response(await intelligence.checkGithub(name, { offline })));

  server.registerTool("check_trademark", {
    title: "Screen trademark",
    description: "Return preliminary trademark screening limitations and official manual-search links. Never claims legal clearance.",
    inputSchema: z.object({
      name: z.string().min(1),
      jurisdiction: z.string().default("US"),
      niceClasses: z.array(z.number().int().min(1).max(45)).default([]),
    }),
    annotations: readOnly,
  }, async ({ name, jurisdiction, niceClasses }) => response(await intelligence.checkTrademark(name, jurisdiction, niceClasses)));

  server.registerTool("explain_score", {
    title: "Explain score",
    description: "Explain every score dimension and warning from a completed NameScope result.",
    inputSchema: z.object({ completedResult: CompletedResultSchema }),
    annotations: { ...readOnly, openWorldHint: false },
  }, async ({ completedResult }) => response({ explanation: explainScore(completedResult) }));

  return server;
}

export async function runMcpServer(options: McpServerOptions = {}): Promise<void> {
  const server = await createNameScopeMcpServer(options);
  await server.connect(new StdioServerTransport());
}
