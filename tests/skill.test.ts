import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { CompletedResultSchema, ConfigSchema, completedResultJsonSchema } from "../packages/schemas/src/index.ts";
import { MCP_TOOL_NAMES } from "../packages/mcp/src/index.ts";

const skill = new URL("../skills/namescope/", import.meta.url);
const read = (path: string, base = skill) => readFile(new URL(path, base), "utf8");

describe("agent skill", () => {
  it("names the published CLI version and every MCP tool", async () => {
    const text = await read("SKILL.md");
    const { version } = JSON.parse(await read("../../packages/cli/package.json")) as { version: string };
    assert.match(text, /^---\r?\nname: namescope\r?\n/);
    assert.match(text, new RegExp(`npx namescope@${version.replaceAll(".", "\\.")} check`));
    for (const tool of MCP_TOOL_NAMES) assert.match(text, new RegExp(`\`${tool}\``));
  });

  it("ships the current result schema", async () => {
    assert.deepEqual(JSON.parse(await read("references/result.schema.json")), JSON.parse(JSON.stringify(completedResultJsonSchema)));
  });

  it("ships examples that parse with the current schemas", async () => {
    CompletedResultSchema.parse(JSON.parse(await read("examples/check-offline.json")));
    const config = await read("examples/namecheck.config.json");
    ConfigSchema.parse(JSON.parse(config));
    assert.equal(config, await read("../../namecheck.config.example.json"));
  });
});
