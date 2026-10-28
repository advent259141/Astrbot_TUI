import React from "react";
import { PassThrough, Writable } from "node:stream";
import { stripVTControlCharacters } from "node:util";
import { render } from "ink";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardClient } from "../api/client.js";
import { App } from "./App.js";

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });

function mockClient() {
  return {
    getSessions: vi.fn(async () => [{ session_id: "s1", platform_id: "webchat", display_name: "First chat" }, { session_id: "s2", platform_id: "webchat", display_name: "Second chat" }]),
    getSession: vi.fn(async (_id: string, _options?: unknown): Promise<any> => ({ history: [], active_runs: [] })),
    getStats: vi.fn(async () => ({})),
    getProviderTokenStats: vi.fn(async () => null),
    getVersion: vi.fn(async () => ({ version: "4.29.3" })),
    getCommands: vi.fn(async () => ({ items: [], summary: { total: 0, disabled: 0, conflicts: 0 } })),
    getTools: vi.fn(async () => []),
    getPlugins: vi.fn(async () => []),
    getPersonaFolders: vi.fn(async () => []),
    getPersonas: vi.fn(async () => []),
    getPersonaFolderTree: vi.fn(async () => []),
    getAbconfs: vi.fn(async () => []),
    getAbconf: vi.fn(async () => ({ config: {}, metadata: {} })),
    getProviderTemplate: vi.fn(async () => ({ providers: [], provider_sources: [] })),
    getAstrBotConfig: vi.fn(async () => ({ config: {}, metadata: {} })),
    getPlatforms: vi.fn(async () => ({ platforms: [] })),
    getPlatformStats: vi.fn(async () => ({ platforms: [] })),
    liveLogs: vi.fn(async function* ({ signal }: { signal: AbortSignal }) { await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true })); }),
    resumeChatRun: vi.fn(async function* (_id: string, { signal }: { signal: AbortSignal }) {
      yield { type: "run_snapshot", data: { status: "running", content: { type: "bot", message: [{ type: "plain", text: "Recovered running response" }] } } };
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
    }),
    renameSession: vi.fn(async () => {}),
    deleteSession: vi.fn(async () => {}),
    stopSession: vi.fn(async () => ({})),
    sendMessage: vi.fn(async function* (_id: string, _text: string, _options?: unknown): AsyncGenerator<Record<string, unknown>> { yield { type: "end" }; }),
    request: vi.fn(async (path: string, _init?: RequestInit): Promise<any> => {
      if (path === "/api/cron/jobs") return [{ job_id: "job1", name: "Task A", enabled: true, job_type: "active_agent", cron_expression: "0 9 * * *" }];
      if (path === "/api/skills") return { skills: [{ name: "test-skill", active: true }] };
      return {};
    }),
  };
}

function mount(client: ReturnType<typeof mockClient>) {
  let frame = "";
  const stdout = Object.assign(new Writable({ write(chunk, _encoding, done) { frame = stripVTControlCharacters(String(chunk)); done(); } }), { columns: 100, rows: 32, isTTY: true });
  const stdin = Object.assign(new PassThrough(), { isTTY: true, setRawMode() {}, ref() {}, unref() {} });
  const instance = render(React.createElement(App, { client: client as unknown as DashboardClient, serverUrl: "http://localhost:6185", tokenStoreKind: "test", locale: "en-US" }), { stdout: stdout as unknown as NodeJS.WriteStream, stdin: stdin as unknown as NodeJS.ReadStream, stderr: stdout as unknown as NodeJS.WriteStream, debug: true, patchConsole: false, exitOnCtrlC: false });
  cleanups.push(() => { instance.unmount(); instance.cleanup(); stdin.destroy(); stdout.destroy(); });
  return { frame: () => frame, type: async (input: string) => {
    // Let React commit useInput subscriptions before delivering the next keystroke.
    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write(input);
  } };
}

