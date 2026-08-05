import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeQuality, explainScore, JsonCache, NamingIntelligence, type AdapterSet } from "@nametagged/core";
import { CompletedResultSchema, ConfigSchema, type ProviderResult } from "@nametagged/schemas";

function provider(provider: string, status: ProviderResult["status"], score: number): ProviderResult {
  return { provider, status, score, summary: `${provider} ${status}`, warnings: [], evidence: [] };
}

const adapters: AdapterSet = {
  domains: async (_name, tlds) => tlds.map(() => provider("rdap", "available", 100)),
  packages: async (_name, registries) => registries.map((registry) => provider(registry, "no_exact_collision", 100)),
  github: async () => provider("github", "no_exact_collision", 90),
  cli: async () => provider("cli", "no_exact_collision", 100),
  trademark: async () => ({
    status: "manual_review_required",
    blocking: false,
    disclaimer: "Preliminary only.",
    officialSearchLinks: ["https://example.com/search"],
    evidence: [],
  }),
};

describe("quality and composite scoring", () => {
  it("publishes every deterministic quality signal", () => {
    const result = analyzeQuality("TaskForge", "local task manager for teams");
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.deepEqual(result.signals.map((signal) => signal.id), [
      "length", "word-count", "pronounceability", "repeated-letters", "punctuation",
      "numbers", "negative-language", "technical-relevance", "visual-ambiguity",
    ]);
  });

  it("returns a versioned evidence-based report", async () => {
    const intelligence = new NamingIntelligence(adapters, ConfigSchema.parse({}), new JsonCache({ disabled: true }));
    const report = await intelligence.checkName("TaskForge", { projectDescription: "local task manager" });
    assert.doesNotThrow(() => CompletedResultSchema.parse(report));
    assert.equal(report.schemaVersion, "nametagged-result/v1");
    assert.equal(report.verdict, "strong candidate");
    assert.match(explainScore(report), /packages:/);
    assert.ok(report.warnings.some((warning) => warning.includes("Trademark")));
  });

  it("accepts relative weights above 100 and explains their normalized shares", async () => {
    const config = ConfigSchema.parse({
      weights: { packages: 200, github: 100, domains: 0, quality: 0, search: 0, cli: 0 },
    });
    const intelligence = new NamingIntelligence(adapters, config, new JsonCache({ disabled: true }));
    const report = await intelligence.checkName("TaskForge");

    assert.doesNotThrow(() => CompletedResultSchema.parse(report));
    assert.equal(report.dimensions.packages?.weight, 200);

    const explanation = explainScore(report);
    assert.match(explanation, /packages: .* at 66\.7% of composite weight/);
    assert.match(explanation, /github: .* at 33\.3% of composite weight/);
    assert.doesNotMatch(explanation, /200%/);
  });

  it("blocks a package collision", async () => {
    const collisionAdapters: AdapterSet = {
      ...adapters,
      packages: async () => [provider("npm", "collision", 0)],
    };
    const report = await new NamingIntelligence(collisionAdapters, ConfigSchema.parse({}), new JsonCache({ disabled: true })).checkName("TakenName");
    assert.equal(report.verdict, "blocked by conflict");
    assert.ok(report.score <= 59);
  });
});
