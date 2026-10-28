import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "./client.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DashboardClient", () => {
  it("logs in through the dashboard API", async () => {
    mockFetchJson({
      status: "ok",
      data: {
        token: "jwt",
        username: "astrbot",
      },
    });

    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    await expect(client.login("astrbot", "secret")).resolves.toEqual({
      token: "jwt",
      username: "astrbot",
    });

    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost:6185/api/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "astrbot", password: "secret" }),
      }),
    );
  });

  it("sends an optional login code without changing the password payload", async () => {
    mockFetchJson({
      status: "ok",
      data: { token: "jwt", username: "astrbot" },
    });

    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    await client.login("astrbot", "secret", "123456");

    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost:6185/api/auth/login"),
      expect.objectContaining({
        body: JSON.stringify({
          username: "astrbot",
          password: "secret",
          code: "123456",
        }),
      }),
    );
  });

  it("reads setup status and creates the first dashboard account", async () => {
    mockFetchJson({
      status: "ok",
      data: {
        setup_required: true,
        skip_default_password_auth: true,
      },
    });

    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    await expect(client.getAuthSetupStatus()).resolves.toMatchObject({
      setup_required: true,
      skip_default_password_auth: true,
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/auth/setup-status"),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: { token: "jwt", username: "astrbot" },
    });
    await expect(
      client.setup("astrbot", "strong-secret", "strong-secret"),
    ).resolves.toMatchObject({ token: "jwt", username: "astrbot" });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/auth/setup"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "astrbot",
          password: "strong-secret",
          confirm_password: "strong-secret",
        }),
      }),
    );
  });

  it("keeps structured error data for authentication flows", async () => {
    mockFetchJson(
      {
        status: "error",
        message: "需要 TOTP 验证",
        data: { totp_required: true },
      },
      401,
    );

    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    await expect(client.login("astrbot", "secret")).rejects.toMatchObject({
      statusCode: 401,
      data: { totp_required: true },
    });
  });

  it("sends bearer tokens on authenticated requests", async () => {
    mockFetchJson({
      status: "ok",
      data: [{ session_id: "s1", platform_id: "webchat" }],
    });

    const client = new DashboardClient({
      baseUrl: "http://localhost:6185/",
      token: "jwt",
    });
    await expect(client.getSessions()).resolves.toEqual([
      { session_id: "s1", platform_id: "webchat" },
    ]);

    const requestInit = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).toBe(
      "Bearer jwt",
    );
  });

  it("keeps a reverse-proxy base path and exposes request for API extensions", async () => {
    mockFetchJson({ status: "ok", data: { enabled: true } });

    const client = new DashboardClient({
      baseUrl: "http://localhost:6185/astrbot/proxy/",
      token: "jwt",
    });
    await expect(
      client.request<{ enabled: boolean }>("/api/custom", {
        method: "GET",
        query: { page: 2, ignored: null },
      }),
    ).resolves.toEqual({ enabled: true });

    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost:6185/astrbot/proxy/api/custom?page=2"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).not.toHaveProperty("query");
  });

  it("loads paginated chat sessions from the v1 API", async () => {
    mockFetchJson({
      status: "ok",
      data: {
        session: { session_id: "s1", platform_id: "webchat" },
        history: [{ id: 2, content: { type: "message", message: [] } }],
        total: 75,
        page: 2,
        page_size: 50,
        has_more: true,
        active_runs: [{ run_id: "r1", session_id: "s1", status: "running" }],
      },
    });

    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    await expect(client.getSession("s1", { page: 2, pageSize: 50 })).resolves.toMatchObject({
      total: 75,
      page: 2,
      page_size: 50,
      has_more: true,
      active_runs: [{ run_id: "r1", session_id: "s1", status: "running" }],
    });
    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost:6185/api/v1/chat/sessions/s1?page=2&page_size=50"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("falls back to the legacy session endpoint only when v1 returns 404", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: "error", message: "Not found", data: null }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "ok",
            data: { history: [], is_running: false },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    await expect(client.getSession("s1", { page: 1, pageSize: 50 })).resolves.toEqual({
      history: [],
      is_running: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(
      new URL("http://localhost:6185/api/v1/chat/sessions/s1?page=1&page_size=50"),
    );
    expect(fetchMock.mock.calls[1]?.[0]).toEqual(
      new URL("http://localhost:6185/api/chat/get_session?session_id=s1"),
    );
  });

  it("does not fall back to the legacy session endpoint for other errors", async () => {
    mockFetchJson(
      { status: "error", message: "Service unavailable", data: null },
      503,
    );

    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    await expect(client.getSession("s1")).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("streams chat SSE payloads", async () => {
    mockFetchStream(
      [
        "data: {\"type\":\"session_id\",\"session_id\":\"s1\"}\n\n",
        "data: {\"type\":\"plain\",\"data\":\"hi\"}\n\n",
        "data: {\"type\":\"end\"}\n\n",
      ],
      "Text/Event-Stream; charset=utf-8",
    );

    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });
    const payloads = [];
    for await (const payload of client.sendMessage("s1", "hello")) {
      payloads.push(payload);
    }

    expect(payloads).toEqual([
      { type: "session_id", session_id: "s1" },
      { type: "plain", data: "hi" },
      { type: "end" },
    ]);
  });

  it("resumes a chat run from the upstream SSE endpoint", async () => {
    mockFetchStream(
      ["data: {\"type\":\"plain\",\"data\":\"restored\"}\n\n"],
      "text/event-stream",
    );

    const client = new DashboardClient({
      baseUrl: "http://localhost:6185/astrbot",
      token: "jwt",
    });
    const payloads = [];
    for await (const payload of client.resumeChatRun("run/one")) {
      payloads.push(payload);
    }

    expect(payloads).toEqual([{ type: "plain", data: "restored" }]);
    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost:6185/astrbot/api/v1/chat/runs/run%2Fone/stream"),
      expect.objectContaining({ method: "GET" }),
    );
    const requestInit = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Accept")).toBe("text/event-stream");
    expect(new Headers(requestInit.headers).get("Authorization")).toBe(
      "Bearer jwt",
    );
  });

  it("preserves structured errors when an SSE endpoint cannot resume a run", async () => {
    mockFetchJson(
      {
        status: "error",
        message: "Chat run is unavailable",
        data: { run_id: "missing" },
      },
      404,
    );

    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    await expect(client.resumeChatRun("missing").next()).rejects.toMatchObject({
      message: "Chat run is unavailable",
      statusCode: 404,
      data: { run_id: "missing" },
    });
  });

  it("streams live log payloads", async () => {
    mockFetchStream(
      ["id: 1\ndata: {\"type\":\"log\",\"level\":\"info\",\"message\":\"ready\"}\n\n"],
      "text/event-stream",
    );

    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });
    const payloads = [];
    for await (const payload of client.liveLogs()) {
      payloads.push(payload);
    }

    expect(payloads).toEqual([
      { type: "log", level: "info", message: "ready" },
    ]);
  });

  it("installs plugins with market download URLs", async () => {
    mockFetchJson({
      status: "ok",
      data: {
        name: "astrbot_plugin_demo",
        repo: "https://github.com/demo/plugin",
      },
    });

    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });
    await expect(
      client.installPlugin("https://github.com/demo/plugin", {
        downloadUrl: "https://mirror.example/plugin.zip",
      }),
    ).resolves.toMatchObject({
      name: "astrbot_plugin_demo",
    });

    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost:6185/api/plugin/install"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          url: "https://github.com/demo/plugin",
          download_url: "https://mirror.example/plugin.zip",
          proxy: "",
          ignore_version_check: false,
        }),
      }),
    );
  });

  it("returns plugin install warning envelopes", async () => {
    mockFetchJson({
      status: "warning",
      message: "AstrBot version mismatch",
      data: {
        warning_type: "astrbot_version_incompatible",
        can_ignore: true,
      },
    });

    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });
    await expect(
      client.installPluginEnvelope("https://github.com/demo/plugin"),
    ).resolves.toMatchObject({
      status: "warning",
      message: "AstrBot version mismatch",
      data: {
        warning_type: "astrbot_version_incompatible",
      },
    });
  });

  it("reads and updates plugin config", async () => {
    mockFetchJson({
      status: "ok",
      data: {
        config: {
          enabled: true,
        },
      },
    });

    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });
    await expect(client.getPluginConfig("demo")).resolves.toEqual({
      config: {
        enabled: true,
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost:6185/api/config/get?plugin_name=demo"),
      expect.objectContaining({
        method: "GET",
      }),
    );

    mockFetchJson({
      status: "ok",
      data: null,
    });
    await expect(
      client.updatePluginConfig("demo", { enabled: false }),
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/plugin/update?plugin_name=demo"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ enabled: false }),
      }),
    );
  });

  it("loads selector data used by plugin config specials", async () => {
    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });

    mockFetchJson({
      status: "ok",
      data: [{ id: "openai", model: "gpt-4o" }],
    });
    await expect(client.getProviderList("chat_completion")).resolves.toEqual([
      { id: "openai", model: "gpt-4o" },
    ]);
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/provider/list?provider_type=chat_completion"),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: [{ persona_id: "default" }],
    });
    await expect(client.getPersonas("")).resolves.toEqual([
      { persona_id: "default" },
    ]);
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/list?folder_id="),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: {
        items: [{ kb_id: "kb1", kb_name: "docs", doc_count: 2 }],
        page: 1,
        page_size: 100,
        total: 1,
      },
    });
    await expect(client.getKnowledgeBases()).resolves.toEqual({
      items: [{ kb_id: "kb1", kb_name: "docs", doc_count: 2 }],
      page: 1,
      page_size: 100,
      total: 1,
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/kb/list?page=1&page_size=100"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("omits folder_id when loading personas from all folders", async () => {
    mockFetchJson({ status: "ok", data: [{ persona_id: "nested" }] });

    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    await expect(client.getPersonas()).resolves.toEqual([
      { persona_id: "nested" },
    ]);

    expect(fetch).toHaveBeenCalledWith(
      new URL("http://localhost:6185/api/persona/list"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("manages personas through dashboard endpoints", async () => {
    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });

    mockFetchJson({
      status: "ok",
      data: {
        persona_id: "assistant",
        system_prompt: "You are helpful.",
        begin_dialogs: [],
        tools: null,
        skills: null,
        custom_error_message: null,
      },
    });
    await expect(client.getPersonaDetail("assistant")).resolves.toMatchObject({
      persona_id: "assistant",
      system_prompt: "You are helpful.",
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/detail"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ persona_id: "assistant" }),
      }),
    );

    const payload = {
      persona_id: "assistant",
      system_prompt: "You are helpful.",
      begin_dialogs: [],
      tools: null,
      skills: null,
      custom_error_message: null,
      folder_id: null,
      sort_order: 0,
    };
    mockFetchJson({
      status: "ok",
      data: { message: "created", persona: payload },
    });
    await expect(client.createPersona(payload)).resolves.toMatchObject({
      message: "created",
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/create"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    mockFetchJson({
      status: "ok",
      data: { message: "updated" },
    });
    await expect(client.updatePersona(payload)).resolves.toMatchObject({
      message: "updated",
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/update"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    mockFetchJson({
      status: "ok",
      data: null,
    });
    await expect(client.deletePersona("assistant")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/delete"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ persona_id: "assistant" }),
      }),
    );
  });

  it("creates and updates provider sources through the legacy upsert contract", async () => {
    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });
    const source = {
      id: "openai-source",
      type: "openai_chat_completion",
      api_base: "https://api.example.com/v1",
    };

    mockFetchJson({ status: "ok", data: "updated" });
    await expect(
      client.updateProviderSource(source.id, source),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/provider_sources/update"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ original_id: source.id, config: source }),
      }),
    );

    mockFetchJson({ status: "ok", data: "deleted" });
    await expect(
      client.deleteProviderSource(source.id),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/provider_sources/delete"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id: source.id }),
      }),
    );
  });

  it("loads command and tool state, including readonly tool flags", async () => {
    const client = new DashboardClient({ baseUrl: "http://localhost:6185" });

    mockFetchJson({
      status: "ok",
      data: {
        items: [{ handler_full_name: "plugin.cmd", enabled: false }],
        summary: { total: 1, disabled: 1, conflicts: 0 },
        wake_prefix: "/",
      },
    });
    await expect(client.getCommands()).resolves.toMatchObject({
      items: [{ handler_full_name: "plugin.cmd", enabled: false }],
      wake_prefix: "/",
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/commands"),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: [{ name: "builtin.echo", active: true, readonly: true }],
    });
    await expect(client.getTools()).resolves.toEqual([
      { name: "builtin.echo", active: true, readonly: true },
    ]);
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/tools/list"),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({ status: "ok", data: { handler_full_name: "plugin.cmd" } });
    await expect(client.toggleCommand("plugin.cmd", true)).resolves.toEqual({
      handler_full_name: "plugin.cmd",
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/commands/toggle"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ handler_full_name: "plugin.cmd", enabled: true }),
      }),
    );

    mockFetchJson({ status: "ok", data: "updated" });
    await expect(client.toggleTool("custom.tool", false)).resolves.toBeUndefined();
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/tools/toggle-tool"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "custom.tool", activate: false }),
      }),
    );
  });

  it("manages AstrBot config files through dashboard endpoints", async () => {
    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });

    mockFetchJson({
      status: "ok",
      data: { info_list: [{ id: "default", name: "Default" }] },
    });
    await expect(client.getAbconfs()).resolves.toEqual([
      { id: "default", name: "Default" },
    ]);
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/abconfs"),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: { config: { provider_settings: { enable: true } }, metadata: {} },
    });
    await expect(client.getAbconf("default")).resolves.toMatchObject({
      config: { provider_settings: { enable: true } },
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/abconf?id=default"),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: { config: { dashboard: { enabled: true } }, metadata: {} },
    });
    await expect(client.getAbconf(undefined, { systemConfig: true })).resolves.toMatchObject({
      config: { dashboard: { enabled: true } },
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/abconf?system_config=1"),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({ status: "ok", data: null });
    await expect(
      client.updateAstrBotConfig({ provider_settings: { enable: false } }, "default"),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/astrbot/update"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          config: { provider_settings: { enable: false } },
          conf_id: "default",
          id: "default",
        }),
      }),
    );
  });

  it("manages persona folders through dashboard endpoints", async () => {
    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });

    mockFetchJson({
      status: "ok",
      data: [{ folder_id: "f1", name: "General", parent_id: null }],
    });
    await expect(client.getPersonaFolders()).resolves.toEqual([
      { folder_id: "f1", name: "General", parent_id: null },
    ]);
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/folder/list?parent_id="),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: [{ folder_id: "f1", name: "General", children: [] }],
    });
    await expect(client.getPersonaFolderTree()).resolves.toEqual([
      { folder_id: "f1", name: "General", children: [] },
    ]);
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/folder/tree"),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: { folder: { folder_id: "f2", name: "New" } },
    });
    await expect(
      client.createPersonaFolder({ name: "New", parent_id: null }),
    ).resolves.toMatchObject({
      folder: { folder_id: "f2" },
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/folder/create"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "New", parent_id: null }),
      }),
    );

    mockFetchJson({ status: "ok", data: null });
    await expect(client.movePersona("assistant", "f2")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/move"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ persona_id: "assistant", folder_id: "f2" }),
      }),
    );
  });

  it("manages plugin config file lists", async () => {
    const client = new DashboardClient({
      baseUrl: "http://localhost:6185",
      token: "jwt",
    });

    mockFetchJson({
      status: "ok",
      data: { files: ["a.txt", "b.txt"] },
    });
    await expect(client.getPluginConfigFiles("demo", "assets")).resolves.toEqual({
      files: ["a.txt", "b.txt"],
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/file/get?scope=plugin&name=demo&key=assets"),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: null,
    });
    await expect(client.deletePluginConfigFile("demo", "a.txt")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/config/file/delete?scope=plugin&name=demo"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ path: "a.txt" }),
      }),
    );
  });
});

function mockFetchJson(payload: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(payload), {
        status,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    ),
  );
}

function mockFetchStream(chunks: string[], contentType: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(streamFrom(chunks), {
        headers: {
          "Content-Type": contentType,
        },
      }),
    ),
  );
}

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
