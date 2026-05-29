import { ApiError, messageFromUnknown } from "./errors.js";
import { parseJsonEventSource } from "./sse.js";
import { unwrapApiEnvelope } from "./response.js";
import type {
  AbconfInfo,
  AbconfListPayload,
  AbconfMutationPayload,
  ChatSession,
  ChatSessionPayload,
  CommandsPayload,
  AstrBotConfigPayload,
  KnowledgeBaseListPayload,
  LoginResponse,
  LiveLogPayload,
  PersonaFolder,
  PersonaFolderMutationPayload,
  PersonaMutationPayload,
  PersonaItem,
  PersonaSavePayload,
  PlatformConfig,
  PlatformListPayload,
  PlatformRegistrationPayload,
  PlatformRegistrationResult,
  PlatformStatsPayload,
  PluginConfigPayload,
  PluginConfigFileListPayload,
  PluginDetail,
  PluginInstallPayload,
  PluginItem,
  PluginMarketItem,
  PluginMarketPayload,
  ProviderCheckResult,
  ProviderConfig,
  ProviderSourceConfig,
  ProviderSourceModelsPayload,
  ProviderTemplatePayload,
  NewSessionPayload,
  ProviderTokenStats,
  RuntimeStats,
  TokenRange,
  ToolItem,
  VersionPayload,
} from "./types.js";
import type { ApiEnvelope } from "./types.js";

export interface DashboardClientOptions {
  baseUrl: string;
  token?: string;
}

export class DashboardClient {
  readonly baseUrl: string;
  private readonly token?: string;

  constructor(options: DashboardClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
  }

  withToken(token: string): DashboardClient {
    return new DashboardClient({ baseUrl: this.baseUrl, token });
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    return this.post<LoginResponse>("/api/auth/login", { username, password });
  }

  async logout(): Promise<void> {
    await this.post<Record<string, never>>("/api/auth/logout", {});
  }

  async getSessions(): Promise<ChatSession[]> {
    return this.get<ChatSession[]>("/api/chat/sessions");
  }

  async getSession(sessionId: string): Promise<ChatSessionPayload> {
    return this.get<ChatSessionPayload>("/api/chat/get_session", {
      session_id: sessionId,
    });
  }

  async newSession(): Promise<NewSessionPayload> {
    return this.get<NewSessionPayload>("/api/chat/new_session");
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.get<Record<string, never>>("/api/chat/delete_session", {
      session_id: sessionId,
    });
  }

  async renameSession(sessionId: string, displayName: string): Promise<void> {
    await this.post<Record<string, never>>(
      "/api/chat/update_session_display_name",
      {
        session_id: sessionId,
        display_name: displayName,
      },
    );
  }

  async stopSession(sessionId: string): Promise<{ stopped_count?: number }> {
    return this.post<{ stopped_count?: number }>("/api/chat/stop", {
      session_id: sessionId,
    });
  }

  async *sendMessage(
    sessionId: string,
    text: string,
    options: { signal?: AbortSignal } = {},
  ): AsyncGenerator<Record<string, unknown>> {
    const response = await this.fetchRaw("/api/chat/send", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        message: [{ type: "plain", text }],
        enable_streaming: true,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      signal: options.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      throw new ApiError(
        `Chat stream failed (POST /api/chat/send): HTTP ${response.status}`,
        response.status,
      );
    }
    if (!response.body || !contentType.includes("text/event-stream")) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(
        payload?.message || "Chat stream did not return an event stream.",
        response.status,
      );
    }

