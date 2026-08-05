import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isExecutedDirectly, parseArgs, parseNiceClassesFlag } from "../packages/cli/src/index.ts";

describe("CLI parser", () => {
  it("parses commands, values, inline values, and booleans", () => {
    const parsed = parseArgs(["domains", "TaskForge", "--tlds=com,dev", "--offline", "--timeout", "4000"]);
    assert.equal(parsed.command, "domains");
    assert.deepEqual(parsed.positionals, ["TaskForge"]);
    assert.equal(parsed.flags.get("--tlds"), "com,dev");
    assert.equal(parsed.flags.get("--offline"), true);
    assert.equal(parsed.flags.get("--timeout"), "4000");
  });

  it("accepts only integer Nice classes from 1 through 45", () => {
    assert.deepEqual(parseNiceClassesFlag(parseArgs(["check", "TaskForge", "--nice-classes", "1,9,45,9"])), [1, 9, 45]);
    for (const value of ["word", "1.5", "0", "46", "1,,2"]) {
      assert.throws(
        () => parseNiceClassesFlag(parseArgs(["check", "TaskForge", "--nice-classes", value])),
        /comma-separated integers from 1 to 45/,
      );
    }
    assert.throws(
      () => parseNiceClassesFlag(parseArgs(["check", "TaskForge", "--nice-classes"])),
      /comma-separated integers from 1 to 45/,
    );
  });

  it("recognizes direct execution and rejects missing entries", () => {
    const cliSource = fileURLToPath(new URL("../packages/cli/src/index.ts", import.meta.url));
    assert.equal(isExecutedDirectly(pathToFileURL(cliSource).href, cliSource), true);
    assert.equal(isExecutedDirectly(pathToFileURL(cliSource).href, undefined), false);
    assert.equal(isExecutedDirectly(pathToFileURL(cliSource).href, join(tmpdir(), "namescope-missing")), false);
  });

  it("recognizes direct execution through a package-manager symlink", { skip: process.platform === "win32" }, () => {
    const cliSource = fileURLToPath(new URL("../packages/cli/src/index.ts", import.meta.url));
    const directory = mkdtempSync(join(tmpdir(), "namescope-cli-"));
    const symlink = join(directory, "namescope");

    try {
      symlinkSync(cliSource, symlink);
      assert.equal(isExecutedDirectly(pathToFileURL(cliSource).href, symlink), true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