describe("workbench integration", () => {
  it("loads other sections even when one startup request fails", async () => {
    const client = mockClient();
    client.getStats.mockRejectedValue(new Error("stats unavailable"));
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("First chat"));
    expect(client.getProviderTemplate).toHaveBeenCalled();
    expect(client.getPlatforms).toHaveBeenCalled();
    expect(app.frame()).toContain("stats unavailable");
  });

  it("ignores an older chat's history response after selecting another chat", async () => {
    const client = mockClient();
    let finishOld!: (value: unknown) => void;
    client.getSession.mockImplementation(async (id) => id === "s1" ? new Promise((resolve) => { finishOld = resolve; }) : ({ history: [{ content: { type: "bot", message: [{ type: "plain", text: "Current chat history" }] } }] }));
    const app = mount(client);
    await vi.waitFor(() => expect(finishOld).toBeTypeOf("function"));
    await app.type("\u001b[B");
    await vi.waitFor(() => expect(app.frame()).toContain("Current chat history"));
    finishOld({ history: [{ content: { type: "bot", message: [{ type: "plain", text: "STALE HISTORY" }] } }] });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(app.frame()).toContain("Current chat history");
    expect(app.frame()).not.toContain("STALE HISTORY");
  });

  it("resumes server-side runs and detaches when changing chats", async () => {
    const client = mockClient();
    client.getSession.mockImplementation(async (id) => ({ history: [], active_runs: id === "s1" ? [{ run_id: "r1" }] : [] }));
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("Recovered running response"));
    const options = client.resumeChatRun.mock.calls[0][1];
    expect(options.signal.aborted).toBe(false);
    await app.type("\u001b[B");
    await vi.waitFor(() => expect(options.signal.aborted).toBe(true));
    expect(client.stopSession).not.toHaveBeenCalled();
    expect(app.frame()).not.toContain("Recovered running response");
  });

  it("renames chats and requires confirmation before deleting history", async () => {
    const client = mockClient();
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("First chat"));
    await app.type("/rename Project chat");
    await vi.waitFor(() => expect(app.frame()).toContain("> /rename Project chat"));
    await app.type("\r");
    await vi.waitFor(() => expect(client.renameSession).toHaveBeenCalledWith("s1", "Project chat"));
    await app.type("/delete");
    await vi.waitFor(() => expect(app.frame()).toContain("> /delete"));
    await app.type("\r");
    await vi.waitFor(() => expect(app.frame()).toContain("/delete confirm"));
    expect(client.deleteSession).not.toHaveBeenCalled();
    await app.type("/delete confirm");
    await vi.waitFor(() => expect(app.frame()).toContain("> /delete confirm"));
    await app.type("\r");
    await vi.waitFor(() => expect(client.deleteSession).toHaveBeenCalledWith("s1"));
  });

  it("loads earlier history through the upstream pagination API", async () => {
    const client = mockClient();
    const latest = { id: 2, content: { type: "bot", message: [{ type: "plain", text: "Latest history" }] } };
    const earlier = { id: 1, content: { type: "bot", message: [{ type: "plain", text: "Earlier history" }] } };
    client.getSession.mockImplementation(async (_id, options: any) => ({ page: options?.page || 1, has_more: !options?.page, history: options?.page === 2 ? [earlier, latest] : [latest] }));
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("Latest history"));
    await app.type("/older");
    await vi.waitFor(() => expect(app.frame()).toContain("> /older"));
    await app.type("\r");
    await vi.waitFor(() => expect(client.getSession).toHaveBeenCalledWith("s1", { page: 2 }));
    await vi.waitFor(() => expect(app.frame()).toContain("Earlier history"));
    expect(app.frame().match(/Latest history/g)).toHaveLength(1);
  });

  it("keeps a newer session selection when a pending list refresh returns", async () => {
    const client = mockClient();
    const sessions = await client.getSessions();
    let finishList!: (value: typeof sessions) => void;
    client.getSessions.mockResolvedValueOnce(sessions).mockImplementationOnce(async () => new Promise((resolve) => { finishList = resolve; })).mockResolvedValue(sessions);
    client.getSession.mockImplementation(async (id) => ({ history: [{ content: { type: "bot", message: [{ type: "plain", text: id === "s2" ? "Selected second history" : "First history" }] } }] }));
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("First history"));
    await app.type("/rename New name");
    await app.type("\r");
    await vi.waitFor(() => expect(finishList).toBeTypeOf("function"));
    await app.type("\u001b[B");
    await vi.waitFor(() => expect(app.frame()).toContain("Selected second history"));
    finishList(sessions);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(app.frame()).toContain("Selected second history");
  });

  it("keeps stream failures visible and lets bot commands bypass local actions", async () => {
    const client = mockClient();
    client.sendMessage.mockImplementation(async function* () { yield { type: "error", data: "Provider offline" }; yield { type: "end" }; });
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("First chat"));
    await app.type("//help");
    await vi.waitFor(() => expect(app.frame()).toContain("> //help"));
    await app.type("\r");
    await vi.waitFor(() => expect(client.sendMessage).toHaveBeenCalledWith("s1", "/help", expect.anything()));
    await vi.waitFor(() => expect(app.frame()).toContain("Provider offline"));
    expect(app.frame()).not.toContain("Response complete.");
    expect(app.frame()).toContain("/help");
  });

  it("routes management keys locally and confirms destructive actions", async () => {
    const client = mockClient();
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("First chat"));
    await app.type("\u001b[Z");
    await vi.waitFor(() => expect(app.frame()).toContain("Task A"));
    await app.type("d");
    await vi.waitFor(() => expect(app.frame()).toContain("Confirm deletion"));
    expect(client.request.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
    await app.type("y");
    await vi.waitFor(() => expect(client.request).toHaveBeenCalledWith("/api/cron/jobs/job1", { method: "DELETE" }));
    await app.type("\u001b[C");
    await vi.waitFor(() => expect(app.frame()).toContain("test-skill"));
    await app.type("t");
    await vi.waitFor(() => expect(client.request).toHaveBeenCalledWith("/api/skills/update", expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "test-skill", active: false }) })));
  });

  it("shows typed management form values before submitting", async () => {
    const client = mockClient();
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("First chat"));
    await app.type("\u001b[Z");
    await vi.waitFor(() => expect(app.frame()).toContain("Task A"));
    await app.type("a");
    await vi.waitFor(() => expect(app.frame()).toContain("Task name"));
    await app.type("Visible task name");
    await vi.waitFor(() => expect(app.frame()).toContain("Visible task name"));
    await app.type("\u001b");
    await vi.waitFor(() => expect(app.frame()).toContain("Cancelled"));
  });

  it("keeps subagent drafts across main tabs and preserves inline definitions", async () => {
    const client = mockClient();
    const config = { main_enable: false, remove_main_duplicate_tools: false, router_system_prompt: "Keep routing prompt", agents: [{ name: "Mixed-Case", persona_id: null, system_prompt: "Inline instructions", tools: ["search"], enabled: true, public_description: "Router", future_field: { keep: true } }] };
    client.request.mockImplementation(async (path) => path === "/api/subagent/config" ? config : []);
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("First chat"));
    await app.type("\u001b[Z");
    await vi.waitFor(() => expect(client.request).toHaveBeenCalledWith("/api/cron/jobs", {}));
    await app.type("\u001b[C");
    await app.type("\u001b[C");
    await vi.waitFor(() => expect(app.frame()).toContain("Mixed-Case"));
    await app.type(" ");
    await vi.waitFor(() => expect(app.frame()).toContain(" · *"));
    await app.type("\t");
    await vi.waitFor(() => expect(app.frame()).toContain("First chat"));
    await app.type("\u001b[Z");
    await vi.waitFor(() => expect(app.frame()).toContain("Mixed-Case"));
    expect(app.frame()).toContain(" · *");
    await app.type("s");
    await vi.waitFor(() => expect(client.request).toHaveBeenCalledWith("/api/subagent/config", expect.objectContaining({ method: "POST", body: JSON.stringify({ ...config, main_enable: true, agents: [{ ...config.agents[0], provider_id: null }] }) })));
  });

  it("searches and paginates session rules without writing a rule", async () => {
    const client = mockClient();
    client.request.mockImplementation(async (path) => path === "/api/session/list-rule" ? { rules: [{ umo: "webchat:FriendMessage:s1", rules: { kb_config: ["Notes"] } }], total: 101, page: 1, page_size: 100, available_rule_keys: ["kb_config"] } : []);
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("First chat"));
    await app.type("\u001b[Z");
    await app.type("\u001b[C");
    await app.type("\u001b[C");
    await app.type("\u001b[C");
    await vi.waitFor(() => expect(app.frame()).toContain("kb_config"));
    await app.type("/");
    await app.type("Alice");
    await vi.waitFor(() => expect(app.frame()).toContain("Alice"));
    await app.type("\r");
    await vi.waitFor(() => expect(client.request).toHaveBeenCalledWith("/api/session/list-rule", expect.objectContaining({ query: { page: 1, page_size: 100, search: "Alice" } })));
    expect(client.request.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    await app.type("n");
    await vi.waitFor(() => expect(client.request).toHaveBeenCalledWith("/api/session/list-rule", expect.objectContaining({ query: { page: 2, page_size: 100, search: "Alice" } })));
  });

  it("shows readable knowledge retrieval results using the upstream kb_names contract", async () => {
    const client = mockClient();
    const kb = { kb_id: "kb1", kb_name: "Notes", doc_count: 1 };
    client.request.mockImplementation(async (path) => {
      if (path === "/api/kb/list") return { items: [kb], total: 1 };
      if (path === "/api/kb/get") return kb;
      if (path === "/api/kb/document/list") return { items: [{ document_id: "d1", file_name: "report.md" }], total: 1 };
      if (path === "/api/kb/retrieve") return { results: [{ chunk_id: "c1", doc_name: "report.md", score: 0.9, content: "Retrieval visible text" }], total: 1 };
      return [];
    });
    const app = mount(client);
    await vi.waitFor(() => expect(app.frame()).toContain("First chat"));
    await app.type("\u001b[Z");
    await app.type("\u001b[D");
    await vi.waitFor(() => expect(app.frame()).toContain("Notes"));
    await app.type("\r");
    await vi.waitFor(() => expect(app.frame()).toContain("report.md"));
    await app.type("f");
    await app.type("Question");
    await app.type("\r");
    await vi.waitFor(() => expect(app.frame()).toContain("Retrieval visible text"));
    expect(client.request).toHaveBeenCalledWith("/api/kb/retrieve", expect.objectContaining({ method: "POST", body: JSON.stringify({ kb_names: ["Notes"], query: "Question", top_k: 5 }) }));
    expect(app.frame()).toContain("0.9000");
  });
});
