import type { DashboardClient } from "./client.js";
import type {
  CronJob,
  CronJobDraft,
  KnowledgeBase,
  KnowledgeBaseListPayload,
  KnowledgeBaseRetrievalResult,
  PaginatedPayload,
  SessionRuleKey,
  SessionRulesPayload,
  SkillsInventory,
  SubagentConfig,
  SubagentTool,
} from "./management.types.js";

type JsonRequestInit = RequestInit & {
  query?: Record<string, string | number | boolean | null | undefined>;
};

/** Narrow API wrapper for the upstream Dashboard management endpoints. */
export class ManagementClient {
  constructor(private readonly client: DashboardClient) {}

  listCronJobs(): Promise<CronJob[]> {
    return this.request<CronJob[]>("/api/cron/jobs");
  }

  createCronJob(payload: CronJobDraft): Promise<CronJob> {
    return this.request<CronJob>("/api/cron/jobs", json("POST", payload));
  }

  updateCronJob(jobId: string, payload: Partial<CronJobDraft>): Promise<CronJob> {
    return this.request<CronJob>(
      `/api/cron/jobs/${encodeURIComponent(jobId)}`,
      json("PATCH", payload),
    );
  }

  deleteCronJob(jobId: string): Promise<unknown> {
    return this.request(
      `/api/cron/jobs/${encodeURIComponent(jobId)}`,
      { method: "DELETE" },
    );
  }

  runCronJob(jobId: string): Promise<unknown> {
    return this.request(
      `/api/cron/jobs/${encodeURIComponent(jobId)}/run`,
      json("POST", {}),
    );
  }

  getSkills(): Promise<SkillsInventory> {
    return this.request<SkillsInventory>("/api/skills");
  }

  setSkillActive(name: string, active: boolean): Promise<unknown> {
    return this.request("/api/skills/update", json("POST", { name, active }));
  }

  deleteSkill(name: string): Promise<unknown> {
    return this.request("/api/skills/delete", json("POST", { name }));
  }

  getSubagentConfig(): Promise<SubagentConfig> {
    return this.request<SubagentConfig>("/api/subagent/config");
  }

  getSubagentTools(): Promise<SubagentTool[]> {
    return this.request<SubagentTool[]>("/api/subagent/available-tools");
  }

  updateSubagentConfig(config: SubagentConfig): Promise<unknown> {
    return this.request("/api/subagent/config", json("POST", config));
  }

  getSessionRules(options: {
    page?: number;
    pageSize?: number;
    search?: string;
  } = {}): Promise<SessionRulesPayload> {
    return this.request<SessionRulesPayload>("/api/session/list-rule", {
      method: "GET",
      query: {
        page: options.page ?? 1,
        page_size: options.pageSize ?? 100,
        search: options.search ?? "",
      },
    });
  }

  updateSessionRule(
    umo: string,
    ruleKey: SessionRuleKey,
    ruleValue: unknown,
  ): Promise<unknown> {
    return this.request(
      "/api/session/update-rule",
      json("POST", { umo, rule_key: ruleKey, rule_value: ruleValue }),
    );
  }

  deleteSessionRule(umo: string, ruleKey: SessionRuleKey): Promise<unknown> {
    return this.request(
      "/api/session/delete-rule",
      json("POST", { umo, rule_key: ruleKey }),
    );
  }

  listKnowledgeBases(options: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<KnowledgeBaseListPayload> {
    return this.request<KnowledgeBaseListPayload>("/api/kb/list", {
      method: "GET",
      query: {
        page: options.page ?? 1,
        page_size: options.pageSize ?? 100,
      },
    });
  }

  getKnowledgeBase(kbId: string): Promise<KnowledgeBase> {
    return this.request<KnowledgeBase>("/api/kb/get", {
      method: "GET",
      query: { kb_id: kbId },
    });
  }

  retrieveKnowledgeBase(
    kbName: string,
    query: string,
    options: { topK?: number; threshold?: number; rerank?: boolean } = {},
  ): Promise<KnowledgeBaseRetrievalResult> {
    return this.request<KnowledgeBaseRetrievalResult>(
      "/api/kb/retrieve",
      json("POST", {
        kb_names: [kbName],
        query,
        top_k: options.topK ?? 5,
        threshold: options.threshold,
        rerank: options.rerank,
      }),
    );
  }

  listKnowledgeBaseDocuments(
    kbId: string,
    options: { page?: number; pageSize?: number; search?: string } = {},
  ): Promise<PaginatedPayload<Record<string, unknown>>> {
    return this.request("/api/kb/document/list", {
      method: "GET",
      query: {
        kb_id: kbId,
        page: options.page ?? 1,
        page_size: options.pageSize ?? 100,
        search: options.search ?? "",
      },
    });
  }

  private request<T>(path: string, init: JsonRequestInit = {}): Promise<T> {
    return this.client.request<T>(path, init);
  }
}

function json(method: string, body: unknown): JsonRequestInit {
  return {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  };
}
