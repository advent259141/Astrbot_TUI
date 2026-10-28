export type ApiStatus = "ok" | "error" | "warning";

export interface ApiEnvelope<T> {
  status: ApiStatus;
  message?: string | null;
  error_code?: string;
  data: T;
}

export interface AuthSetupStatus {
  setup_required?: boolean;
  skip_default_password_auth?: boolean;
  password_upgrade_required?: boolean;
}

export interface LoginResponse {
  token: string;
  username: string;
  change_pwd_hint?: boolean;
  legacy_pwd_hint?: boolean;
  md5_pwd_hint?: boolean;
  password_upgrade_required?: boolean;
}

export interface ChatSession {
  session_id: string;
  platform_id: string;
  creator?: string;
  display_name?: string | null;
  is_group?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface MessagePart {
  type: string;
  text?: string;
  think?: string;
  filename?: string;
  attachment_id?: string;
  tool_calls?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ChatContent {
  type: string;
  message: MessagePart[];
  reasoning?: string;
  agent_stats?: Record<string, unknown>;
  agentStats?: Record<string, unknown>;
  refs?: Record<string, unknown>;
  isLoading?: boolean;
}

export interface ChatRecord {
  id?: string | number;
  local_id?: string;
  content: ChatContent;
  created_at?: string;
  updated_at?: string;
  platform_id?: string;
  user_id?: string;
  sender_id?: string;
  sender_name?: string;
  llm_checkpoint_id?: string | null;
  [key: string]: unknown;
}

export interface ChatSessionPayload {
  session?: ChatSession;
  history: ChatRecord[];
  total?: number;
  page?: number;
  page_size?: number;
  has_more?: boolean;
  is_running?: boolean;
  active_runs?: Array<{
    run_id: string;
    session_id?: string;
    status?: string;
    revision?: number;
    llm_checkpoint_id?: string | null;
    content?: ChatContent;
    [key: string]: unknown;
  }>;
  threads?: unknown[];
  project?: unknown;
}

export interface NewSessionPayload {
  session_id: string;
  platform_id: string;
}

export interface RuntimeStats {
  message_count?: number;
  platform_count?: number;
  plugin_count?: number;
  platform?: Array<{
    name: string;
    count: number;
    timestamp?: number;
  }>;
  message_time_series?: Array<[number, number]>;
  cpu_percent?: number;
  thread_count?: number;
  start_time?: number;
  running?: {
    hours?: number;
    minutes?: number;
    seconds?: number;
  };
  memory?: {
    process?: number;
    system?: number;
  };
  [key: string]: unknown;
}

export type TokenRange = 1 | 3 | 7;

export interface ProviderTrendItem {
  name: string;
  data: Array<[number, number]>;
  total_tokens: number;
}

export interface ProviderRankingItem {
  provider_id: string;
  tokens: number;
}

export interface ModelRankingItem {
  provider_model: string;
  tokens: number;
}

export interface UmoRankingItem {
  umo: string;
  display_name?: string;
  platform_type?: string;
  tokens: number;
}

export interface ProviderTokenStats {
  days: TokenRange;
  trend: {
    series: ProviderTrendItem[];
    total_series: Array<[number, number]>;
  };
  range_total_tokens: number;
  range_total_calls: number;
  range_avg_ttft_ms: number;
  range_avg_duration_ms: number;
  range_avg_tpm: number;
  range_success_rate: number;
  range_by_provider: ProviderRankingItem[];
  range_by_umo: UmoRankingItem[];
  today_total_tokens: number;
  today_total_calls: number;
  today_by_model?: ModelRankingItem[];
  today_by_provider: ProviderRankingItem[];
}

export interface ProviderSourceConfig {
  id: string;
  type?: string;
  provider?: string;
  provider_type?: string;
  api_base?: string;
  enable?: boolean;
  [key: string]: unknown;
}

export interface ProviderConfig {
  id: string;
  enable?: boolean;
  provider_source_id?: string;
  provider_type?: string;
  provider?: string;
  type?: string;
  model?: string;
  modalities?: string[];
  max_context_tokens?: number;
  [key: string]: unknown;
}

export interface ProviderTemplatePayload {
  config_schema?: Record<string, unknown>;
  providers: ProviderConfig[];
  provider_sources: ProviderSourceConfig[];
  model_metadata?: Record<string, Record<string, unknown>>;
}

export interface PlatformConfig {
  id: string;
  type?: string;
  enable?: boolean;
  [key: string]: unknown;
}

export interface PlatformRuntimeError {
  message?: string;
  traceback?: string;
  timestamp?: string | number;
  [key: string]: unknown;
}

export interface PlatformQrPayload {
  qrcode?: string;
  qrcode_img_content?: string;
  qr_status?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export interface PlatformRuntimeStat {
  id: string;
  type?: string;
  status?: string;
  error_count?: number;
  last_error?: PlatformRuntimeError | null;
  unified_webhook?: boolean;
  weixin_oc?: PlatformQrPayload;
  [key: string]: unknown;
}

export interface PlatformStatsPayload {
  platforms?: PlatformRuntimeStat[];
  summary?: {
    total: number;
    running: number;
    error: number;
    total_errors?: number;
  };
  [key: string]: unknown;
}

export interface PlatformRegistrationPayload {
  action: "start" | "poll";
  platform_config?: PlatformConfig;
  registration_code?: string;
  device_code?: string;
  qrcode?: string;
}

export interface PlatformRegistrationResult {
  status?: string;
  registration_code?: string;
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  expires_in?: number;
  interval?: number;
  qrcode?: string;
  qrcode_img_content?: string;
  qr_status?: string;
  message?: string;
  app_id?: string;
  app_secret?: string;
  domain?: string;
  bot_name?: string;
  bot_open_id?: string;
  weixin_oc_token?: string;
  weixin_oc_account_id?: string;
  weixin_oc_base_url?: string;
  weixin_oc_user_id?: string;
  client_id?: string;
  client_secret?: string;
  platform_id_suffix?: string;
  [key: string]: unknown;
}

export interface AstrBotConfigPayload {
  metadata?: Record<string, unknown>;
  config?: {
    platform?: PlatformConfig[];
    [key: string]: unknown;
  };
  platform_i18n_translations?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AbconfInfo {
  id: string;
  name?: string;
  path?: string;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface AbconfListPayload {
  info_list?: AbconfInfo[];
  [key: string]: unknown;
}

export interface AbconfMutationPayload {
  conf_id?: string;
  message?: string;
  [key: string]: unknown;
}

export interface PlatformListPayload {
  platforms: PlatformConfig[];
}

export interface ProviderSourceModelsPayload {
  models: string[];
  model_metadata?: Record<string, Record<string, unknown>>;
}

export interface ProviderCheckResult {
  id?: string;
  name?: string;
  model?: string;
  type?: string;
  status: string;
  error?: string | null;
}

export interface PersonaItem {
  persona_id: string;
  name?: string;
  system_prompt?: string;
  begin_dialogs?: string[];
  tools?: string[] | null;
  skills?: string[] | null;
  custom_error_message?: string | null;
  folder_id?: string | null;
  sort_order?: number;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface PersonaFolder {
  folder_id: string;
  name: string;
  parent_id?: string | null;
  description?: string | null;
  sort_order?: number;
  created_at?: string | null;
  updated_at?: string | null;
  children?: PersonaFolder[];
  [key: string]: unknown;
}

export interface PersonaFolderMutationPayload {
  message?: string;
  folder?: PersonaFolder;
  [key: string]: unknown;
}

export interface PersonaSavePayload {
  persona_id: string;
  system_prompt: string;
  begin_dialogs: string[];
  tools?: string[] | null;
  skills?: string[] | null;
  custom_error_message?: string | null;
  folder_id?: string | null;
  sort_order?: number;
}

export interface PersonaMutationPayload {
  message?: string;
  persona?: PersonaItem;
  [key: string]: unknown;
}

export interface KnowledgeBaseItem {
  kb_id?: string;
  kb_name?: string;
  name?: string;
  description?: string;
  doc_count?: number;
  chunk_count?: number;
  [key: string]: unknown;
}

export interface KnowledgeBaseListPayload {
  items?: KnowledgeBaseItem[];
  page?: number;
  page_size?: number;
  total?: number;
  [key: string]: unknown;
}

export interface VersionPayload {
  version: string;
  dashboard_version?: string | null;
  change_pwd_hint?: boolean;
  md5_pwd_hint?: boolean;
  legacy_pwd_hint?: boolean;
  password_upgrade_required?: boolean;
  need_migration?: boolean;
  runtime?: {
    os: string;
    arch: string;
    sandbox: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export interface LiveLogPayload {
  type?: string;
  level?: string;
  name?: string;
  message?: string;
  time?: number;
  [key: string]: unknown;
}

export interface CommandItem {
  handler_full_name: string;
  handler_name?: string;
  plugin?: string;
  plugin_display_name?: string | null;
  module_path?: string;
  description?: string;
  type?: "command" | "group" | "sub_command" | string;
  parent_signature?: string;
  parent_group_handler?: string;
  original_command?: string;
  current_fragment?: string;
  effective_command?: string;
  aliases?: string[];
  command_name?: string;
  name?: string;
  enabled: boolean;
  is_group?: boolean;
  has_conflict?: boolean;
  permission?: string;
  reserved?: boolean;
  sub_commands?: CommandItem[];
  [key: string]: unknown;
}

export interface ToolParameter {
  type?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ToolItem {
  name: string;
  description?: string;
  active: boolean;
  readonly?: boolean;
  parameters?: {
    properties?: Record<string, ToolParameter>;
    [key: string]: unknown;
  };
  origin?: string;
  origin_name?: string;
  origin_display_name?: string;
  permission_configured?: boolean;
  builtin_config_statuses?: Array<{
    conf_id: string;
    conf_name: string;
    config: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  builtin_config_tags?: Array<{
    conf_id: string;
    conf_name: string;
    enabled: boolean;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface CommandsPayload {
  items: CommandItem[];
  wake_prefix?: string;
  summary: {
    total: number;
    disabled: number;
    conflicts: number;
  };
}

export interface PluginItem {
  name: string;
  repo?: string | null;
  author?: string;
  desc?: string;
  version?: string;
  reserved?: boolean;
  activated?: boolean;
  online_version?: string;
  online_vesion?: string;
  has_update?: boolean;
  update_download_url?: string;
  update_match_source?: "repo" | "name";
  display_name?: string;
  logo?: string | null;
  support_platforms?: string[];
  astrbot_version?: string;
  installed_at?: string | null;
  i18n?: Record<string, unknown>;
  tags?: string[];
  [key: string]: unknown;
}

export interface PluginMarketItem {
  name: string;
  repo?: string | null;
  version?: string;
  download_url?: string;
  display_name?: string;
  trimmedName?: string;
  author?: string;
  desc?: string;
  short_desc?: string;
  category?: string;
  tags?: string[];
  support_platforms?: string[];
  astrbot_version?: string;
  logo?: string | null;
  pinned?: boolean;
  stars?: number;
  updated_at?: string;
  installed?: boolean;
  installed_name?: string;
  installed_version?: string;
  installed_plugin?: PluginItem;
  has_update?: boolean;
  [key: string]: unknown;
}

export type PluginMarketPayload =
  | PluginMarketItem[]
  | Record<string, PluginMarketItem | undefined>;

export interface PluginInstallWarning {
  warning_type?: string;
  can_ignore?: boolean;
  [key: string]: unknown;
}

export type PluginInstallPayload = PluginItem | PluginInstallWarning;

export interface PluginConfigSchemaItem {
  type?: string;
  name?: string;
  description?: string;
  hint?: string;
  obvious_hint?: boolean;
  default?: unknown;
  items?: Record<string, PluginConfigSchemaItem>;
  options?: unknown[];
  labels?: unknown;
  invisible?: boolean;
  readonly?: boolean;
  editor_mode?: boolean;
  editor_language?: string;
  editor_theme?: string;
  render_type?: string;
  templates?: Record<string, unknown>;
  template_schema?: Record<string, PluginConfigSchemaItem>;
  condition?: Record<string, unknown>;
  file_types?: string[];
  slider?: {
    min?: number;
    max?: number;
    step?: number;
    [key: string]: unknown;
  };
  _special?: string;
  [key: string]: unknown;
}

export interface PluginConfigMetadataItem extends PluginConfigSchemaItem {
  items?: Record<string, PluginConfigSchemaItem>;
}

export interface PluginConfigPayload {
  metadata?: Record<string, PluginConfigMetadataItem | unknown> | null;
  config?: Record<string, unknown> | null;
  i18n?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PluginConfigFileListPayload {
  files?: string[];
  [key: string]: unknown;
}

export interface PluginComponent {
  type?: string;
  name?: string;
  title?: string;
  description?: string;
  command?: string;
  handler_name?: string;
  event_type?: string;
  page_name?: string;
  subcommands?: PluginComponent[];
  [key: string]: unknown;
}

export interface PluginDetail extends PluginItem {
  components?: PluginComponent[];
}
