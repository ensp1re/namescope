import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateNames, nameVariants, normalizeName } from "@nametagged/core";
import fixtures from "./fixtures/collisions.json" with { type: "json" };

describe("deterministic candidate generation", () => {
  it("returns stable, unique candidates without availability claims", () => {
    const options = { count: 8, styles: ["technical", "open-source"] };
    const first = generateNames("a fast open-source database migration tool", options);
    const second = generateNames("a fast open-source database migration tool", options);
    assert.deepEqual(first.candidates, second.candidates);
    assert.equal(first.candidates.length, 8);
    assert.equal(new Set(first.candidates.map((candidate) => normalizeName(candidate.name))).size, 8);
    assert.equal(first.availabilityChecked, false);
    assert.ok(first.candidates.every((candidate) => candidate.rationale.length > 10));
  });

  it("honors exclusions", () => {
    const result = generateNames("open source database migration", { count: 20, excludedWords: ["data"] });
    assert.ok(result.candidates.every((candidate) => !normalizeName(candidate.name).includes("data")));
  });

  it("prioritizes naming intent over generic project modifiers", () => {
    const result = generateNames(
      "a local-first open-source project naming intelligence tool for developers",
      { count: 6, styles: ["technical"] },
    );

    assert.deepEqual(
      result.candidates.map((candidate) => candidate.name),
      ["NameSignal", "NameInsight", "NameRadar", "NameSense", "NameScope", "TagSignal"],
    );
    assert.deepEqual(result.candidates[0]?.sourceWords, ["name", "signal"]);
    assert.match(result.candidates[0]?.rationale ?? "", /“name” from “naming”.*“signal” from “intelligence”/);
    assert.ok(result.candidates.every((candidate) => candidate.style === "technical"));
  });

  it("treats explicit keywords as distinctive concepts", () => {
    const result = generateNames("a local open-source project", {
      count: 3,
      keywords: ["quartz"],
      styles: ["minimal"],
    });

    assert.deepEqual(result.candidates.map((candidate) => candidate.name), ["QuartzLocal", "QuartzNative", "QuartzHome"]);
    assert.ok(result.candidates.every((candidate) => candidate.sourceWords.includes("quartz")));
  });
});

describe("normalization benchmark", () => {
  for (const fixture of fixtures) {
    it(`normalizes ${fixture.input}`, () => {
      assert.equal(normalizeName(fixture.input), fixture.normalized);
      assert.deepEqual(nameVariants(fixture.input).sort(), [...fixture.variants].sort());
    });
  }
});
