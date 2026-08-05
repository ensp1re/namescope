import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkPackages } from "@nametagged/adapters";
import { JsonCache, NamingIntelligence, type AdapterSet } from "@nametagged/core";
import { ConfigSchema, type ProviderResult } from "@nametagged/schemas";

function provider(providerName: string, status: ProviderResult["status"], score: number): ProviderResult {
  return { provider: providerName, status, score, summary: `${providerName} ${status}`, warnings: [], evidence: [] };
}

describe("npm package-name validation", () => {
  it("rejects invalid npm names before making a registry request", async () => {
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async () => {
      requests += 1;
      throw new Error("invalid names must not reach the registry");
    };
    try {
      const [result] = await checkPackages("node_modules", ["npm"], { timeoutMs: 100, offline: false });
      assert.equal(requests, 0);
      assert.equal(result?.status, "invalid");
      assert.equal(result?.score, 0);
      assert.match(result?.summary ?? "", /not valid for a new npm package/);
      assert.ok(result?.evidence.some((item) => item.status === "invalid"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("records structural validity before checking npm collision variants", async () => {
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async () => {
      requests += 1;
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    };
    try {
      const [result] = await checkPackages("TaskForge", ["npm"], { timeoutMs: 100, offline: false });
      assert.equal(requests, 3);
      assert.equal(result?.status, "no_exact_collision");
      assert.match(result?.evidence[0]?.detail ?? "", /structurally valid/);
      assert.deepEqual(result?.evidence.slice(1).map((item) => item.query), ["taskforge", "task-forge", "task_forge"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("blocks an otherwise strong result when the npm package name is invalid", async () => {
    const invalid = await checkPackages("node_modules", ["npm"], { timeoutMs: 100, offline: false });
    const adapters: AdapterSet = {
      domains: async (_name, tlds) => tlds.map(() => provider("rdap", "available", 100)),
      packages: async () => invalid,
      github: async () => provider("github", "no_exact_collision", 100),
      cli: async () => provider("cli", "no_exact_collision", 100),
      trademark: async () => ({
        status: "manual_review_required",
        blocking: false,
        disclaimer: "Preliminary only.",
        officialSearchLinks: ["https://example.com/search"],
        evidence: [],
      }),
    };
    const report = await new NamingIntelligence(adapters, ConfigSchema.parse({}), new JsonCache({ disabled: true })).checkName("node_modules");
    assert.equal(report.verdict, "invalid npm package name");
    assert.ok(report.score <= 59);
  });
});
