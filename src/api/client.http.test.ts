import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "./client.js";
import { ManagementClient } from "./management.js";

const servers: Server[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); })));
});

async function startServer(handler: Parameters<typeof createServer>[0]): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/astrbot`;
}

describe("Dashboard HTTP transport", () => {
  it.each([false, true])("times out stalled GET requests, including partially received JSON (headers=%s)", async (sendHeaders) => {
    const baseUrl = await startServer((_request, response) => {
      if (sendHeaders) {
        response.setHeader("Content-Type", "application/json");
        response.write('{"status":"ok","data":');
      }
    });
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() => timeout(100));
    const client = new DashboardClient({ baseUrl });
    await expect(client.getSessions()).rejects.toMatchObject({ statusCode: 408, message: "Dashboard request timed out (GET /api/chat/sessions)." });
    expect(AbortSignal.timeout).toHaveBeenCalledWith(15000);
  });

  it("loads cached console logs and resumes the live stream from its last timestamp", async () => {
    let lastEventId: string | undefined;
    const baseUrl = await startServer((request, response) => {
      if (request.url === "/astrbot/api/log-history") {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ status: "ok", data: { logs: [{ time: 123, message: "Cached log" }] } }));
        return;
      }
      lastEventId = request.headers["last-event-id"] as string | undefined;
      response.setHeader("Content-Type", "text/event-stream");
      response.end('data: {"time":124,"message":"Next log"}\n\n');
    });
    const client = new DashboardClient({ baseUrl });
    const history = await client.getLogHistory();
    expect(history.logs).toEqual([{ time: 123, message: "Cached log" }]);
    const live = [];
    for await (const log of client.liveLogs({ lastEventId: String(history.logs[0].time) })) live.push(log);
    expect(lastEventId).toBe("123");
    expect(live).toEqual([{ time: 124, message: "Next log" }]);
  });

  it("authenticates and consumes chat SSE through a reverse-proxy prefix", async () => {
    let posted: any;
    let authorization: string | undefined;
    const baseUrl = await startServer((request, response) => {
      authorization = request.headers.authorization;
      if (request.url !== "/astrbot/api/chat/send") { response.writeHead(404).end(); return; }
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => {
        posted = JSON.parse(body);
        response.writeHead(200, { "Content-Type": "text/event-stream" });
        const bytes = Buffer.from(': heartbeat\r\n\r\ndata: {"type":"plain","data":"你好"}\r\n\r\ndata: {"type":"end"}\r\n\r\n');
        response.write(bytes.subarray(0, 54));
        response.end(bytes.subarray(54));
      });
    });
    const client = new DashboardClient({ baseUrl, token: "test-jwt" });
    const events = [];
    for await (const event of client.sendMessage("session-1", "Hello")) events.push(event);
    expect(authorization).toBe("Bearer test-jwt");
    expect(posted).toEqual({ session_id: "session-1", message: [{ type: "plain", text: "Hello" }], enable_streaming: true });
    expect(events).toEqual([{ type: "plain", data: "你好" }, { type: "end" }]);
  });

  it("falls back on legacy history only for an HTTP 404", async () => {
    const urls: string[] = [];
    const baseUrl = await startServer((request, response) => {
      urls.push(request.url || "");
      response.setHeader("Content-Type", "application/json");
      if (request.url?.startsWith("/astrbot/api/v1/")) { response.writeHead(404).end(JSON.stringify({ detail: "Not Found" })); return; }
      response.end(JSON.stringify({ status: "ok", data: { history: [], is_running: false } }));
    });
    const client = new DashboardClient({ baseUrl });
    await expect(client.getSession("session-1")).resolves.toEqual({ history: [], is_running: false });
    expect(urls).toEqual(["/astrbot/api/v1/chat/sessions/session-1", "/astrbot/api/chat/get_session?session_id=session-1"]);
    await expect(client.getSession("session-1", { page: 2 })).rejects.toThrow("does not support paginated chat history");
    expect(urls).toHaveLength(3);
  });

  it("preserves management methods and server-side validation failures", async () => {
    const requests: Array<{ method?: string; url?: string; body: string }> = [];
    const baseUrl = await startServer((request, response) => {
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => {
        requests.push({ method: request.method, url: request.url, body });
        response.setHeader("Content-Type", "application/json");
        response.writeHead(400).end(JSON.stringify({ status: "error", message: "Invalid cron expression", data: { field: "cron_expression" } }));
      });
    });
    const api = new ManagementClient(new DashboardClient({ baseUrl, token: "test-jwt" }));
    await expect(api.updateCronJob("job1", { cron_expression: "invalid" })).rejects.toMatchObject({ message: "Invalid cron expression", statusCode: 400, data: { field: "cron_expression" } });
    expect(requests).toEqual([{ method: "PATCH", url: "/astrbot/api/cron/jobs/job1", body: JSON.stringify({ cron_expression: "invalid" }) }]);
  });
});
