import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkDomains } from "@nametagged/adapters";
import { JsonCache, NamingIntelligence, type AdapterSet } from "@nametagged/core";
import { ConfigSchema } from "@nametagged/schemas";

describe("offline mode", () => {
  it("never calls remote adapters", async () => {
    let remoteCalls = 0;
    const adapters: AdapterSet = {
      domains: async () => { remoteCalls += 1; return []; },
      packages: async () => { remoteCalls += 1; return []; },
      github: async () => { remoteCalls += 1; throw new Error("network must not run"); },
      cli: async (name) => ({ provider: "cli", status: "no_exact_collision", score: 100, summary: `${name} local`, warnings: [], evidence: [] }),
      trademark: async () => ({ status: "manual_review_required", blocking: false, disclaimer: "Preliminary only.", officialSearchLinks: ["https://example.com"], evidence: [] }),
    };
    const intelligence = new NamingIntelligence(adapters, ConfigSchema.parse({}));
    const report = await intelligence.checkName("PrivateProject", { offline: true });
    assert.equal(remoteCalls, 0);
    assert.ok(report.providers.filter((item) => item.provider !== "cli").every((item) => item.status === "unknown"));
    assert.ok(report.unknownChecks.includes("github"));
  });

  it("never maps a provider failure to available", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "temporary" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
    try {
      const [result] = await checkDomains("PrivateProject", ["com"], { timeoutMs: 100, offline: false });
      assert.notEqual(result?.status, "available");
      assert.ok(["unknown", "error"].includes(result?.status ?? ""));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("JSON cache", () => {
  it("serializes concurrent atomic writes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nametagged-cache-"));
    try {
      const cache = new JsonCache({ path: join(directory, "cache.json") });
      await Promise.all([
        cache.set("npm", "alpha", { status: "one" }, 60_000),
        cache.set("github", "beta", { status: "two" }, 60_000),
      ]);
      assert.deepEqual(await cache.get("npm", "alpha"), { status: "one" });
      assert.deepEqual(await cache.get("github", "beta"), { status: "two" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
