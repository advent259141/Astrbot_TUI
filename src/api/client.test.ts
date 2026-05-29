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

  it("streams chat SSE payloads", async () => {
    mockFetchStream(
      [
        "data: {\"type\":\"session_id\",\"session_id\":\"s1\"}\n\n",
        "data: {\"type\":\"plain\",\"data\":\"hi\"}\n\n",
        "data: {\"type\":\"end\"}\n\n",
      ],
      "text/event-stream",
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
    await expect(client.getPersonas()).resolves.toEqual([
      { persona_id: "default" },
    ]);
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/persona/list?folder_id="),
      expect.objectContaining({ method: "GET" }),
    );

    mockFetchJson({
      status: "ok",
      data: { items: [{ name: "docs" }] },
    });
    await expect(client.getKnowledgeBases()).resolves.toEqual({
      items: [{ name: "docs" }],
    });
    expect(fetch).toHaveBeenLastCalledWith(
      new URL("http://localhost:6185/api/kb/list?page=1&page_size=100"),
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
