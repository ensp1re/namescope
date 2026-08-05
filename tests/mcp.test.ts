import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryTransport, LATEST_PROTOCOL_VERSION, type JSONRPCMessage } from "@modelcontextprotocol/server";
import { createNameScopeMcpServer, MCP_TOOL_NAMES } from "@namescope/mcp";

describe("MCP server", () => {
  it("lists required tools through MCP transport without network access", async () => {
    assert.deepEqual(MCP_TOOL_NAMES, [
      "generate_names", "check_name", "rank_names", "check_domains", "check_packages",
      "check_github", "check_trademark", "explain_score",
    ]);
    const server = await createNameScopeMcpServer({ configFile: "tests/fixtures/nonexistent.json" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await clientTransport.start();

    const request = async (id: number, method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => new Promise((resolvePromise, reject) => {
      clientTransport.onmessage = (message: JSONRPCMessage) => {
        if (!("id" in message) || message.id !== id) return;
        if ("error" in message) reject(new Error(JSON.stringify(message.error)));
        else if ("result" in message) resolvePromise(message.result as Record<string, unknown>);
      };
      clientTransport.send({ jsonrpc: "2.0", id, method, params }).catch(reject);
    });

    await request(1, "initialize", {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "namescope-test", version: "1.0.0" },
    });
    await clientTransport.send({ jsonrpc: "2.0", method: "notifications/initialized" });
    const listed = await request(2, "tools/list", {});
    const tools = listed.tools as Array<{ name: string }>;
    assert.deepEqual(tools.map((tool) => tool.name), [...MCP_TOOL_NAMES]);
    const called = await request(3, "tools/call", {
      name: "generate_names",
      arguments: { projectDescription: "local TypeScript job queue", count: 3 },
    });
    const structured = called.structuredContent as { candidates: unknown[]; availabilityChecked: boolean };
    assert.equal(structured.candidates.length, 3);
    assert.equal(structured.availabilityChecked, false);

    await clientTransport.close();
    await server.close();
  });
});
