import { describe, expect, it, vi } from "vitest";
import { recoverChatStream } from "./chatRun.js";

describe("chat transport recovery", () => {
  it("reattaches after a truncated stream without resending a message", async () => {
    const client = {
      getSession: vi.fn(async () => ({ history: [], active_runs: [{ run_id: "other", llm_checkpoint_id: "cp-other" }, { run_id: "r1", llm_checkpoint_id: "cp1" }] })),
      resumeChatRun: vi.fn(async function* () {
        yield { type: "run_snapshot", data: { content: { type: "bot", message: [{ type: "plain", text: "Hello again" }] } } };
        yield { type: "end" };
      }),
    };
    async function* interrupted() { yield { type: "user_message_saved", data: { llm_checkpoint_id: "cp1" } }; yield { type: "plain", data: "Hello" }; throw new Error("socket closed"); }
    const events = [];
    for await (const event of recoverChatStream(client, "s1", interrupted(), new AbortController().signal)) events.push(event);
    expect(events.map((event) => event.type)).toEqual(["user_message_saved", "plain", "run_snapshot", "end"]);
    expect(client.getSession).toHaveBeenCalledOnce();
    expect(client.resumeChatRun).toHaveBeenCalledWith("r1", expect.anything());
  });

  it("bounds recovery attempts if the server repeatedly disconnects", async () => {
    const client = {
      getSession: vi.fn(async () => ({ history: [], active_runs: [{ run_id: "r1" }] })),
      resumeChatRun: vi.fn(async function* (): AsyncGenerator<Record<string, unknown>> { throw new Error("socket closed"); }),
    };
    async function* empty(): AsyncGenerator<Record<string, unknown>> {}
    await expect(async () => { for await (const _event of recoverChatStream(client, "s1", empty(), new AbortController().signal, { runId: "r1" })) {} }).rejects.toThrow("socket closed");
    expect(client.resumeChatRun).toHaveBeenCalledTimes(2);
  });

  it("does not reconnect after an explicit end or cancellation", async () => {
    const client = { getSession: vi.fn(), resumeChatRun: vi.fn() };
    async function* end() { yield { type: "end" }; }
    for await (const _event of recoverChatStream(client, "s1", end(), new AbortController().signal)) {}
    const abort = new AbortController();
    abort.abort();
    for await (const _event of recoverChatStream(client, "s1", end(), abort.signal)) {}
    expect(client.getSession).not.toHaveBeenCalled();
  });

  it("does not attach to another client's run when generation identity is unknown", async () => {
    const client = { getSession: vi.fn(async () => ({ history: [], active_runs: [{ run_id: "other" }] })), resumeChatRun: vi.fn() };
    async function* interrupted(): AsyncGenerator<Record<string, unknown>> { throw new Error("socket closed"); }
    await expect(async () => { for await (const _event of recoverChatStream(client, "s1", interrupted(), new AbortController().signal)) {} }).rejects.toThrow("socket closed");
    expect(client.resumeChatRun).not.toHaveBeenCalled();
  });
});
