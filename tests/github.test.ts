import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkGithub } from "@nametagged/adapters";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("GitHub collision checks", () => {
  it("keeps the overall result unknown when account lookup fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      return url.includes("/search/repositories")
        ? jsonResponse({ total_count: 0, items: [] }, 200)
        : jsonResponse({ message: "rate limited" }, 403);
    };
    try {
      const result = await checkGithub("UnusedName", { timeoutMs: 100, offline: false });
      assert.equal(result.status, "unknown");
      assert.equal(result.score, 50);
      assert.match(result.summary, /namespace lookup returned HTTP 403/);
      assert.equal(result.evidence[0]?.status, "no_exact_collision");
      assert.equal(result.evidence[1]?.status, "unknown");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not label repository-search evidence as a collision for an account-only match", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      return url.includes("/search/repositories")
        ? jsonResponse({ total_count: 0, items: [] }, 200)
        : jsonResponse({ login: "occupiedname" }, 200);
    };
    try {
      const result = await checkGithub("OccupiedName", { timeoutMs: 100, offline: false });
      assert.equal(result.status, "collision");
      assert.equal(result.evidence[0]?.status, "no_exact_collision");
      assert.equal(result.evidence[1]?.status, "collision");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
