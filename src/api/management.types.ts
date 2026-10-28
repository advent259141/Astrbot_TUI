export interface CronJob {
  job_id: string;
  name?: string;
  job_type?: string;
  cron_expression?: string | null;
  description?: string | null;
  note?: string | null;
  session?: string | null;
  enabled?: boolean;
  timezone?: string | null;
  run_once?: boolean;
  run_at?: string | null;
  next_run_time?: string | null;
  last_run_at?: string | null;
  last_error?: string | null;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CronJobDraft {
  name: string;
  note: string;
  description?: string;
  run_once: boolean;
  cron_expression?: string | null;
  run_at?: string | null;
  session?: string;
  timezone?: string;
  enabled?: boolean;
}

export interface SkillItem {
  name: string;
  description?: string;
  active?: boolean;
  preset?: boolean;
  source_type?: string;
  plugin_name?: string;
  plugin_active?: boolean;
  path?: string;
  [key: string]: unknown;
}

export interface SkillsInventory {
  skills: SkillItem[];
  runtime?: string;
  sandbox_cache?: Record<string, unknown>;
}

export interface SubagentDefinition {
  name: string;
  persona_id?: string | null;
  system_prompt?: string;
  public_description: string;
  enabled: boolean;
  provider_id?: string | null;
  tools?: string[] | null;
  [key: string]: unknown;
}

export interface SubagentConfig {
  main_enable: boolean;
  remove_main_duplicate_tools: boolean;
  agents: SubagentDefinition[];
  [key: string]: unknown;
}

export interface SubagentTool {
  name: string;
  description?: string;
  active?: boolean;
  [key: string]: unknown;
}

export type SessionRuleKey =
  | "session_service_config"
  | "session_plugin_config"
  | "kb_config"
  | "provider_perf_chat_completion"
  | "provider_perf_speech_to_text"
  | "provider_perf_text_to_speech";

export interface SessionRuleEntry {
  umo: string;
  rules: Partial<Record<SessionRuleKey, unknown>>;
  display_name?: string;
  user_alias?: string;
  auto_name?: string;
  [key: string]: unknown;
}

export interface SessionRulesPayload {
  rules: SessionRuleEntry[];
  total: number;
  page: number;
  page_size: number;
  available_rule_keys: SessionRuleKey[];
  [key: string]: unknown;
}

export interface KnowledgeBase {
  kb_id: string;
  kb_name: string;
  description?: string | null;
  emoji?: string | null;
  doc_count?: number;
  chunk_count?: number;
  embedding_provider_id?: string | null;
  rerank_provider_id?: string | null;
  chunk_size?: number;
  chunk_overlap?: number;
  top_k_dense?: number;
  top_k_sparse?: number;
  top_m_final?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface KnowledgeBaseListPayload {
  items: KnowledgeBase[];
  page: number;
  page_size: number;
  total: number;
}

export interface KnowledgeBaseRetrievalResult {
  query?: string;
  total?: number;
  results?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface PaginatedPayload<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}
