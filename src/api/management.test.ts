import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "./client.js";
import { ManagementClient } from "./management.js";

afterEach(() => vi.restoreAllMocks());

describe("ManagementClient", () => {
  it("uses the upstream cron endpoints and HTTP methods", async () => {
    mockFetchJson({ status: "ok", data: [] });
    const api = new ManagementClient(authenticatedClient());
    await api.listCronJobs();
    expectRequest("http://localhost:6185/api/cron/jobs", "GET");

    mockFetchJson({ status: "ok", data: { job_id: "a/b" } });
    await api.updateCronJob("a/b", { enabled: false });
    expectRequest("http://localhost:6185/api/cron/jobs/a%2Fb", "PATCH", {
      enabled: false,
    });

    mockFetchJson({ status: "ok", data: {} });
    await api.runCronJob("a/b");
    expectRequest("http://localhost:6185/api/cron/jobs/a%2Fb/run", "POST", {});
  });

  it("uses skill and subagent legacy endpoints with JSON payloads", async () => {
    mockFetchJson({ status: "ok", data: { skills: [] } });
    const api = new ManagementClient(authenticatedClient());
    await api.getSkills();
    expectRequest("http://localhost:6185/api/skills", "GET");

    mockFetchJson({ status: "ok", data: {} });
    await api.setSkillActive("my_skill", false);
    expectRequest("http://localhost:6185/api/skills/update", "POST", {
      name: "my_skill",
      active: false,
    });

    mockFetchJson({ status: "ok", data: {} });
    await api.updateSubagentConfig({
      main_enable: true,
      remove_main_duplicate_tools: false,
      agents: [],
    });
    expectRequest("http://localhost:6185/api/subagent/config", "POST", {
      main_enable: true,
      remove_main_duplicate_tools: false,
      agents: [],
    });
  });

  it("passes session and knowledge-base query/body contracts", async () => {
    mockFetchJson({ status: "ok", data: { rules: [], total: 0 } });
    const api = new ManagementClient(authenticatedClient());
    await api.getSessionRules({ page: 2, pageSize: 25, search: "webchat" });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toEqual(
      new URL(
        "http://localhost:6185/api/session/list-rule?page=2&page_size=25&search=webchat",
      ),
    );

    mockFetchJson({ status: "ok", data: { items: [], page: 1, page_size: 100, total: 0 } });
    await api.listKnowledgeBases();
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toEqual(
      new URL("http://localhost:6185/api/kb/list?page=1&page_size=100"),
    );

    mockFetchJson({ status: "ok", data: [] });
    await api.retrieveKnowledgeBase("Knowledge", "vector search", { topK: 7 });
    expectRequest("http://localhost:6185/api/kb/retrieve", "POST", {
      kb_names: ["Knowledge"],
      query: "vector search",
      top_k: 7,
    });
  });

  it("propagates dashboard API failures", async () => {
    mockFetchJson({ status: "error", message: "Cron manager not initialized" });
    const api = new ManagementClient(authenticatedClient());
    await expect(api.listCronJobs()).rejects.toThrow("Cron manager not initialized");
  });
});

function authenticatedClient(): DashboardClient {
  return new DashboardClient({ baseUrl: "http://localhost:6185", token: "jwt" });
}

function expectRequest(
  url: string,
  method: string,
  body?: Record<string, unknown>,
) {
  const [requestUrl, init] = vi.mocked(fetch).mock.calls.at(-1) || [];
  expect(requestUrl).toEqual(new URL(url));
  expect(init?.method || "GET").toBe(method);
  if (body) {
    expect(JSON.parse(String(init?.body))).toEqual(body);
  }
  expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer jwt");
}

function mockFetchJson(payload: unknown) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
