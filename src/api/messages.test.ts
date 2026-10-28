import { describe, expect, it } from "vitest";
import { applyChatEvent, normalizeChatRecord, textFromParts } from "./messages.js";
import type { ChatRecord } from "./types.js";

const bot = (): ChatRecord => ({ local_id: "draft", content: { type: "bot", message: [], isLoading: true } });

describe("Dashboard chat event compatibility", () => {
  it("merges tool calls and results without leaking JSON into the reply", () => {
    const original = bot();
    const call = applyChatEvent(original, { type: "plain", chain_type: "tool_call", data: JSON.stringify({ id: "t1", name: "search", args: { q: "test" } }) });
    const result = applyChatEvent(call, { type: "plain", chain_type: "tool_call_result", data: JSON.stringify({ id: "t1", result: "Found a result", ts: 3 }) });
    expect(original.content.message).toEqual([]);
    expect(call.content.message[0].tool_calls?.[0].result).toBeUndefined();
    expect(result.content.message).toHaveLength(1);
    expect(textFromParts(result.content.message)).toContain("[tool] search");
    expect(textFromParts(result.content.message)).toContain("Found a result");
    expect(textFromParts(result.content.message)).not.toContain('"id":"t1"');
  });

  it("retains reasoning and fills a complete event's missing tail exactly once", () => {
    let record = applyChatEvent(bot(), { type: "plain", chain_type: "reasoning", data: "Plan" });
    record = applyChatEvent(record, { type: "plain", data: "Hello" });
    record = applyChatEvent(record, { type: "complete", data: "Hello world" });
    record = applyChatEvent(record, { type: "complete", data: "Hello world" });
    expect(record.content.reasoning).toBe("Plan");
    expect(record.content.message.filter((part) => part.type === "plain")).toEqual([{ type: "plain", text: "Hello world" }]);
    expect(record.content.isLoading).toBe(false);
  });

  it("replaces resumed snapshots and preserves references when a saved event omits them", () => {
    let record = applyChatEvent(bot(), { type: "run_snapshot", data: { status: "running", llm_checkpoint_id: "cp1", content: { type: "bot", message: [{ type: "reasoning", text: "Thinking" }, { type: "plain", text: "Partial" }], refs: { url: "https://example.com" } } } });
    record = applyChatEvent(record, { type: "message_saved", data: { id: 9 } });
    expect(record.local_id).toBe("draft");
    expect(record.id).toBe(9);
    expect(record.llm_checkpoint_id).toBe("cp1");
    expect(record.content.refs).toEqual({ url: "https://example.com" });
    expect(record.content.message[0]).toMatchObject({ type: "think", think: "Thinking" });
  });

  it("handles legacy string history and named attachment events", () => {
    expect(normalizeChatRecord({ content: { type: "bot", message: "Legacy" as any, reasoning: "Reason" } }).content.message).toEqual([{ type: "think", think: "Reason" }, { type: "plain", text: "Legacy" }]);
    const record = applyChatEvent(bot(), { type: "file", data: "[FILE]stored.bin|Report.pdf" });
    expect(textFromParts(record.content.message)).toBe("[file] Report.pdf");
  });

  it("ignores malformed tool payloads and heartbeat-style metadata", () => {
    const record = bot();
    expect(applyChatEvent(record, { type: "plain", chain_type: "tool_call", data: "invalid" })).toBe(record);
    expect(applyChatEvent(record, { type: "run_started", data: { run_id: "r1" } })).toBe(record);
  });
});
