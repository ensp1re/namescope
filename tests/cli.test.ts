import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArgs } from "../packages/cli/src/index.ts";

describe("CLI parser", () => {
  it("parses commands, values, inline values, and booleans", () => {
    const parsed = parseArgs(["domains", "TaskForge", "--tlds=com,dev", "--offline", "--timeout", "4000"]);
    assert.equal(parsed.command, "domains");
    assert.deepEqual(parsed.positionals, ["TaskForge"]);
    assert.equal(parsed.flags.get("--tlds"), "com,dev");
    assert.equal(parsed.flags.get("--offline"), true);
    assert.equal(parsed.flags.get("--timeout"), "4000");
  });
});