    yield* parseJsonEventSource<Record<string, unknown>>(response.body);
  }

  async getStats(options: { offsetSec?: number } = {}): Promise<RuntimeStats> {
    return this.get<RuntimeStats>(
      "/api/stat/get",
      options.offsetSec ? { offset_sec: options.offsetSec } : undefined,
    );
  }

  async getProviderTokenStats(days: TokenRange = 1): Promise<ProviderTokenStats> {
    return this.get<ProviderTokenStats>("/api/stat/provider-tokens", { days });
  }

  async getProviderTemplate(): Promise<ProviderTemplatePayload> {
    return this.get<ProviderTemplatePayload>("/api/config/provider/template");
  }

  async getAstrBotConfig(): Promise<AstrBotConfigPayload> {
    return this.get<AstrBotConfigPayload>("/api/config/get");
  }

  async getAbconfs(): Promise<AbconfInfo[]> {
    const payload = await this.get<AbconfListPayload>("/api/config/abconfs");
    return payload.info_list || [];
  }

  async getAbconf(
    id?: string,
    options: { systemConfig?: boolean } = {},
  ): Promise<AstrBotConfigPayload> {
    return this.get<AstrBotConfigPayload>("/api/config/abconf", {
      id: options.systemConfig ? undefined : id,
      system_config: options.systemConfig ? 1 : undefined,
    });
  }

  async updateAstrBotConfig(
    config: Record<string, unknown>,
    confId?: string,
  ): Promise<void> {
    await this.post<Record<string, never>>("/api/config/astrbot/update", {
      config,
      conf_id: confId,
      id: confId,
    });
  }

  async createAbconf(
    name: string,
    config?: Record<string, unknown>,
  ): Promise<AbconfMutationPayload> {
    return this.post<AbconfMutationPayload>("/api/config/abconf/new", {
      name,
      config,
    });
  }

  async updateAbconfInfo(id: string, name: string): Promise<void> {
    await this.post<Record<string, never>>("/api/config/abconf/update", {
      id,
      name,
    });
  }

  async deleteAbconf(id: string): Promise<void> {
    await this.post<Record<string, never>>("/api/config/abconf/delete", {
      id,
    });
  }

  async getPlatforms(): Promise<PlatformListPayload> {
    return this.get<PlatformListPayload>("/api/config/platform/list");
  }

  async getPlatformStats(): Promise<PlatformStatsPayload> {
    return this.get<PlatformStatsPayload>("/api/platform/stats");
  }

  async platformRegistration(
    platformType: string,
    payload: PlatformRegistrationPayload,
  ): Promise<PlatformRegistrationResult> {
    return this.post<PlatformRegistrationResult>(
      `/api/platform/registration/${encodeURIComponent(platformType)}`,
      payload,
    );
  }

  async createPlatform(config: PlatformConfig): Promise<void> {
    await this.post<Record<string, never>>("/api/config/platform/new", config);
  }

  async updatePlatform(platformId: string, config: PlatformConfig): Promise<void> {
    await this.post<Record<string, never>>("/api/config/platform/update", {
      id: platformId,
      config,
    });
  }

  async deletePlatform(platformId: string): Promise<void> {
    await this.post<Record<string, never>>("/api/config/platform/delete", {
      id: platformId,
    });
  }

  async updateProvider(providerId: string, config: ProviderConfig): Promise<void> {
    await this.post<Record<string, never>>("/api/config/provider/update", {
      id: providerId,
      config,
    });
  }

  async createProvider(config: ProviderConfig): Promise<void> {
    await this.post<Record<string, never>>("/api/config/provider/new", config);
  }

  async deleteProvider(providerId: string): Promise<void> {
    await this.post<Record<string, never>>("/api/config/provider/delete", {
      id: providerId,
    });
  }

  async updateProviderSource(
    originalId: string,
    config: ProviderSourceConfig,
  ): Promise<void> {
    await this.post<Record<string, never>>("/api/config/provider_sources/update", {
      original_id: originalId,
      config,
    });
  }

  async deleteProviderSource(sourceId: string): Promise<void> {
    await this.post<Record<string, never>>("/api/config/provider_sources/delete", {
      id: sourceId,
    });
  }

  async getProviderSourceModels(sourceId: string): Promise<ProviderSourceModelsPayload> {
    return this.get<ProviderSourceModelsPayload>(
      "/api/config/provider_sources/models",
      { source_id: sourceId },
    );
  }

  async getProviderList(providerType: string): Promise<ProviderConfig[]> {
    return this.get<ProviderConfig[]>("/api/config/provider/list", {
      provider_type: providerType,
    });
  }

  async getPersonas(folderId = ""): Promise<PersonaItem[]> {
    return this.get<PersonaItem[]>("/api/persona/list", {
      folder_id: folderId,
    });
  }

  async getPersonaFolders(parentId = ""): Promise<PersonaFolder[]> {
    return this.get<PersonaFolder[]>("/api/persona/folder/list", {
      parent_id: parentId,
    });
  }

  async getPersonaFolderTree(): Promise<PersonaFolder[]> {
    return this.get<PersonaFolder[]>("/api/persona/folder/tree");
  }

  async createPersonaFolder(payload: {
    name: string;
    parent_id?: string | null;
    description?: string | null;
    sort_order?: number;
  }): Promise<PersonaFolderMutationPayload> {
    return this.post<PersonaFolderMutationPayload>(
      "/api/persona/folder/create",
      payload,
    );
  }

  async updatePersonaFolder(payload: {
    folder_id: string;
    name?: string;
    description?: string | null;
    parent_id?: string | null;
    sort_order?: number;
  }): Promise<void> {
    await this.post<Record<string, never>>("/api/persona/folder/update", payload);
  }

  async deletePersonaFolder(folderId: string): Promise<void> {
    await this.post<Record<string, never>>("/api/persona/folder/delete", {
      folder_id: folderId,
    });
  }

  async movePersona(personaId: string, folderId: string | null): Promise<void> {
    await this.post<Record<string, never>>("/api/persona/move", {
      persona_id: personaId,
      folder_id: folderId,
    });
  }

  async getPersonaDetail(personaId: string): Promise<PersonaItem> {
    return this.post<PersonaItem>("/api/persona/detail", {
      persona_id: personaId,
    });
  }

  async createPersona(payload: PersonaSavePayload): Promise<PersonaMutationPayload> {
    return this.post<PersonaMutationPayload>("/api/persona/create", payload);
  }

  async updatePersona(payload: PersonaSavePayload): Promise<PersonaMutationPayload> {
    return this.post<PersonaMutationPayload>("/api/persona/update", payload);
  }

  async deletePersona(personaId: string): Promise<void> {
    await this.post<Record<string, never>>("/api/persona/delete", {
      persona_id: personaId,
    });
  }

  async getKnowledgeBases(): Promise<KnowledgeBaseListPayload> {
    return this.get<KnowledgeBaseListPayload>("/api/kb/list", {
      page: 1,
      page_size: 100,
    });
  }

  async checkProvider(providerId: string): Promise<ProviderCheckResult> {
    return this.get<ProviderCheckResult>("/api/config/provider/check_one", {
      id: providerId,
    });
  }

  async getVersion(): Promise<VersionPayload> {
    return this.get<VersionPayload>("/api/stat/version");
  }

  async restartCore(): Promise<void> {
    await this.post<Record<string, never>>("/api/stat/restart-core", {});
  }

  async getCommands(): Promise<CommandsPayload> {
    return this.get<CommandsPayload>("/api/commands");
  }

  async getTools(): Promise<ToolItem[]> {
    return this.get<ToolItem[]>("/api/tools/list");
  }

  async toggleCommand(
    handlerFullName: string,
    enabled: boolean,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("/api/commands/toggle", {
      handler_full_name: handlerFullName,
      enabled,
    });
  }

  async toggleTool(name: string, active: boolean): Promise<void> {
    await this.post<Record<string, never>>("/api/tools/toggle-tool", {
      name,
      activate: active,
    });
  }

  async getPlugins(name?: string): Promise<PluginItem[]> {
    return this.get<PluginItem[]>(
      "/api/plugin/get",
      name ? { name } : undefined,
    );
  }

  async getPluginDetail(name: string): Promise<PluginDetail> {
    return this.get<PluginDetail>("/api/plugin/detail", { name });
  }

  async getPluginConfig(name: string): Promise<PluginConfigPayload> {
    return this.get<PluginConfigPayload>("/api/config/get", {
      plugin_name: name,
    });
  }

  async updatePluginConfig(
    name: string,
    config: Record<string, unknown>,
  ): Promise<void> {
    await this.post<Record<string, never>>(
      "/api/config/plugin/update",
      config,
      { plugin_name: name },
    );
  }

  async getPluginConfigFiles(
    name: string,
    configKey: string,
  ): Promise<PluginConfigFileListPayload> {
    return this.get<PluginConfigFileListPayload>("/api/config/file/get", {
      scope: "plugin",
      name,
      key: configKey,
    });
  }

  async deletePluginConfigFile(name: string, path: string): Promise<void> {
    await this.post<Record<string, never>>(
      "/api/config/file/delete",
      { path },
      {
        scope: "plugin",
        name,
      },
    );
  }

  async getPluginMarketList(): Promise<PluginMarketPayload> {
    return this.get<PluginMarketPayload>("/api/plugin/market_list");
  }

  async togglePlugin(name: string, activated: boolean): Promise<void> {
    await this.post<Record<string, never>>(
      activated ? "/api/plugin/on" : "/api/plugin/off",
      { name },
    );
  }

  async reloadPlugin(name: string): Promise<void> {
    await this.post<Record<string, never>>("/api/plugin/reload", { name });
  }

  async updatePlugin(
    name: string,
    options: { downloadUrl?: string; proxy?: string } = {},
  ): Promise<void> {
    await this.post<Record<string, never>>("/api/plugin/update", {
      name,
      download_url: options.downloadUrl || "",
      proxy: options.proxy || "",
    });
  }

  async installPlugin(
    url: string,
    options: {
      downloadUrl?: string;
      proxy?: string;
      ignoreVersionCheck?: boolean;
    } = {},
  ): Promise<PluginInstallPayload> {
    return this.post<PluginInstallPayload>("/api/plugin/install", {
      url,
      download_url: options.downloadUrl || "",
      proxy: options.proxy || "",
      ignore_version_check: Boolean(options.ignoreVersionCheck),
    });
  }

  async installPluginEnvelope(
    url: string,
    options: {
      downloadUrl?: string;
      proxy?: string;
      ignoreVersionCheck?: boolean;
    } = {},
  ): Promise<ApiEnvelope<PluginInstallPayload>> {
    return this.postEnvelope<PluginInstallPayload>("/api/plugin/install", {
      url,
      download_url: options.downloadUrl || "",
      proxy: options.proxy || "",
      ignore_version_check: Boolean(options.ignoreVersionCheck),
    });
  }

  async uninstallPlugin(
    name: string,
    options: { deleteConfig?: boolean; deleteData?: boolean } = {},
  ): Promise<void> {
    await this.post<Record<string, never>>("/api/plugin/uninstall", {
      name,
      delete_config: Boolean(options.deleteConfig),
      delete_data: Boolean(options.deleteData),
    });
  }

  async *liveLogs(
    options: { signal?: AbortSignal } = {},
  ): AsyncGenerator<LiveLogPayload> {
    const response = await this.fetchRaw("/api/live-log", {
      signal: options.signal,
      headers: {
        Accept: "text/event-stream",
      },
    });
    if (!response.ok || !response.body) {
      throw new ApiError(
        `Live log stream failed (GET /api/live-log): HTTP ${response.status}`,
        response.status,
      );
    }
    yield* parseJsonEventSource<LiveLogPayload>(response.body);
  }

  private async get<T>(
    path: string,
    query?: Record<string, string | number | boolean | null | undefined>,
  ): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }

  private async post<T>(
    path: string,
    body: unknown,
    query?: Record<string, string | number | boolean | null | undefined>,
  ): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      query,
    });
  }

  private async postEnvelope<T>(
    path: string,
    body: unknown,
    query?: Record<string, string | number | boolean | null | undefined>,
  ): Promise<ApiEnvelope<T>> {
    return this.requestEnvelope<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      query,
    });
  }

  private async request<T>(
    path: string,
    init: RequestInit & {
      query?: Record<string, string | number | boolean | null | undefined>;
    } = {},
  ): Promise<T> {
    const response = await this.fetchRaw(path, init);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(
        `Dashboard returned a non-JSON response (${init.method || "GET"} ${path}): HTTP ${response.status}`,
        response.status,
      );
    }

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message || "")
          : "";
      throw new ApiError(
        message ||
          `Dashboard request failed (${init.method || "GET"} ${path}): HTTP ${response.status}`,
        response.status,
      );
    }

    return unwrapApiEnvelope<T>(payload);
  }

  private async requestEnvelope<T>(
    path: string,
    init: RequestInit & {
      query?: Record<string, string | number | boolean | null | undefined>;
    } = {},
  ): Promise<ApiEnvelope<T>> {
    const response = await this.fetchRaw(path, init);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(
        `Dashboard returned a non-JSON response (${init.method || "GET"} ${path}): HTTP ${response.status}`,
        response.status,
      );
    }

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message || "")
          : "";
      throw new ApiError(
        message ||
          `Dashboard request failed (${init.method || "GET"} ${path}): HTTP ${response.status}`,
        response.status,
      );
    }

    if (!payload || typeof payload !== "object") {
      throw new ApiError("Invalid Dashboard response.");
    }
    const envelope = payload as Partial<ApiEnvelope<T>>;
    if (envelope.status === "error") {
      throw new ApiError(envelope.message || "Dashboard request failed.");
    }
    if (envelope.status !== "ok" && envelope.status !== "warning") {
      throw new ApiError("Unexpected Dashboard response status.");
    }
    return {
      status: envelope.status,
      message: envelope.message ?? null,
      data: (envelope.data ?? {}) as T,
    };
  }

  private async fetchRaw(
    path: string,
    init: RequestInit & {
      query?: Record<string, string | number | boolean | null | undefined>;
    } = {},
  ): Promise<Response> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(init.query || {})) {
      if (value === null || value === undefined) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }

    const headers = new Headers(init.headers);
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    try {
      return await fetch(url, {
        ...init,
        headers,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      throw new ApiError(
        `Request failed (${init.method || "GET"} ${url.pathname}): ${messageFromUnknown(error)}`,
      );
    }
  }
}
