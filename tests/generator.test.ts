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
});

describe("normalization benchmark", () => {
  for (const fixture of fixtures) {
    it(`normalizes ${fixture.input}`, () => {
      assert.equal(normalizeName(fixture.input), fixture.normalized);
      assert.deepEqual(nameVariants(fixture.input).sort(), [...fixture.variants].sort());
    });
  }
});
