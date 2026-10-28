import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useApp, useStdout } from "ink";
import { useTerminalInput } from "./useTerminalInput.js";
import QRCode from "qrcode";
import type { DashboardClient } from "../api/client.js";
import { recoverChatStream } from "../api/chatRun.js";
import { messageFromUnknown } from "../api/errors.js";
import {
  createI18n,
  resolveConfigList,
  resolveConfigText,
  type I18n,
} from "../i18n/index.js";
import {
  applyChatEvent,
  appendPlainPart,
  normalizeChatRecord,
  payloadText,
  textFromParts,
} from "../api/messages.js";
import type {
  AbconfInfo,
  ChatRecord,
  ChatSession,
  CommandItem,
  AstrBotConfigPayload,
  LiveLogPayload,
  PersonaFolder,
  PersonaItem,
  PersonaSavePayload,
  PlatformConfig,
  PlatformQrPayload,
  PlatformRegistrationResult,
  PlatformRuntimeStat,
  PluginComponent,
  PluginConfigPayload,
  PluginConfigSchemaItem,
  PluginDetail,
  PluginItem,
  PluginMarketItem,
  ProviderCheckResult,
  ProviderConfig,
  ProviderSourceConfig,
  ProviderTemplatePayload,
  ProviderTokenStats,
  RuntimeStats,
  TokenRange,
  ToolItem,
  VersionPayload,
} from "../api/types.js";
import {
  sessionTitle,
  truncate,
  wrapText,
} from "./format.js";
import {
  AgentsView,
  buildAgentFields,
  type AgentAction,
  type AgentField,
  type AgentListEntry,
  type AgentPane,
} from "./AgentsView.js";
import {
  ChatSidebar,
  ChatView,
  type MessageRow,
  type SidebarAction,
} from "./ChatView.js";
import {
  CommandsView,
  type ComponentsView,
} from "./CommandsView.js";
import type { ConfigFileAction } from "./ConfigView.js";
import { ConsoleView, buildConsoleLines } from "./ConsoleView.js";
import {
  PlatformsView,
  buildPlatformSettings,
  type PlatformAction,
  type PlatformPane,
  type PlatformSetting,
  type PlatformTemplate,
} from "./PlatformsView.js";
import {
  PluginsView,
  type PluginAction,
  type PluginConfigSetting,
  type PluginDetailAction,
  type PluginPane,
  type PluginTab,
} from "./PluginsView.js";
import {
  ProvidersView,
  PROVIDER_TYPES,
  buildProviderModelEntries,
  buildProviderSourceSettings,
  buildProviderRows,
  buildProviderSources,
  providerConfigValueLabel,
  providerEnabled,
  type AvailableProviderModel,
  type ProviderModelEntry,
  type ProviderModelAction,
  type ProviderPane,
  type ProviderSourceSetting,
  type ProviderSourceAction,
  type ProviderType,
} from "./ProvidersView.js";
import { SplashView } from "./SplashView.js";
import {
  StatusView,
  buildStatusLines,
  statSampleFromStats,
  type StatSample,
} from "./StatusView.js";
import {
  padRightCells,
  terminalWidth,
  truncateCells,
} from "./terminal.js";
import {
  DialogContentLine,
  DialogInputLine,
  DialogTextLine,
  DialogTextarea,
  editableTextAreaLineCount,
  insertAtCursor,
  removeAtCursor,
  wrapDialogText,
  type DialogColor,
} from "./dialogControls.js";
import {
  createPersonaDraft,
  parsePersonaEditableValue,
  personaEditableValue,
  personaSavePayload,
  validatePersonaDraft,
} from "./agents/persona.js";
import {
  useAgentsState,
  useChatState,
  useCommandsState,
  useConfigState,
  usePlatformsState,
  usePluginsState,
  useProvidersState,
  useStatusState,
} from "./appState.js";
import { handleInput, type InputContext } from "./inputHandler.js";
import {
  AGENT_ACTIONS,
  AGENT_EDIT_ACTIONS,
  AVAILABLE_PROVIDER_MODEL_ACTIONS,
  MAIN_VIEWS,
  PLATFORM_REGISTRATION_TYPES,
  PLUGIN_ACTIONS,
  PROVIDER_MODEL_ACTIONS,
  PROVIDER_SOURCE_ROW_ACTIONS,
  TOKEN_RANGES,
  type MainView,
  type PendingMarketInstallWarning,
  type PendingPlatformDelete,
  type PendingProviderDelete,
  type AstrBotConfigSetting,
  type PluginConfigChoice,
  type PluginConfigChoiceDialogState,
  type PluginConfigObjectValueType,
  type PluginConfigTemplateListDialogState,
  type PluginFileDialogState,
  type PluginObjectEditorState,
  type PluginTemplateFieldEditState,
  type PlatformRegistrationFlow,
  type ProviderConfigSetting,
  type ProviderSourceTemplate,
  type ProviderTemplate,
} from "./App.types.js";
import {
  annotateMarketPlugins,
  annotatePluginsWithMarket,
  applyPlatformRegistrationResult,
  asRecord,
  buildAstrBotConfigSettings,
  buildPlatformTemplates,
  buildPluginConfigSettings,
  buildPluginTemplateEntry,
  buildProviderConfigSettings,
  buildProviderSourceTemplates,
  buildProviderTemplates,
  canLoginPlatform,
  centerCells,
  clampScrollOffset,
  filterMarketPlugins,
  inferPluginConfigValueType,
  isPlatformIdValid,
  isPlatformLoggedIn,
  isPluginInstallWarning,
  loadPluginSpecialChoices,
  marketActionLabel,
  marketPluginKey,
  mergeProviderConfigWithTemplate,
  nextMainView,
  nextPluginObjectValueType,
  normalizePluginMarket,
  normalizedPluginConfigType,
  parsePluginConfigEditableValue,
  parsePluginObjectEditorValue,
  parseProviderEditableValue,
  platformActionsFor,
  platformConfigFromTemplate,
  platformRegistrationQrValue,
  pluginChoiceSelected,
  pluginChoiceValueEquals,
  pluginConfigDialogChoices,
  pluginConfigOptionChoices,
  pluginConfigOptionChoicesForI18n,
  pluginConfigSettingIsMultiChoice,
  pluginConfigSpecialProviderSubtype,
  pluginConfigSpecialProviderType,
  pluginConfigSpecialTitle,
  pluginFileConfiguredFiles,
  pluginFileDialogItemCount,
  pluginFileDialogLines,
  pluginFileDisplayName,
  pluginObjectEditorItemCount,
  pluginObjectEditorKeys,
  pluginObjectEditorLines,
  pluginObjectTemplateSchema,
  pluginTemplateDialogItemCount,
  pluginTemplateDialogLines,
  pluginTemplateEntries,
  pluginTemplateEntryFields,
  pluginTemplateOptions,
  providerConfigFromTemplate,
  providerEditableValue,
  providerMetadataContext,
  providerModalitiesFromMetadata,
  providerSourceConfigFromTemplate,
  providerSourceTemplateMeta,
  providerTemplateMeta,
  qrTextLines,
  registrationStatusColor,
  registrationStatusLabel,
  sessionMatchesFilter,
  setConfigValueAtPath,
  togglePluginChoiceValue,
  useTerminalSize,
  viewLabel,
} from "./appHelpers.js";
import {
  AgentFieldDialog,
  MarketSearchDialog,
  PlatformLoginDialog,
  PlatformSettingDialog,
  PlatformTemplateDialog,
  PluginConfigChoiceDialog,
  PluginConfigSettingDialog,
  PluginFileDialog,
  PluginInstallWarningDialog,
  PluginObjectEditorDialog,
  PluginTemplateFieldEditDialog,
  PluginTemplateListDialog,
  ProviderConfigDialog,
  ProviderCreateDialog,
  ProviderSourceCreateDialog,
  ProviderSourceSettingDialog,
} from "./dialogs.js";


import type { Dispatch, SetStateAction } from "react";
import type {
  AgentsState,
  ChatState,
  CommandsState,
  ConfigState,
  PlatformsState,
  PluginsState,
  ProvidersState,
  StatusState,
} from "./appState.js";

export interface ControllerCtx
  extends ChatState,
    StatusState,
    CommandsState,
    PluginsState,
    AgentsState,
    ConfigState,
    PlatformsState,
    ProvidersState {
  client: DashboardClient;
  i18n: I18n;
  exit: () => void;
  columns: number;
  rows: number;
  username?: string;
  serverUrl: string;
  tokenStoreKind: string;
  astrBotConfig: AstrBotConfigPayload | null;
  setAstrBotConfig: Dispatch<SetStateAction<AstrBotConfigPayload | null>>;
  activeView: MainView;
  setActiveView: Dispatch<SetStateAction<MainView>>;
  isBootLoading: boolean;
  setIsBootLoading: Dispatch<SetStateAction<boolean>>;
  setBootStatus: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  [key: string]: any;
}

export function useAppController(ctx: ControllerCtx) {
  const {
    activeView,
    agentEditCursor,
    agentEditValue,
    agentPane,
    astrBotConfig,
    client,
    columns,
    commandSummary,
    commands,
    componentsView,
    consoleScrollOffset,
    editingAgentFieldKey,
    editingPersonaDraft,
    editingPersonaOriginal,
    editingPlatformSettingKey,
    editingPluginConfigSettingKey,
    editingProviderConfig,
    editingProviderConfigSettingKey,
    editingProviderOriginalId,
    editingProviderSourceSettingKey,
    exit,
    i18n,
    input,
    isCreatingPersona,
    isCreatingPlatform,
    isCreatingProvider,
    isCreatingProviderSource,
    isEditingMarketFilter,
    isSending,
    isTogglingCommand,
    isTogglingPlatform,
    isTogglingProvider,
    lastStatsUpdatedAt,
    loadingPluginConfigName,
    loadingPluginDetailName,
    loadingProviderSourceModelsId,
    logs,
    marketDetailScrollOffset,
    marketFilter,
    marketFilterCursor,
    marketPlugins,
    marketStatus,
    messageScrollOffset,
    messages,
    pendingMarketInstallWarning,
    pendingMarketPluginKey,
    pendingPersonaDeleteId,
    pendingPlatformDelete,
    pendingPluginDeleteName,
    pendingProviderDelete,
    personaFolders,
    personaFolderTree,
    personas,
    platformEditCursor,
    platformEditValue,
    platformPane,
    platformRegistration,
    platformStats,
    platforms,
    pluginConfigChoiceDialog,
    pluginConfigEditCursor,
    pluginConfigEditValue,
    pluginConfigTemplateListDialog,
    pluginConfigs,
    pluginDetails,
    pluginFileDialog,
    pluginObjectEditor,
    pluginPane,
    pluginTab,
    pluginTemplateFieldEdit,
    plugins,
    providerConfigEditCursor,
    providerConfigEditValue,
    providerPane,
    providerSourceEditCursor,
    providerSourceEditValue,
    providerSourceModels,
    providerStats,
    providerStatuses,
    providerTemplate,
    providerType,
    rows,
    selectedAgentAction,
    selectedAgentFieldIndex,
    selectedCommandIndex,
    selectedMarketPluginIndex,
    selectedPersonaIndex,
    selectedPlatformAction,
    selectedPlatformIndex,
    selectedPlatformSettingIndex,
    selectedPlatformTemplateIndex,
    selectedPluginAction,
    selectedPluginComponentIndex,
    selectedPluginConfigSettingIndex,
    selectedPluginDetailAction,
    selectedPluginIndex,
    selectedProviderConfigSettingIndex,
    selectedProviderIndex,
    selectedProviderModelAction,
    selectedProviderSourceAction,
    selectedProviderSourceIndex,
    selectedProviderSourceSettingIndex,
    selectedProviderSourceTemplateIndex,
    selectedProviderTemplateIndex,
    selectedSessionId,
    selectedSidebarAction,
    selectedToolIndex,
    serverUrl,
    sessionFilter,
    sessions,
    setActiveView,
    setAgentEditCursor,
    setAgentEditValue,
    setAgentPane,
    setAstrBotConfig,
    setBootStatus,
    setCommandSummary,
    setCommands,
    setComponentsView,
    setConsoleScrollOffset,
    setEditingAgentFieldKey,
    setEditingPersonaDraft,
    setEditingPersonaOriginal,
    setEditingPlatformSettingKey,
    setEditingPluginConfigSettingKey,
    setEditingProviderConfig,
    setEditingProviderConfigSettingKey,
    setEditingProviderOriginalId,
    setEditingProviderSourceSettingKey,
    setInput,
    setIsBootLoading,
    setIsCreatingPersona,
    setIsCreatingPlatform,
    setIsCreatingProvider,
    setIsCreatingProviderSource,
    setIsEditingMarketFilter,
    setIsSending,
    setIsTogglingCommand,
    setIsTogglingPlatform,
    setIsTogglingProvider,
    setLastStatsUpdatedAt,
    setLoadingPluginConfigName,
    setLoadingPluginDetailName,
    setLoadingProviderSourceModelsId,
    setLogs,
    setMarketDetailScrollOffset,
    setMarketFilter,
    setMarketFilterCursor,
    setMarketPlugins,
    setMarketStatus,
    setMessageScrollOffset,
    setMessages,
    setNotice,
    setPendingMarketInstallWarning,
    setPendingMarketPluginKey,
    setPendingPersonaDeleteId,
    setPendingPlatformDelete,
    setPendingPluginDeleteName,
    setPendingProviderDelete,
    setPersonaFolders,
    setPersonaFolderTree,
    setPersonas,
    setPlatformEditCursor,
    setPlatformEditValue,
    setPlatformPane,
    setPlatformRegistration,
    setPlatformStats,
    setPlatforms,
    setPluginConfigChoiceDialog,
    setPluginConfigEditCursor,
    setPluginConfigEditValue,
    setPluginConfigTemplateListDialog,
    setPluginConfigs,
    setPluginDetails,
    setPluginFileDialog,
    setPluginObjectEditor,
    setPluginPane,
    setPluginTab,
    setPluginTemplateFieldEdit,
    setPlugins,
    setProviderConfigEditCursor,
    setProviderConfigEditValue,
    setProviderPane,
    setProviderSourceEditCursor,
    setProviderSourceEditValue,
    setProviderSourceModels,
    setProviderStats,
    setProviderStatuses,
    setProviderTemplate,
    setProviderType,
    setSelectedAgentAction,
    setSelectedAgentFieldIndex,
    setSelectedCommandIndex,
    setSelectedMarketPluginIndex,
    setSelectedPersonaIndex,
    setSelectedPlatformAction,
    setSelectedPlatformIndex,
    setSelectedPlatformSettingIndex,
    setSelectedPlatformTemplateIndex,
    setSelectedPluginAction,
    setSelectedPluginComponentIndex,
    setSelectedPluginConfigSettingIndex,
    setSelectedPluginDetailAction,
    setSelectedPluginIndex,
    setSelectedProviderConfigSettingIndex,
    setSelectedProviderIndex,
    setSelectedProviderModelAction,
    setSelectedProviderSourceAction,
    setSelectedProviderSourceIndex,
    setSelectedProviderSourceSettingIndex,
    setSelectedProviderSourceTemplateIndex,
    setSelectedProviderTemplateIndex,
    setSelectedSessionId,
    setSelectedSidebarAction,
    setSelectedToolIndex,
    setSessionFilter,
    setSessions,
    setStats,
    setStatsHistory,
    setStatusScrollOffset,
    setTestingProviderId,
    setTokenRange,
    setTools,
    setVersion,
    setWorkingMarketPluginName,
    setWorkingPersonaId,
    setWorkingPluginName,
    stats,
    statsHistory,
    statusScrollOffset,
    testingProviderId,
    tokenRange,
    tokenStoreKind,
    tools,
    username,
    version,
    workingMarketPluginName,
    workingPersonaId,
    workingPluginName,
  } = ctx;
  const {
    abconfs,
    configEditCursor,
    configEditValue,
    configFileActionDialog,
    configPane,
    configTab,
    creatingPersonaFolder,
    currentPersonaFolderId,
    editingConfigSettingKey,
    loadingConfig,
    normalConfigPayload,
    pendingConfigDeleteId,
    savingConfig,
    selectedAbconfIndex,
    selectedAgentEntryIndex,
    selectedConfigFileAction,
    selectedConfigGroupIndex,
    selectedConfigSettingIndex,
    setAbconfs,
    setConfigEditCursor,
    setConfigEditValue,
    setConfigFileActionDialog,
    setConfigPane,
    setConfigTab,
    setCreatingPersonaFolder,
    setCurrentPersonaFolderId,
    setEditingConfigSettingKey,
    setLoadingConfig,
    setNormalConfigPayload,
    setPendingConfigDeleteId,
    setSavingConfig,
    setSelectedAbconfIndex,
    setSelectedAgentEntryIndex,
    setSelectedConfigFileAction,
    setSelectedConfigGroupIndex,
    setSelectedConfigSettingIndex,
    setSystemConfigPayload,
    systemConfigPayload,
  } = ctx;
  const abortRef = useRef<AbortController | null>(null);
  const selectedSessionRef = useRef(selectedSessionId);
  selectedSessionRef.current = selectedSessionId;
  const historyRequestRef = useRef(0);
  const sessionListRequestRef = useRef(0);
  const pendingChatDeleteRef = useRef<string | null>(null);
  const historyPageRef = useRef({ page: 1, hasMore: false, loading: false });
  const showChatSidebar = activeView === "chat";

  const layout = useMemo(() => {
    const chatSidebarWidth = Math.min(
      columns < 90 ? 30 : 34,
      Math.max(22, Math.floor(columns * (columns < 90 ? 0.34 : 0.25))),
    );
    const sidebarWidth = showChatSidebar ? chatSidebarWidth : 0;
    const mainWidth = Math.max(20, columns - sidebarWidth);
    const bodyHeight = Math.max(8, rows - (showChatSidebar ? 6 : 3));
    const contentWidth = Math.max(16, mainWidth - 4);
    return { sidebarWidth, mainWidth, bodyHeight, contentWidth };
  }, [columns, rows, showChatSidebar]);

  const filteredSessions = useMemo(
    () => sessions.filter((session) => sessionMatchesFilter(session, sessionFilter)),
    [sessionFilter, sessions],
  );

  const selectedSession = useMemo(
    () =>
      selectedSessionId
        ? sessions.find((session) => session.session_id === selectedSessionId) || null
        : null,
    [selectedSessionId, sessions],
  );

  const selectedFilteredIndex = useMemo(
    () =>
      selectedSessionId
        ? filteredSessions.findIndex((session) => session.session_id === selectedSessionId)
        : -1,
    [filteredSessions, selectedSessionId],
  );

  const applyStats = useCallback((nextStats: RuntimeStats) => {
    setStats(nextStats);
    setStatsHistory((current) => [
      ...current.slice(-47),
      statSampleFromStats(nextStats),
    ]);
  }, []);

  useEffect(() => {
    if (!sessions.length) {
      return;
    }
    if (!filteredSessions.length) {
      if (selectedSessionId) {
        setSelectedSessionId(null);
        setMessages([]);
        setMessageScrollOffset(0);
      }
      return;
    }
    if (!selectedSessionId || selectedFilteredIndex < 0) {
      setSelectedSessionId(filteredSessions[0].session_id);
      setMessageScrollOffset(0);
    }
  }, [filteredSessions, selectedFilteredIndex, selectedSessionId, sessions.length]);

  const loadSessions = useCallback(
    async (preferredSessionId?: string, filterOverride = sessionFilter) => {
      const requestId = ++sessionListRequestRef.current;
      const selectionAtStart = selectedSessionRef.current;
      const nextSessions = await client.getSessions();
      if (requestId !== sessionListRequestRef.current) return null;
      setSessions(nextSessions);
      if (!nextSessions.length) {
        setSelectedSessionId(null);
        setMessages([]);
        setMessageScrollOffset(0);
        return null;
      }

      const nextFilteredSessions = nextSessions.filter((session) =>
        sessionMatchesFilter(session, filterOverride),
      );
      const targetId = selectedSessionRef.current === selectionAtStart
        ? preferredSessionId || selectedSessionRef.current : selectedSessionRef.current;
      const nextSession =
        nextFilteredSessions.find((session) => session.session_id === targetId) ||
        nextFilteredSessions[0] ||
        (filterOverride ? null : nextSessions[0]);

      if (!nextSession) {
        setSelectedSessionId(null);
        setMessages([]);
        setMessageScrollOffset(0);
        return null;
      }

      setSelectedSessionId(nextSession.session_id);
      return nextSession;
    },
    [client, sessionFilter],
  );

  const loadSessionMessages = useCallback(
    async (sessionId: string) => {
      const requestId = ++historyRequestRef.current;
      const payload = await client.getSession(sessionId);
      if (requestId !== historyRequestRef.current || selectedSessionRef.current !== sessionId || abortRef.current) return;
      setMessages((payload.history || []).map(normalizeChatRecord));
      historyPageRef.current = { page: payload.page || 1, hasMore: Boolean(payload.has_more), loading: false };
      setMessageScrollOffset(0);
      return payload;
    },
    [client],
  );

  const refreshStats = useCallback(async () => {
    const results = await Promise.allSettled([
      client.getStats({ offsetSec: tokenRange * 24 * 60 * 60 }),
      client.getProviderTokenStats(tokenRange),
      client.getVersion(),
    ]);
    if (results[0].status === "fulfilled") applyStats(results[0].value);
    if (results[1].status === "fulfilled") setProviderStats(results[1].value);
    if (results[2].status === "fulfilled") setVersion(results[2].value);
    setLastStatsUpdatedAt(new Date());
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }, [applyStats, client, tokenRange]);

  const reloadCommands = useCallback(async () => {
    const payload = await client.getCommands();
    setCommands(payload.items || []);
    setCommandSummary(i18n.t("tui.commands.commandSummary", "{total} total, {disabled} disabled, {conflicts} conflicts", {
      total: payload.summary.total,
      disabled: payload.summary.disabled,
      conflicts: payload.summary.conflicts,
    }));
  }, [client, i18n]);

  const reloadTools = useCallback(async () => {
    const payload = await client.getTools();
    setTools(payload || []);
  }, [client]);

  const reloadPlugins = useCallback(async () => {
    const payload = await client.getPlugins();
    const nextPlugins = annotatePluginsWithMarket(payload || [], marketPlugins);
    setPlugins(nextPlugins);
    if (marketPlugins.length) {
      setMarketPlugins(annotateMarketPlugins(marketPlugins, nextPlugins));
    }
  }, [client, marketPlugins, setMarketPlugins]);

  const reloadPluginMarket = useCallback(async () => {
    if (marketStatus === "loading") {
      return;
    }
    setMarketStatus("loading");
    try {
      const payload = await client.getPluginMarketList();
      const normalizedMarket = normalizePluginMarket(payload);
      const nextMarketPlugins = annotateMarketPlugins(normalizedMarket, plugins);
      setMarketPlugins(nextMarketPlugins);
      if (plugins.length) {
        setPlugins(annotatePluginsWithMarket(plugins, nextMarketPlugins));
      }
      setMarketStatus("loaded");
      setNotice(i18n.t("tui.plugins.marketLoaded", "Loaded market plugins."));
    } catch (error) {
      setMarketStatus("error");
      setNotice(messageFromUnknown(error));
    }
  }, [
    client,
    i18n,
    marketStatus,
    plugins,
    setMarketPlugins,
    setMarketStatus,
    setNotice,
    setPlugins,
  ]);

  const reloadPersonas = useCallback(async (folderId = currentPersonaFolderId) => {
    const normalizedFolderId = folderId || "";
    const [foldersPayload, personasPayload, treePayload] = await Promise.all([
      client.getPersonaFolders(normalizedFolderId),
      client.getPersonas(normalizedFolderId),
      client.getPersonaFolderTree().catch(() => personaFolderTree),
    ]);
    setPersonaFolders(foldersPayload || []);
    setPersonas(personasPayload || []);
    setPersonaFolderTree(treePayload || []);
    return personasPayload || [];
  }, [
    client,
    currentPersonaFolderId,
    personaFolderTree,
    setPersonaFolders,
    setPersonaFolderTree,
  ]);

  const loadConfigList = useCallback(async (preferredId?: string) => {
    const list = await client.getAbconfs();
    setAbconfs(list);
    if (!list.length) {
      setSelectedAbconfIndex(0);
      return null;
    }
    const nextIndex = Math.max(
      0,
      preferredId
        ? list.findIndex((item) => item.id === preferredId)
        : selectedAbconfIndex,
    );
    const clampedIndex = Math.min(nextIndex, list.length - 1);
    setSelectedAbconfIndex(clampedIndex);
    return list[clampedIndex] || null;
  }, [client, selectedAbconfIndex, setAbconfs, setSelectedAbconfIndex]);

  const loadNormalConfig = useCallback(async (config?: AbconfInfo | null) => {
    const target = config || abconfs[selectedAbconfIndex] || null;
    if (!target?.id) {
      setNormalConfigPayload(null);
      return null;
    }
    setLoadingConfig(true);
    try {
      const payload = await client.getAbconf(target.id);
      setNormalConfigPayload(payload);
      setSelectedConfigSettingIndex(0);
      setNotice(i18n.t("tui.config.loaded", "Loaded config {name}.", {
        name: target.name || target.id,
      }));
      return payload;
    } finally {
      setLoadingConfig(false);
    }
  }, [
    abconfs,
    client,
    i18n,
    selectedAbconfIndex,
    setLoadingConfig,
    setNormalConfigPayload,
    setSelectedConfigSettingIndex,
  ]);

  const loadSystemConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const payload = await client.getAbconf(undefined, { systemConfig: true });
      setSystemConfigPayload(payload);
      setSelectedConfigSettingIndex(0);
      setNotice(i18n.t("tui.config.loadedSystem", "Loaded system config."));
      return payload;
    } finally {
      setLoadingConfig(false);
    }
  }, [client, i18n, setLoadingConfig, setSelectedConfigSettingIndex, setSystemConfigPayload]);

  const reloadConfigs = useCallback(async () => {
    const selectedConfig = await loadConfigList();
    if (selectedConfig) {
      await loadNormalConfig(selectedConfig);
    }
    await loadSystemConfig();
  }, [loadConfigList, loadNormalConfig, loadSystemConfig]);

  const reloadProviders = useCallback(async () => {
    const payload = await client.getProviderTemplate();
    setProviderTemplate({
      ...payload,
      providers: payload.providers || [],
      provider_sources: payload.provider_sources || [],
    });
  }, [client]);

  const reloadPlatformStats = useCallback(async () => {
    const payload = await client.getPlatformStats();
    const statsById: Record<string, PlatformRuntimeStat> = {};
    for (const stat of payload.platforms || []) {
      if (stat.id) {
        statsById[stat.id] = stat;
      }
    }
    setPlatformStats(statsById);
  }, [client]);

  const reloadPlatforms = useCallback(async () => {
    const [configPayload, platformPayload, statsPayload] = await Promise.all([
      client.getAstrBotConfig(),
      client.getPlatforms(),
      client.getPlatformStats().catch(() => ({ platforms: [] })),
    ]);
    const nextPlatforms =
      platformPayload.platforms ||
      configPayload.config?.platform ||
      [];
    const statsById: Record<string, PlatformRuntimeStat> = {};
    for (const stat of statsPayload.platforms || []) {
      if (stat.id) {
        statsById[stat.id] = stat;
      }
    }
    setAstrBotConfig(configPayload);
    setPlatforms(nextPlatforms);
    setPlatformStats(statsById);
  }, [client]);

  const refreshAll = useCallback(async () => {
    try {
      setBootStatus(i18n.t("tui.boot.loadingData", "Loading AstrBot Dashboard data..."));
      const sections = ["Chat", "Stats", "Commands", "Tools", "Plugins", "Personas", "Config", "Providers", "Platforms"];
      const results = await Promise.allSettled([
        loadSessions(selectedSessionRef.current || undefined), refreshStats(), reloadCommands(), reloadTools(),
        reloadPlugins(), reloadPersonas(), reloadConfigs(), reloadProviders(), reloadPlatforms(),
      ]);
      const errors = results.flatMap((result, index) => result.status === "rejected" ? [`${sections[index]}: ${messageFromUnknown(result.reason)}`] : []);
      setNotice(errors.length ? errors.join(" | ") : i18n.t("tui.boot.refreshed", "Refreshed."));
    } catch (error) {
      setNotice(messageFromUnknown(error));
      setBootStatus(messageFromUnknown(error));
    } finally {
      setIsBootLoading(false);
    }
  }, [
    loadSessionMessages,
    loadSessions,
    refreshStats,
    reloadCommands,
    reloadConfigs,
    reloadPersonas,
    reloadPlugins,
    reloadProviders,
    reloadPlatforms,
    reloadTools,
    i18n,
    selectedSession?.session_id,
  ]);

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    const sessionId = selectedSession?.session_id;
    setIsSending(false);
    setMessages([]);
    historyPageRef.current = { page: 1, hasMore: false, loading: false };
    pendingChatDeleteRef.current = null;
    if (!sessionId) return;
    let canceled = false;
    const abort = new AbortController();
    const load = async () => {
      const payload = await loadSessionMessages(sessionId);
      if (!payload || canceled || selectedSessionRef.current !== sessionId || abortRef.current) return;
      const run = payload.active_runs?.[0];
      if (!run?.run_id) return;
      const localId = `active-run-${run.run_id}`;
      setMessages((current) => [...current, { local_id: localId, content: { type: "bot", message: [], isLoading: true } }]);
      setIsSending(true);
      abortRef.current = abort;
      setNotice(i18n.t("tui.chat.resuming", "Reconnecting to the running response..."));
      let streamFailed = false;
      try {
        for await (const event of recoverChatStream(client, sessionId, client.resumeChatRun(run.run_id, { signal: abort.signal }), abort.signal, { runId: run.run_id })) {
          if (canceled) break;
          if ((event.type || event.t) === "error") {
            streamFailed = true;
            setNotice(payloadText(event.data));
          }
          setMessages((current) => current.map((record) => record.local_id === localId ? applyChatEvent(record, event) : record));
        }
        if (!canceled && !abort.signal.aborted && !streamFailed) setNotice(i18n.t("tui.chat.responseComplete", "Response complete."));
      } catch (error) {
        streamFailed = true;
        throw error;
      } finally {
        if (abortRef.current === abort) {
          abortRef.current = null;
          setIsSending(false);
          if (!canceled && !streamFailed) await loadSessionMessages(sessionId);
        }
      }
    };
    void load().catch((error) => { if (!canceled) setNotice(messageFromUnknown(error)); });
    return () => {
      canceled = true;
      abort.abort();
      // Leaving a chat detaches its subscriber. Generation continues on the server.
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [loadSessionMessages, selectedSession?.session_id]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshStats()
        .catch((error) => setNotice(messageFromUnknown(error)));
    }, 8000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  useEffect(() => {
    if (activeView !== "status") {
      return;
    }
    void refreshStats().catch((error) => setNotice(messageFromUnknown(error)));
  }, [activeView, refreshStats]);

  useEffect(() => {
    const abort = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const scheduleReconnect = (error: unknown) => {
      if (abort.signal.aborted) {
        return;
      }
      setNotice(i18n.t("tui.console.reconnecting", "Live logs disconnected ({error}), reconnecting…", {
        error: messageFromUnknown(error),
      }));
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempts, 5));
      attempts += 1;
      reconnectTimer = setTimeout(() => {
        void connect();
      }, delay);
    };

    const connect = async () => {
      try {
        for await (const log of client.liveLogs({ signal: abort.signal })) {
          if (attempts > 0) {
            setNotice(i18n.t("tui.console.reconnected", "Live logs reconnected."));
            attempts = 0;
          }
          setLogs((current) => [...current.slice(-119), log]);
        }
        // Stream ended without error (server closed); retry.
        scheduleReconnect(new Error("terminated"));
      } catch (error) {
        if (!abort.signal.aborted) {
          scheduleReconnect(error);
        }
      }
    };

    void connect();
    return () => {
      abort.abort();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [client]);

  useEffect(() => {
    if (activeView !== "commands") {
      return;
    }
    if (componentsView === "commands" && !commands.length) {
      void reloadCommands()
        .catch((error) => setNotice(messageFromUnknown(error)));
    }
    if (componentsView === "tools" && !tools.length) {
      void reloadTools()
        .catch((error) => setNotice(messageFromUnknown(error)));
    }
  }, [
    activeView,
    commands.length,
    componentsView,
    reloadCommands,
    reloadTools,
    tools.length,
  ]);

  useEffect(() => {
    if (activeView !== "plugins" || plugins.length) {
      return;
    }
    void reloadPlugins()
      .catch((error) => setNotice(messageFromUnknown(error)));
  }, [activeView, plugins.length, reloadPlugins]);

  useEffect(() => {
    if (activeView !== "plugins" || pluginTab !== "market" || marketStatus === "loaded" || marketStatus === "loading") {
      return;
    }
    void reloadPluginMarket();
  }, [activeView, marketStatus, pluginTab, reloadPluginMarket]);

  useEffect(() => {
    if (activeView !== "agents" || personas.length) {
      return;
    }
    void reloadPersonas()
      .catch((error) => setNotice(messageFromUnknown(error)));
  }, [activeView, personas.length, reloadPersonas]);

  useEffect(() => {
    if (activeView !== "config") {
      return;
    }
    if (!abconfs.length && !normalConfigPayload && !systemConfigPayload) {
      void reloadConfigs()
        .catch((error) => setNotice(messageFromUnknown(error)));
      return;
    }
    if (configTab === "system" && !systemConfigPayload) {
      void loadSystemConfig()
        .catch((error) => setNotice(messageFromUnknown(error)));
    }
    if (configTab === "normal" && abconfs.length && !normalConfigPayload) {
      void loadNormalConfig()
        .catch((error) => setNotice(messageFromUnknown(error)));
    }
  }, [
    abconfs.length,
    activeView,
    configTab,
    loadNormalConfig,
    loadSystemConfig,
    normalConfigPayload,
    reloadConfigs,
    systemConfigPayload,
  ]);

  useEffect(() => {
    if (activeView !== "providers" || providerTemplate) {
      return;
    }
    void reloadProviders()
      .catch((error) => setNotice(messageFromUnknown(error)));
  }, [activeView, providerTemplate, reloadProviders]);

  useEffect(() => {
    if (activeView !== "platforms" || astrBotConfig) {
      return;
    }
    void reloadPlatforms()
      .catch((error) => setNotice(messageFromUnknown(error)));
  }, [activeView, astrBotConfig, reloadPlatforms]);

  useEffect(() => {
    if (activeView !== "platforms") {
      return undefined;
    }
    void reloadPlatformStats().catch(() => undefined);
    const timer = setInterval(() => {
      void reloadPlatformStats().catch(() => undefined);
    }, 5000);
    return () => {
      clearInterval(timer);
    };
  }, [activeView, reloadPlatformStats]);

  useEffect(() => {
    setSelectedCommandIndex((current) =>
      Math.min(current, Math.max(0, commands.length - 1)),
    );
  }, [commands.length]);

  useEffect(() => {
    setSelectedToolIndex((current) =>
      Math.min(current, Math.max(0, tools.length - 1)),
    );
  }, [tools.length]);

  useEffect(() => {
    setSelectedPluginIndex((current) =>
      Math.min(current, Math.max(0, plugins.length - 1)),
    );
  }, [plugins.length]);

  useEffect(() => {
    setSelectedPersonaIndex((current) =>
      Math.min(current, Math.max(0, personas.length - 1)),
    );
  }, [personas.length]);

  const selectedPlugin = plugins[selectedPluginIndex] || null;
  const filteredMarketPlugins = useMemo(
    () => filterMarketPlugins(marketPlugins, marketFilter),
    [marketFilter, marketPlugins],
  );
  useEffect(() => {
    setSelectedMarketPluginIndex((current) =>
      Math.min(current, Math.max(0, filteredMarketPlugins.length - 1)),
    );
  }, [filteredMarketPlugins.length]);

  const selectedMarketPlugin = filteredMarketPlugins[selectedMarketPluginIndex] || null;
  const selectedPluginDetail = selectedPlugin
    ? pluginDetails[selectedPlugin.name] || null
    : null;
  const selectedPluginComponents = selectedPluginDetail?.components || [];
  const selectedPluginConfig = selectedPlugin
    ? pluginConfigs[selectedPlugin.name] || null
    : null;
  const selectedPluginConfigSettings = useMemo(
    () => buildPluginConfigSettings(selectedPluginConfig, selectedPlugin?.name),
    [selectedPluginConfig, selectedPlugin?.name],
  );
  const selectedPluginConfigSetting =
    selectedPluginConfigSettings[selectedPluginConfigSettingIndex] || null;

  const selectedAbconf = abconfs[selectedAbconfIndex] || null;
  const selectedConfigPayload =
    configTab === "system" ? systemConfigPayload : normalConfigPayload;
  const selectedConfigSettings = useMemo(
    () => buildAstrBotConfigSettings(selectedConfigPayload, i18n),
    [i18n, selectedConfigPayload],
  );
  const selectedConfigGroups = useMemo(
    () => selectedConfigSettings.filter((setting) => setting.isGroup && setting.groupKey),
    [selectedConfigSettings],
  );
  const clampedConfigGroupIndex = Math.min(
    selectedConfigGroupIndex,
    Math.max(0, selectedConfigGroups.length - 1),
  );
  const selectedConfigGroup = selectedConfigGroups[clampedConfigGroupIndex] || null;
  const selectedConfigGroupSettings = useMemo(
    () =>
      selectedConfigGroup
        ? selectedConfigSettings.filter(
            (setting) =>
              setting.groupKey === selectedConfigGroup.groupKey &&
              setting.id !== selectedConfigGroup.id,
          )
        : selectedConfigSettings.filter((setting) => !setting.isGroup),
    [selectedConfigGroup, selectedConfigSettings],
  );
  const selectedConfigSettingCandidate = selectedConfigSettings[selectedConfigSettingIndex] || null;
  const selectedConfigSetting =
    selectedConfigSettingCandidate?.isGroup || selectedConfigSettingCandidate?.isSection
      ? selectedConfigGroupSettings.find((setting) => !setting.isGroup && !setting.isSection) || null
      : selectedConfigSettingCandidate || selectedConfigGroupSettings.find((setting) => !setting.isGroup && !setting.isSection) || null;
  const isEditingPersona = Boolean(editingPersonaDraft);
  const currentPersonaFolder = useMemo(
    () => findPersonaFolderInTree(personaFolderTree, currentPersonaFolderId),
    [currentPersonaFolderId, personaFolderTree],
  );
  const currentPersonaFolderPathItems = useMemo(
    () => personaFolderPath(personaFolderTree, currentPersonaFolderId),
    [currentPersonaFolderId, personaFolderTree],
  );
  const parentPersonaFolderId =
    currentPersonaFolderPathItems.length > 1
      ? currentPersonaFolderPathItems[currentPersonaFolderPathItems.length - 2]?.folder_id || null
      : null;
  const agentEntries = useMemo<AgentListEntry[]>(() => {
    const entries: AgentListEntry[] = [];
    if (currentPersonaFolderId) {
      entries.push({
        type: "up",
        id: "..",
        label: i18n.t("tui.agents.folder.up", ".."),
      });
    }
    for (const folder of personaFolders) {
      entries.push({ type: "folder", id: folder.folder_id, folder });
    }
    personas.forEach((persona, personaIndex) => {
      entries.push({
        type: "persona",
        id: persona.persona_id,
        persona,
        personaIndex,
      });
    });
    return entries;
  }, [currentPersonaFolderId, i18n, personaFolders, personas]);
  const selectedAgentEntry = agentEntries[selectedAgentEntryIndex] || null;
  const selectedPersonaIndexFromEntry =
    selectedAgentEntry?.type === "persona" ? selectedAgentEntry.personaIndex : -1;
  const selectedPersona = editingPersonaDraft ||
    (selectedAgentEntry?.type === "persona" ? selectedAgentEntry.persona : null);
  const selectedAgentActions = isEditingPersona ? AGENT_EDIT_ACTIONS : AGENT_ACTIONS;
  const agentFields = useMemo(
    () => buildAgentFields(selectedPersona, isCreatingPersona, i18n),
    [i18n, isCreatingPersona, selectedPersona],
  );
  const selectedAgentField = agentFields[selectedAgentFieldIndex] || null;

  useEffect(() => {
    if (selectedPersonaIndexFromEntry >= 0) {
      setSelectedPersonaIndex(selectedPersonaIndexFromEntry);
    }
  }, [selectedPersonaIndexFromEntry, setSelectedPersonaIndex]);

  useEffect(() => {
    setSelectedAgentEntryIndex((current) =>
      Math.min(current, Math.max(0, agentEntries.length - 1)),
    );
  }, [agentEntries.length, setSelectedAgentEntryIndex]);

  useEffect(() => {
    setSelectedAbconfIndex((current) =>
      Math.min(current, Math.max(0, abconfs.length - 1)),
    );
  }, [abconfs.length, setSelectedAbconfIndex]);

  useEffect(() => {
    if (selectedAgentAction === "new" || selectedAgentAction === "newFolder") {
      return;
    }
    if (!selectedAgentActions.includes(selectedAgentAction)) {
      setSelectedAgentAction(selectedAgentActions[0] || "delete");
    }
  }, [selectedAgentAction, selectedAgentActions]);

  useEffect(() => {
    setSelectedAgentFieldIndex((current) =>
      Math.min(current, Math.max(0, agentFields.length - 1)),
    );
  }, [agentFields.length]);

  useEffect(() => {
    setSelectedPluginComponentIndex(0);
    setSelectedPluginConfigSettingIndex(0);
  }, [selectedPlugin?.name]);

  useEffect(() => {
    setMarketDetailScrollOffset(0);
  }, [selectedMarketPlugin?.name, selectedMarketPlugin?.repo]);

  useEffect(() => {
    setSelectedPluginComponentIndex((current) =>
      Math.min(current, Math.max(0, selectedPluginComponents.length - 1)),
    );
  }, [selectedPluginComponents.length]);

  useEffect(() => {
    setSelectedPluginConfigSettingIndex((current) =>
      Math.min(current, Math.max(0, selectedPluginConfigSettings.length - 1)),
    );
  }, [selectedPluginConfigSettings.length]);

  useEffect(() => {
    setSelectedConfigSettingIndex((current) =>
      selectedConfigSettings.some(
        (setting) =>
          !setting.isGroup &&
          !setting.isSection &&
          selectedConfigSettings.indexOf(setting) === current,
      )
        ? current
        : Math.max(
            0,
            selectedConfigSettings.findIndex((setting) => !setting.isGroup && !setting.isSection),
          ),
    );
  }, [selectedConfigSettings.length, setSelectedConfigSettingIndex]);

  useEffect(() => {
    setSelectedConfigGroupIndex((current) =>
      Math.min(current, Math.max(0, selectedConfigGroups.length - 1)),
    );
  }, [selectedConfigGroups.length, setSelectedConfigGroupIndex]);

  useEffect(() => {
    setSelectedPlatformIndex((current) =>
      Math.min(current, Math.max(0, platforms.length - 1)),
    );
  }, [platforms.length]);

  const providerRows = useMemo(
    () => buildProviderRows(providerTemplate, providerType),
    [providerTemplate, providerType],
  );
  const providerSources = useMemo(
    () => buildProviderSources(providerTemplate, providerType),
    [providerTemplate, providerType],
  );
  const providerSourceTemplates = useMemo(
    () => buildProviderSourceTemplates(providerTemplate, providerType),
    [providerTemplate, providerType],
  );
  const providerTemplates = useMemo(
    () => buildProviderTemplates(providerTemplate, providerType),
    [providerTemplate, providerType],
  );
  const providerUsesSourceLayout = providerType === "chat_completion";

  useEffect(() => {
    setSelectedProviderSourceTemplateIndex((current) =>
      Math.min(current, Math.max(0, providerSourceTemplates.length - 1)),
    );
  }, [providerSourceTemplates.length]);

  useEffect(() => {
    setSelectedProviderTemplateIndex((current) =>
      Math.min(current, Math.max(0, providerTemplates.length - 1)),
    );
  }, [providerTemplates.length]);

  useEffect(() => {
    if (!providerUsesSourceLayout && (providerPane === "sources" || providerPane === "settings")) {
      setProviderPane("models");
    }
  }, [providerPane, providerUsesSourceLayout]);

  useEffect(() => {
    if (providerUsesSourceLayout && selectedProviderModelAction === "new") {
      setSelectedProviderModelAction("switch");
    }
  }, [providerUsesSourceLayout, selectedProviderModelAction]);

  const defaultProviderModelAction = useCallback((
    entry: ProviderModelEntry | null | undefined,
  ): ProviderModelAction => {
    if (entry?.type === "available") {
      return "add";
    }
    return "switch";
  }, []);

  useEffect(() => {
    if (providerPane !== "tabs") {
      return;
    }
    setSelectedProviderModelAction(
      "switch",
    );
  }, [providerPane, providerType]);

  useEffect(() => {
    setSelectedProviderSourceIndex((current) =>
      Math.min(current, Math.max(0, providerSources.length - 1)),
    );
  }, [providerSources.length]);

  const selectedProviderSource = providerSources[selectedProviderSourceIndex] || null;
  const providerSourceSettings = useMemo(
    () =>
      selectedProviderSource
        ? buildProviderSourceSettings(selectedProviderSource)
        : [],
    [selectedProviderSource],
  );
  const selectedProviderSourceSetting =
    providerSourceSettings[selectedProviderSourceSettingIndex] || null;

  useEffect(() => {
    setSelectedProviderSourceSettingIndex((current) =>
      Math.min(current, Math.max(0, providerSourceSettings.length - 1)),
    );
  }, [providerSourceSettings.length]);

  const sourceProviderRows = useMemo(
    () =>
      selectedProviderSource
        ? providerRows.filter(
            (row) => row.provider.provider_source_id === selectedProviderSource.id,
          )
        : providerRows,
    [providerRows, selectedProviderSource],
  );
  const selectedProviderRows = providerUsesSourceLayout ? sourceProviderRows : providerRows;
  const selectedAvailableProviderModels = useMemo(
    () =>
      selectedProviderSource
        ? providerSourceModels[selectedProviderSource.id] || []
        : [],
    [providerSourceModels, selectedProviderSource],
  );
  const selectedProviderEntries = useMemo(
    () =>
      providerUsesSourceLayout
        ? buildProviderModelEntries(
            selectedProviderRows,
            selectedAvailableProviderModels,
            selectedProviderSource?.id,
          )
        : buildProviderModelEntries(selectedProviderRows, []),
    [
      providerUsesSourceLayout,
      selectedAvailableProviderModels,
      selectedProviderRows,
      selectedProviderSource?.id,
    ],
  );
  const selectedProviderEntry = selectedProviderEntries[selectedProviderIndex] || null;
  const defaultProviderListAction = useCallback((): ProviderModelAction => {
    if (!providerUsesSourceLayout && selectedProviderEntries.length === 0) {
      return "new";
    }
    return defaultProviderModelAction(selectedProviderEntry);
  }, [
    defaultProviderModelAction,
    providerUsesSourceLayout,
    selectedProviderEntries.length,
    selectedProviderEntry,
  ]);
  const providerConfigSettings = useMemo(
    () => buildProviderConfigSettings(editingProviderConfig, providerTemplate, i18n),
    [editingProviderConfig, providerTemplate, i18n],
  );
  const selectedProviderConfigSetting =
    providerConfigSettings[selectedProviderConfigSettingIndex] || null;

  useEffect(() => {
    setSelectedProviderIndex((current) =>
      Math.min(current, Math.max(0, selectedProviderEntries.length - 1)),
    );
  }, [selectedProviderEntries.length]);

  useEffect(() => {
    const selectedEntry = selectedProviderEntries[selectedProviderIndex];
    if (selectedEntry?.type === "available") {
      setSelectedProviderModelAction("add");
    } else if (selectedProviderModelAction === "add") {
      setSelectedProviderModelAction(defaultProviderModelAction(selectedEntry));
    }
  }, [
    defaultProviderModelAction,
    selectedProviderEntries,
    selectedProviderIndex,
    selectedProviderModelAction,
  ]);

  useEffect(() => {
    setSelectedProviderConfigSettingIndex((current) =>
      Math.min(current, Math.max(0, providerConfigSettings.length - 1)),
    );
  }, [providerConfigSettings.length]);

  const platformTemplates = useMemo(
    () => buildPlatformTemplates(astrBotConfig),
    [astrBotConfig],
  );
  const selectedPlatform = platforms[selectedPlatformIndex] || null;
  const selectedPlatformActions = useMemo(
    () => platformActionsFor(selectedPlatform),
    [selectedPlatform],
  );

  useEffect(() => {
    if (selectedPlatformAction === "new") {
      return;
    }
    if (!selectedPlatformActions.includes(selectedPlatformAction)) {
      setSelectedPlatformAction("switch");
    }
  }, [selectedPlatformAction, selectedPlatformActions]);

  const selectedPlatformSettings = useMemo(
    () => buildPlatformSettings(selectedPlatform, i18n),
    [i18n, selectedPlatform],
  );
  const selectedPlatformSetting =
    selectedPlatformSettings[selectedPlatformSettingIndex] || null;

  useEffect(() => {
    setSelectedPlatformTemplateIndex((current) =>
      Math.min(current, Math.max(0, platformTemplates.length - 1)),
    );
  }, [platformTemplates.length]);

  useEffect(() => {
    setSelectedPlatformSettingIndex((current) =>
      Math.min(current, Math.max(0, selectedPlatformSettings.length - 1)),
    );
  }, [selectedPlatformSettings.length]);

  const createSession = useCallback(async () => {
    try {
      const session = await client.newSession();
      setSessionFilter("");
      setSelectedSidebarAction(null);
      setActiveView("chat");
      await loadSessions(session.session_id, "");
      setNotice(i18n.t("tui.chat.createdSession", "Created a new WebChat session."));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    }
  }, [client, loadSessionMessages, loadSessions]);

  const toggleSelectedCommand = useCallback(async () => {
    const command = commands[selectedCommandIndex];
    if (!command || isTogglingCommand) {
      return;
    }

    const enabled = !command.enabled;
    setIsTogglingCommand(true);
    setCommands((current) =>
      current.map((item, index) =>
        index === selectedCommandIndex ? { ...item, enabled } : item,
      ),
    );
    try {
      await client.toggleCommand(command.handler_full_name, enabled);
      await reloadCommands();
      setNotice(enabled
        ? i18n.t("tui.commands.commandEnabled", "Command enabled.")
        : i18n.t("tui.commands.commandDisabled", "Command disabled."));
    } catch (error) {
      setCommands((current) =>
        current.map((item, index) =>
          index === selectedCommandIndex
            ? { ...item, enabled: command.enabled }
            : item,
        ),
      );
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingCommand(false);
    }
  }, [
    client,
    commands,
    isTogglingCommand,
    reloadCommands,
    selectedCommandIndex,
  ]);

  const toggleSelectedTool = useCallback(async () => {
    const tool = tools[selectedToolIndex];
    if (!tool || tool.readonly || isTogglingCommand) {
      return;
    }

    const active = !tool.active;
    setIsTogglingCommand(true);
    setTools((current) =>
      current.map((item, index) =>
        index === selectedToolIndex ? { ...item, active } : item,
      ),
    );
    try {
      await client.toggleTool(tool.name, active);
      await reloadTools();
      setNotice(active
        ? i18n.t("tui.commands.toolEnabled", "Tool enabled.")
        : i18n.t("tui.commands.toolDisabled", "Tool disabled."));
    } catch (error) {
      setTools((current) =>
        current.map((item, index) =>
          index === selectedToolIndex ? { ...item, active: tool.active } : item,
        ),
      );
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingCommand(false);
    }
  }, [
    client,
    isTogglingCommand,
    reloadTools,
    selectedToolIndex,
    tools,
  ]);

  const fetchSelectedPluginDetail = useCallback(async () => {
    const plugin = selectedPlugin;
    if (!plugin || loadingPluginDetailName || workingPluginName) {
      return;
    }
    if (pluginDetails[plugin.name]) {
      return;
    }

    setLoadingPluginDetailName(plugin.name);
    setNotice(i18n.t("tui.plugins.loadingDetail", "Loading plugin {name} details...", {
      name: plugin.name,
    }));
    try {
      const detail = await client.getPluginDetail(plugin.name);
      setPluginDetails((current) => ({ ...current, [plugin.name]: detail }));
      setSelectedPluginComponentIndex(0);
      setNotice(i18n.t("tui.plugins.loadedDetail", "Loaded plugin {name}.", {
        name: plugin.name,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setLoadingPluginDetailName(null);
    }
  }, [
    client,
    i18n,
    loadingPluginDetailName,
    pluginDetails,
    selectedPlugin,
    workingPluginName,
  ]);

  const fetchSelectedPluginConfig = useCallback(async () => {
    const plugin = selectedPlugin;
    if (!plugin || loadingPluginConfigName || workingPluginName) {
      return;
    }
    if (pluginConfigs[plugin.name]) {
      return;
    }

    setLoadingPluginConfigName(plugin.name);
    setNotice(i18n.t("tui.plugins.loadingConfig", "Loading plugin {name} config...", {
      name: plugin.name,
    }));
    try {
      const config = await client.getPluginConfig(plugin.name);
      setPluginConfigs((current) => ({ ...current, [plugin.name]: config }));
      setSelectedPluginConfigSettingIndex(0);
      setNotice(i18n.t("tui.plugins.loadedConfig", "Loaded plugin {name} config.", {
        name: plugin.name,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setLoadingPluginConfigName(null);
    }
  }, [
    client,
    i18n,
    loadingPluginConfigName,
    pluginConfigs,
    selectedPlugin,
    workingPluginName,
  ]);

  const toggleSelectedPlugin = useCallback(async () => {
    const plugin = selectedPlugin;
    if (!plugin || workingPluginName) {
      return;
    }
    const activated = plugin.activated === false;
    setWorkingPluginName(plugin.name);
    setPendingPluginDeleteName(null);
    setPlugins((current) =>
      current.map((item) =>
        item.name === plugin.name ? { ...item, activated } : item,
      ),
    );
    try {
      await client.togglePlugin(plugin.name, activated);
      await reloadPlugins();
      setNotice(activated
        ? i18n.t("tui.plugins.enabled", "Plugin enabled.")
        : i18n.t("tui.plugins.disabled", "Plugin disabled."));
    } catch (error) {
      setPlugins((current) =>
        current.map((item) =>
          item.name === plugin.name ? { ...item, activated: plugin.activated } : item,
        ),
      );
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPluginName(null);
    }
  }, [client, reloadPlugins, selectedPlugin, workingPluginName]);

  const reloadSelectedPlugin = useCallback(async () => {
    const plugin = selectedPlugin;
    if (!plugin || workingPluginName) {
      return;
    }
    setWorkingPluginName(plugin.name);
    setPendingPluginDeleteName(null);
    setNotice(i18n.t("tui.plugins.reloading", "Reloading plugin {name}...", {
      name: plugin.name,
    }));
    try {
      await client.reloadPlugin(plugin.name);
      setPluginDetails((current) => {
        const next = { ...current };
        delete next[plugin.name];
        return next;
      });
      setPluginConfigs((current) => {
        const next = { ...current };
        delete next[plugin.name];
        return next;
      });
      await reloadPlugins();
      setNotice(i18n.t("tui.plugins.reloaded", "Reloaded plugin {name}.", {
        name: plugin.name,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPluginName(null);
    }
  }, [client, reloadPlugins, selectedPlugin, workingPluginName]);

  const updateSelectedPlugin = useCallback(async () => {
    const plugin = selectedPlugin;
    if (!plugin || workingPluginName) {
      return;
    }
    setWorkingPluginName(plugin.name);
    setPendingPluginDeleteName(null);
    setNotice(i18n.t("tui.plugins.updating", "Updating plugin {name}...", {
      name: plugin.name,
    }));
    try {
      await client.updatePlugin(plugin.name, {
        downloadUrl: String(plugin.update_download_url || ""),
      });
      setPluginDetails((current) => {
        const next = { ...current };
        delete next[plugin.name];
        return next;
      });
      setPluginConfigs((current) => {
        const next = { ...current };
        delete next[plugin.name];
        return next;
      });
      await reloadPlugins();
      setNotice(i18n.t("tui.plugins.updated", "Updated plugin {name}.", {
        name: plugin.name,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPluginName(null);
    }
  }, [client, reloadPlugins, selectedPlugin, workingPluginName]);

  const uninstallSelectedPlugin = useCallback(async () => {
    const plugin = selectedPlugin;
    if (!plugin || workingPluginName) {
      return;
    }
    if (plugin.reserved) {
      setNotice(i18n.t("tui.plugins.systemCannotUninstall", "{name} is a system plugin and cannot be uninstalled.", {
        name: plugin.name,
      }));
      return;
    }
    if (pendingPluginDeleteName !== plugin.name) {
      setPendingPluginDeleteName(plugin.name);
      setNotice(i18n.t("tui.plugins.confirmUninstall", "Press Enter again to uninstall plugin {name}.", {
        name: plugin.name,
      }));
      return;
    }

    setWorkingPluginName(plugin.name);
    try {
      await client.uninstallPlugin(plugin.name);
      setPendingPluginDeleteName(null);
      setPluginDetails((current) => {
        const next = { ...current };
        delete next[plugin.name];
        return next;
      });
      setPluginConfigs((current) => {
        const next = { ...current };
        delete next[plugin.name];
        return next;
      });
      setSelectedPluginIndex(0);
      setSelectedPluginComponentIndex(0);
      setPluginPane("list");
      await reloadPlugins();
      setNotice(i18n.t("tui.plugins.uninstalled", "Uninstalled plugin {name}.", {
        name: plugin.name,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPluginName(null);
    }
  }, [
    client,
    pendingPluginDeleteName,
    reloadPlugins,
    selectedPlugin,
    workingPluginName,
  ]);

  const executeSelectedPluginAction = useCallback(async () => {
    if (selectedPluginAction === "switch") {
      await toggleSelectedPlugin();
      return;
    }
    await uninstallSelectedPlugin();
  }, [
    selectedPluginAction,
    toggleSelectedPlugin,
    uninstallSelectedPlugin,
  ]);

  const executeSelectedPluginDetailAction = useCallback(async () => {
    if (selectedPluginDetailAction === "reload") {
      await reloadSelectedPlugin();
      return;
    }
    await updateSelectedPlugin();
  }, [
    reloadSelectedPlugin,
    selectedPluginDetailAction,
    updateSelectedPlugin,
  ]);

  const beginCreatePersona = useCallback(() => {
    if (isEditingPersona || workingPersonaId) {
      return;
    }
    const draft = {
      ...createPersonaDraft(personas),
      folder_id: currentPersonaFolderId,
    };
    setPersonas((current) => [...current, draft]);
    setSelectedPersonaIndex(personas.length);
    setSelectedAgentEntryIndex(agentEntries.length);
    setEditingPersonaDraft(draft);
    setEditingPersonaOriginal(null);
    setIsCreatingPersona(true);
    setAgentPane("fields");
    setSelectedAgentAction("save");
    setSelectedAgentFieldIndex(0);
    setNotice(i18n.t("features.persona.dialog.create.title", "Create New Persona"));
  }, [
    agentEntries.length,
    currentPersonaFolderId,
    i18n,
    isEditingPersona,
    personas,
    setSelectedAgentEntryIndex,
    workingPersonaId,
  ]);

  const beginEditSelectedPersona = useCallback(async () => {
    const persona =
      selectedAgentEntry?.type === "persona" ? selectedAgentEntry.persona : null;
    if (!persona || isEditingPersona || workingPersonaId) {
      return;
    }

    setWorkingPersonaId(persona.persona_id);
    setNotice(i18n.t("tui.agents.loadingDetail", "Loading persona {id}...", {
      id: persona.persona_id,
    }));
    try {
      const detail = await client.getPersonaDetail(persona.persona_id);
      const draft = { ...persona, ...detail };
      setEditingPersonaDraft(draft);
      setEditingPersonaOriginal(draft);
      setIsCreatingPersona(false);
      setAgentPane("fields");
      setSelectedAgentAction("save");
      setSelectedAgentFieldIndex(0);
      setNotice(i18n.t("features.persona.dialog.edit.title", "Edit Persona"));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPersonaId(null);
    }
  }, [
    client,
    isEditingPersona,
    selectedAgentEntry,
    workingPersonaId,
  ]);

  const cancelPersonaEdit = useCallback(() => {
    if (!isEditingPersona) {
      return;
    }
    const draftId = editingPersonaDraft?.persona_id;
    if (isCreatingPersona && draftId) {
      setPersonas((current) =>
        current.filter((persona, index) =>
          index !== selectedPersonaIndex || persona.persona_id !== draftId,
        ),
      );
      setSelectedPersonaIndex((current) => Math.max(0, current - 1));
    }
    setEditingPersonaDraft(null);
    if (!isCreatingPersona && editingPersonaOriginal) {
      setPersonas((current) =>
        current.map((persona, index) =>
          index === selectedPersonaIndex ||
          persona.persona_id === editingPersonaOriginal.persona_id
            ? editingPersonaOriginal
            : persona,
        ),
      );
    }
    setEditingPersonaOriginal(null);
    setIsCreatingPersona(false);
    setEditingAgentFieldKey(null);
    setAgentEditValue("");
    setAgentEditCursor(0);
    setAgentPane("list");
    setSelectedAgentAction("delete");
    setNotice(i18n.t("tui.pluginConfig.editCanceled", "Edit canceled."));
  }, [
    editingPersonaDraft?.persona_id,
    editingPersonaOriginal,
    isCreatingPersona,
    isEditingPersona,
    selectedPersonaIndex,
  ]);

  const applyAgentFieldValue = useCallback((
    field: AgentField,
    nextValue: unknown,
  ) => {
    const source = editingPersonaDraft || selectedPersona;
    if (!source) {
      return;
    }
    const previousId = source.persona_id;
    const nextDraft = {
      ...source,
      [field.key]: nextValue,
    };
    if (field.key === "persona_id") {
      nextDraft.persona_id = String(nextValue);
    }
    setEditingPersonaDraft(nextDraft);
    setPersonas((items) =>
      items.map((item, index) =>
        index === selectedPersonaIndexFromEntry || item.persona_id === previousId
          ? { ...item, ...nextDraft }
          : item,
      ),
    );
  }, [editingPersonaDraft, selectedPersona, selectedPersonaIndexFromEntry]);

  const beginEditAgentField = useCallback(() => {
    const field = selectedAgentField;
    const persona = editingPersonaDraft || selectedPersona;
    if (!field || !persona || editingAgentFieldKey) {
      return;
    }
    if (!field.editable) {
      setNotice(i18n.t("tui.agents.footer.readonly", "{key} is read-only.", {
        key: field.label,
      }));
      return;
    }
    if (!editingPersonaDraft) {
      setEditingPersonaDraft(persona);
      setEditingPersonaOriginal(persona);
      setIsCreatingPersona(false);
      setSelectedAgentAction("save");
    }
    const nextValue = personaEditableValue(field.key, field.value);
    setEditingAgentFieldKey(field.key);
    setAgentEditValue(nextValue);
    setAgentEditCursor(Array.from(nextValue).length);
    setNotice(i18n.t("tui.agents.footer.editing", "Editing {key}. Enter saves, Esc cancels.", {
      key: field.label,
    }));
  }, [
    editingAgentFieldKey,
    editingPersonaDraft,
    selectedAgentField,
    selectedPersona,
  ]);

  const cancelEditAgentField = useCallback(() => {
    if (!editingAgentFieldKey) {
      return;
    }
    setEditingAgentFieldKey(null);
    setAgentEditValue("");
    setAgentEditCursor(0);
    setNotice(i18n.t("tui.pluginConfig.fieldEditCanceled", "Field edit canceled."));
  }, [editingAgentFieldKey]);

  const saveAgentField = useCallback(() => {
    const field = selectedAgentField;
    if (!field || !editingAgentFieldKey) {
      return;
    }
    try {
      const nextValue = parsePersonaEditableValue(
        editingAgentFieldKey,
        agentEditValue,
        field.value,
      );
      if (
        editingAgentFieldKey === "begin_dialogs" &&
        Array.isArray(nextValue) &&
        nextValue.length % 2 !== 0
      ) {
        setNotice(i18n.t("features.persona.form.presetDialogsHelp", "The number of dialogs must be even."));
        return;
      }
      applyAgentFieldValue(field, nextValue);
      setEditingAgentFieldKey(null);
      setAgentEditValue("");
      setAgentEditCursor(0);
      setNotice(i18n.t("tui.common.updated", "Updated {name}.", {
        name: field.label,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    }
  }, [
    agentEditValue,
    applyAgentFieldValue,
    editingAgentFieldKey,
    selectedAgentField,
  ]);

  const savePersonaDraft = useCallback(async () => {
    const draft = editingPersonaDraft;
    if (!draft || workingPersonaId) {
      return;
    }
    const validation = validatePersonaDraft(
      draft,
      personas,
      selectedPersonaIndex,
      isCreatingPersona,
      i18n,
    );
    if (validation) {
      setNotice(validation);
      return;
    }

    const payload = personaSavePayload(draft);
    setWorkingPersonaId(draft.persona_id);
    try {
      const result = isCreatingPersona
        ? await client.createPersona(payload)
        : await client.updatePersona(payload);
      const nextPersonas = await reloadPersonas();
      const nextId = result.persona?.persona_id || payload.persona_id;
      const nextIndex = nextPersonas.findIndex((persona) => persona.persona_id === nextId);
      setSelectedPersonaIndex(Math.max(0, nextIndex));
      const offset = currentPersonaFolderId ? 1 : 0;
      setSelectedAgentEntryIndex(Math.max(0, offset + personaFolders.length + nextIndex));
      setEditingPersonaDraft(null);
      setEditingPersonaOriginal(null);
      setIsCreatingPersona(false);
      setEditingAgentFieldKey(null);
      setAgentPane("list");
      setSelectedAgentAction("delete");
      setNotice(result.message || i18n.t("features.persona.messages.saveSuccess", "Saved successfully"));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPersonaId(null);
    }
  }, [
    client,
    editingPersonaDraft,
    i18n,
    isCreatingPersona,
    personas,
    currentPersonaFolderId,
    personaFolders.length,
    reloadPersonas,
    selectedPersonaIndex,
    setSelectedAgentEntryIndex,
    workingPersonaId,
  ]);

  const deleteSelectedPersona = useCallback(async () => {
    const persona =
      selectedAgentEntry?.type === "persona" ? selectedAgentEntry.persona : null;
    if (!persona || isEditingPersona || workingPersonaId) {
      return;
    }
    if (pendingPersonaDeleteId !== persona.persona_id) {
      setPendingPersonaDeleteId(persona.persona_id);
      setNotice(i18n.t("tui.agents.confirmDelete", "Press Enter again to delete persona {id}.", {
        id: persona.persona_id,
      }));
      return;
    }

    setWorkingPersonaId(persona.persona_id);
    try {
      await client.deletePersona(persona.persona_id);
      const nextPersonas = await reloadPersonas();
      setSelectedAgentEntryIndex((current) =>
        Math.min(current, Math.max(0, personaFolders.length + nextPersonas.length - 1)),
      );
      setPendingPersonaDeleteId(null);
      setAgentPane("list");
      setSelectedAgentAction("delete");
      setNotice(i18n.t("features.persona.messages.deleteSuccess", "Deleted successfully"));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPersonaId(null);
    }
  }, [
    client,
    i18n,
    isEditingPersona,
    pendingPersonaDeleteId,
    personaFolders.length,
    reloadPersonas,
    selectedAgentEntry,
    setSelectedAgentEntryIndex,
    workingPersonaId,
  ]);

  const executeSelectedAgentAction = useCallback(async () => {
    if (selectedAgentAction === "new") {
      beginCreatePersona();
      return;
    }
    if (selectedAgentAction === "newFolder") {
      setCreatingPersonaFolder({
        mode: "folder",
        name: "",
        cursor: 0,
      });
      return;
    }
    if (selectedAgentAction === "save") {
      await savePersonaDraft();
      return;
    }
    if (selectedAgentAction === "cancel") {
      cancelPersonaEdit();
      return;
    }
    if (selectedAgentEntry?.type === "up") {
      setCurrentPersonaFolderId(parentPersonaFolderId);
      setSelectedAgentEntryIndex(0);
      setSelectedPersonaIndex(0);
      await reloadPersonas(parentPersonaFolderId);
      return;
    }
    if (selectedAgentEntry?.type === "folder") {
      setCurrentPersonaFolderId(selectedAgentEntry.folder.folder_id);
      setSelectedAgentEntryIndex(0);
      setSelectedPersonaIndex(0);
      await reloadPersonas(selectedAgentEntry.folder.folder_id);
      return;
    }
    await deleteSelectedPersona();
  }, [
    beginCreatePersona,
    cancelPersonaEdit,
    deleteSelectedPersona,
    parentPersonaFolderId,
    reloadPersonas,
    savePersonaDraft,
    selectedAgentAction,
    selectedAgentEntry,
    setCreatingPersonaFolder,
    setCurrentPersonaFolderId,
    setSelectedAgentEntryIndex,
  ]);

  const applyPluginConfigSettingValue = useCallback(async (
    setting: PluginConfigSetting,
    value: unknown,
  ) => {
    const plugin = selectedPlugin;
    const pluginConfig = plugin ? pluginConfigs[plugin.name] : null;
    if (!plugin || !pluginConfig || workingPluginName) {
      return;
    }
    const currentConfig = pluginConfig.config || {};
    const nextConfig = setConfigValueAtPath(currentConfig, setting.path, value);
    const nextPayload = {
      ...pluginConfig,
      config: nextConfig,
    };

    setWorkingPluginName(plugin.name);
    setPluginConfigs((current) => ({
      ...current,
      [plugin.name]: nextPayload,
    }));
    try {
      await client.updatePluginConfig(plugin.name, nextConfig);
      setPluginDetails((current) => {
        const next = { ...current };
        delete next[plugin.name];
        return next;
      });
      await reloadPlugins();
      setNotice(i18n.t("tui.common.updated", "Updated {name}.", {
        name: setting.label || setting.key,
      }));
    } catch (error) {
      setPluginConfigs((current) => ({
        ...current,
        [plugin.name]: pluginConfig,
      }));
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPluginName(null);
    }
  }, [
    client,
    pluginConfigs,
    reloadPlugins,
    selectedPlugin,
    workingPluginName,
  ]);

  const applyConfigSettingValue = useCallback(async (
    setting: AstrBotConfigSetting,
    value: unknown,
  ) => {
    const payload = selectedConfigPayload;
    const config = asRecord(payload?.config);
    const confId = configTab === "system" ? "default" : selectedAbconf?.id;
    if (!payload || !config || !confId || savingConfig) {
      return;
    }
    const nextConfig = setConfigValueAtPath(config, setting.path, value);
    const nextPayload = {
      ...payload,
      config: nextConfig,
    };
    setSavingConfig(true);
    if (configTab === "system") {
      setSystemConfigPayload(nextPayload);
    } else {
      setNormalConfigPayload(nextPayload);
    }
    try {
      await client.updateAstrBotConfig(nextConfig, confId);
      setNotice(i18n.t("tui.common.updated", "Updated {name}.", {
        name: setting.label || setting.key,
      }));
    } catch (error) {
      if (configTab === "system") {
        setSystemConfigPayload(payload);
      } else {
        setNormalConfigPayload(payload);
      }
      setNotice(messageFromUnknown(error));
    } finally {
      setSavingConfig(false);
    }
  }, [
    client,
    configTab,
    i18n,
    savingConfig,
    selectedAbconf?.id,
    selectedConfigPayload,
    setNormalConfigPayload,
    setSavingConfig,
    setSystemConfigPayload,
  ]);

  const applyPluginTemplateListValue = useCallback(async (
    setting: PluginConfigSetting,
    value: unknown[],
  ) => {
    await applyPluginConfigSettingValue(setting, value);
  }, [applyPluginConfigSettingValue]);

  const openPluginConfigChoices = useCallback(async (
    setting: PluginConfigSetting,
    state: Omit<PluginConfigChoiceDialogState, "selectedIndex" | "selectedValues" | "loading"> & {
      loading?: boolean;
    },
  ) => {
    const selectedValues = Array.isArray(setting.value) ? setting.value : [setting.value];
    const selectedIndex = Math.max(
      0,
      state.choices.findIndex((choice) =>
        selectedValues.some((value) => pluginChoiceValueEquals(value, choice.value)),
      ),
    );
    setPluginConfigChoiceDialog({
      ...state,
      setting,
      selectedIndex,
      selectedValues,
      loading: Boolean(state.loading),
    });
  }, []);

  const openPluginTemplateList = useCallback((setting: PluginConfigSetting) => {
    setPluginConfigTemplateListDialog({
      setting,
      mode: "entries",
      selectedIndex: 0,
      entryIndex: 0,
    });
  }, []);

  const openPluginObjectEditor = useCallback((
    setting: PluginConfigSetting,
    applyValue?: (value: unknown) => void | Promise<void>,
  ) => {
    const keys = pluginObjectEditorKeys(setting);
    setPluginObjectEditor({
      setting,
      selectedIndex: 0,
      editingKey: null,
      keyValue: keys[0] || "",
      keyCursor: Array.from(keys[0] || "").length,
      valueValue: keys[0] ? providerEditableValue(asRecord(setting.value)?.[keys[0]]) : "",
      valueCursor: keys[0]
        ? Array.from(providerEditableValue(asRecord(setting.value)?.[keys[0]])).length
        : 0,
      newValueType: "string",
      applyValue,
    });
  }, []);

  const openPluginFileDialog = useCallback(async (setting: PluginConfigSetting) => {
    const plugin = selectedPlugin;
    if (!plugin) {
      return;
    }
    setPluginFileDialog({
      setting,
      selectedIndex: 0,
      loading: true,
      files: [],
    });
    try {
      const payload = await client.getPluginConfigFiles(
        plugin.name,
        setting.path.join(".") || setting.key,
      );
      setPluginFileDialog((current) =>
        current?.setting.id === setting.id
          ? {
              ...current,
              loading: false,
              files: Array.from(new Set(payload.files || [])),
            }
          : current,
      );
    } catch (error) {
      setPluginFileDialog((current) =>
        current?.setting.id === setting.id
          ? { ...current, loading: false, files: [] }
          : current,
      );
      setNotice(messageFromUnknown(error));
    }
  }, [client, selectedPlugin]);

  const updatePluginTemplateListDialogValue = useCallback(async (
    dialog: PluginConfigTemplateListDialogState,
    value: unknown[],
  ) => {
    await applyPluginTemplateListValue(dialog.setting, value);
    setPluginConfigTemplateListDialog((current) =>
      current
        ? {
            ...current,
            setting: {
              ...current.setting,
              value,
            },
            selectedIndex: Math.min(current.selectedIndex, pluginTemplateEntries(value).length),
          }
        : current,
    );
  }, [applyPluginTemplateListValue]);

  const savePluginTemplateField = useCallback(async (
    templateSetting: PluginConfigSetting,
    entryIndex: number,
    field: PluginConfigSetting,
    value: unknown,
  ) => {
    const entries = pluginTemplateEntries(templateSetting.value);
    const nextEntries = entries.map((entry, index) =>
      index === entryIndex
        ? setConfigValueAtPath(entry, field.path, value)
        : entry,
    );
    await applyPluginTemplateListValue(templateSetting, nextEntries);
    setPluginConfigTemplateListDialog((current) =>
      current?.setting.id === templateSetting.id
        ? {
            ...current,
            setting: {
              ...current.setting,
              value: nextEntries,
            },
          }
        : current,
    );
  }, [applyPluginTemplateListValue]);

  const loadPluginTemplateSpecialChoices = useCallback(async (
    field: PluginConfigSetting,
    applyValue: (value: unknown) => void | Promise<void>,
  ) => {
    const special = String(field.schema?._special || "");
    const providerType = pluginConfigSpecialProviderType(special);
    const providerSubtype = pluginConfigSpecialProviderSubtype(special);
    const multi = pluginConfigSettingIsMultiChoice(field);
    setPluginConfigChoiceDialog({
      setting: field,
      choices: [],
      selectedIndex: 0,
      selectedValues: Array.isArray(field.value) ? field.value : [field.value],
      multi,
      loading: true,
      title: pluginConfigSpecialTitle(special, i18n),
      applyValue,
    });
    try {
      const choices = await loadPluginSpecialChoices({
        client,
        special,
        providerType,
        providerSubtype,
        fallback: field.value,
        plugins,
        i18n,
      });
      setPluginConfigChoiceDialog((current) =>
        current?.setting.id === field.id
          ? {
              ...current,
              choices,
              selectedIndex: Math.max(
                0,
                choices.findIndex((choice) =>
                  current.selectedValues.some((value) =>
                    pluginChoiceValueEquals(value, choice.value),
                  ),
                ),
              ),
              loading: false,
            }
          : current,
      );
    } catch (error) {
      setPluginConfigChoiceDialog((current) =>
        current?.setting.id === field.id
          ? {
              ...current,
              choices: [{ label: messageFromUnknown(error), value: field.value }],
              selectedIndex: 0,
              loading: false,
            }
          : current,
      );
      setNotice(messageFromUnknown(error));
    }
  }, [client, i18n, plugins]);

  const openPluginTemplateField = useCallback((
    templateSetting: PluginConfigSetting,
    entryIndex: number,
    field: PluginConfigSetting,
  ) => {
    const type = normalizedPluginConfigType(field.schema, field.value);
    if (!field.editable) {
      setNotice(i18n.t("tui.pluginConfig.isConfigGroup", "{name} is a config group.", {
        name: field.label || field.key,
      }));
      return;
    }
    if (type === "bool") {
      void savePluginTemplateField(templateSetting, entryIndex, field, !Boolean(field.value));
      return;
    }
    if (type === "file") {
      void openPluginFileDialog({
        ...field,
        id: `${templateSetting.id}:${entryIndex}:${field.id}`,
      });
      return;
    }
    if (type === "dict" || (type === "object" && !field.isGroup)) {
      openPluginObjectEditor({
        ...field,
        id: `${templateSetting.id}:${entryIndex}:${field.id}`,
      }, async (value: unknown) => {
        await savePluginTemplateField(templateSetting, entryIndex, field, value);
      });
      return;
    }
    if (field.schema?._special) {
      const applyValue = async (value: unknown) => {
        await savePluginTemplateField(templateSetting, entryIndex, field, value);
      };
      void loadPluginTemplateSpecialChoices(field, applyValue);
      return;
    }
    if (field.schema?.options?.length) {
      void openPluginConfigChoices(field, {
        setting: field,
        choices: pluginConfigOptionChoices(field),
        multi: pluginConfigSettingIsMultiChoice(field),
        title: i18n.t("tui.pluginConfig.optionsTitle", "{name} Options", {
          name: field.label || field.key,
        }),
        applyValue: async (value: unknown) => {
          await savePluginTemplateField(templateSetting, entryIndex, field, value);
        },
      });
      return;
    }
    const nextValue = providerEditableValue(field.value);
    setPluginTemplateFieldEdit({
      templateSetting,
      entryIndex,
      field,
      value: nextValue,
      cursor: Array.from(nextValue).length,
    });
  }, [
    loadPluginTemplateSpecialChoices,
    openPluginConfigChoices,
    openPluginFileDialog,
    openPluginObjectEditor,
    savePluginTemplateField,
  ]);

  const savePluginTemplateFieldEdit = useCallback(async () => {
    const edit = pluginTemplateFieldEdit;
    if (!edit || workingPluginName) {
      return;
    }
    const parsed = parsePluginConfigEditableValue(
      edit.value,
      edit.field.value,
      edit.field.schema,
    );
    await savePluginTemplateField(
      edit.templateSetting,
      edit.entryIndex,
      edit.field,
      parsed,
    );
    setPluginTemplateFieldEdit(null);
    setNotice(i18n.t("tui.common.updated", "Updated {name}.", {
      name: edit.field.label || edit.field.key,
    }));
  }, [pluginTemplateFieldEdit, savePluginTemplateField, workingPluginName]);

  const executePluginTemplateListDialog = useCallback(async () => {
    const dialog = pluginConfigTemplateListDialog;
    if (!dialog || workingPluginName) {
      return;
    }
    const entries = pluginTemplateEntries(dialog.setting.value);
    if (dialog.mode === "entries") {
      if (dialog.selectedIndex === 0) {
        setPluginConfigTemplateListDialog((current) =>
          current ? { ...current, mode: "templates", selectedIndex: 0 } : current,
        );
        return;
      }
      const entryIndex = dialog.selectedIndex - 1;
      if (entries[entryIndex]) {
        setPluginConfigTemplateListDialog((current) =>
          current
            ? {
                ...current,
                mode: "fields",
                entryIndex,
                selectedIndex: 0,
              }
            : current,
        );
      }
      return;
    }

    if (dialog.mode === "templates") {
      const templates = pluginTemplateOptions(dialog.setting);
      const template = templates[dialog.selectedIndex];
      if (!template) {
        return;
      }
      const nextEntry = buildPluginTemplateEntry(template.key, template.schema);
      const nextEntries = [...entries, nextEntry];
      await updatePluginTemplateListDialogValue(dialog, nextEntries);
      setPluginConfigTemplateListDialog((current) =>
        current
          ? {
              ...current,
              mode: "fields",
              entryIndex: nextEntries.length - 1,
              selectedIndex: 0,
            }
          : current,
      );
      return;
    }

    const entry = entries[dialog.entryIndex];
    const fields = pluginTemplateEntryFields(dialog.setting, entry, dialog.entryIndex);
    if (dialog.selectedIndex === 0) {
      const nextEntries = entries.filter((_, index) => index !== dialog.entryIndex);
      await updatePluginTemplateListDialogValue(dialog, nextEntries);
      setPluginConfigTemplateListDialog((current) =>
        current
          ? {
              ...current,
              mode: "entries",
              selectedIndex: Math.min(dialog.entryIndex + 1, nextEntries.length),
              entryIndex: 0,
            }
          : current,
      );
      return;
    }
    const field = fields[dialog.selectedIndex - 1];
    if (field) {
      openPluginTemplateField(dialog.setting, dialog.entryIndex, field);
    }
  }, [
    openPluginTemplateField,
    pluginConfigTemplateListDialog,
    updatePluginTemplateListDialogValue,
    workingPluginName,
  ]);

  const applyPluginObjectEditorValue = useCallback(async (
    editor: PluginObjectEditorState,
    value: Record<string, unknown>,
  ) => {
    if (editor.applyValue) {
      await editor.applyValue(value);
    } else {
      await applyPluginConfigSettingValue(editor.setting, value);
    }
    setPluginObjectEditor((current) =>
      current?.setting.id === editor.setting.id
        ? {
            ...current,
            setting: {
              ...current.setting,
              value,
            },
            selectedIndex: Math.min(current.selectedIndex, pluginObjectEditorItemCount({
              ...current,
              setting: { ...current.setting, value },
            }) - 1),
          }
        : current,
    );
  }, [applyPluginConfigSettingValue]);

  const executePluginObjectEditorAction = useCallback(() => {
    const editor = pluginObjectEditor;
    if (!editor || workingPluginName) {
      return;
    }
    const keys = pluginObjectEditorKeys(editor.setting);
    if (editor.selectedIndex === 0) {
      setPluginObjectEditor((current) =>
        current
          ? {
              ...current,
              editingKey: "__new__",
              keyValue: "",
              keyCursor: 0,
              valueValue: "",
              valueCursor: 0,
            }
          : current,
      );
      return;
    }
    if (editor.selectedIndex >= 1 && editor.selectedIndex % 2 === 1) {
      const keyName = keys[Math.floor((editor.selectedIndex - 1) / 2)];
      if (!keyName) {
        return;
      }
      const currentObject = { ...(asRecord(editor.setting.value) || {}) };
      delete currentObject[keyName];
      void applyPluginObjectEditorValue(editor, currentObject);
      setPluginObjectEditor((current) =>
        current
          ? {
              ...current,
              selectedIndex: Math.min(
                current.selectedIndex,
                Math.max(0, pluginObjectEditorItemCount({
                  ...current,
                  setting: { ...current.setting, value: currentObject },
                }) - 1),
              ),
            }
          : current,
      );
      setNotice(i18n.t("tui.pluginConfig.deletedKey", "Deleted {name}.", {
        name: keyName,
      }));
      return;
    }
    const keyName = keys[Math.floor((editor.selectedIndex - 2) / 2)];
    if (!keyName) {
      return;
    }
    setPluginObjectEditor((current) =>
      current
        ? {
            ...current,
            editingKey: "__value__",
            keyValue: keyName,
            keyCursor: Array.from(keyName).length,
            valueValue: providerEditableValue(asRecord(current.setting.value)?.[keyName]),
            valueCursor: Array.from(providerEditableValue(asRecord(current.setting.value)?.[keyName])).length,
          }
        : current,
    );
  }, [pluginObjectEditor, workingPluginName]);

  const savePluginObjectEditorField = useCallback(async () => {
    const editor = pluginObjectEditor;
    if (!editor || !editor.editingKey || workingPluginName) {
      return;
    }
    const keyName = editor.keyValue.trim();
    if (!keyName) {
      setNotice(i18n.t("tui.pluginConfig.keyRequired", "Key is required."));
      return;
    }
    const currentObject = { ...(asRecord(editor.setting.value) || {}) };
    const oldKey = editor.editingKey === "__new__"
      ? ""
      : pluginObjectEditorKeys(editor.setting)[Math.floor((editor.selectedIndex - 2) / 2)] || keyName;
    if (oldKey && oldKey !== keyName) {
      delete currentObject[oldKey];
    }
    currentObject[keyName] =
      editor.editingKey === "__new__"
        ? parsePluginObjectEditorValue(editor.valueValue, editor.newValueType)
        : parsePluginConfigEditableValue(
            editor.valueValue,
            currentObject[keyName],
            pluginObjectTemplateSchema(editor.setting, keyName),
          );
    await applyPluginObjectEditorValue(editor, currentObject);
    setPluginObjectEditor((current) =>
      current
        ? {
            ...current,
            editingKey: null,
              selectedIndex: Math.max(2, pluginObjectEditorKeys({
                ...current.setting,
                value: currentObject,
              }).indexOf(keyName) * 2 + 2),
          }
        : current,
    );
    setNotice(i18n.t("tui.common.updated", "Updated {name}.", {
      name: keyName,
    }));
  }, [
    applyPluginObjectEditorValue,
    pluginObjectEditor,
    workingPluginName,
  ]);

  const applyPluginFileDialogSelection = useCallback(async (
    dialog: PluginFileDialogState,
    value: string[],
  ) => {
    await applyPluginConfigSettingValue(dialog.setting, value);
    setPluginFileDialog((current) =>
      current?.setting.id === dialog.setting.id
        ? {
            ...current,
            setting: {
              ...current.setting,
              value,
            },
            selectedIndex: Math.min(current.selectedIndex, pluginFileDialogItemCount({
              ...current,
              setting: { ...current.setting, value },
            }) - 1),
          }
        : current,
    );
  }, [applyPluginConfigSettingValue]);

  const executePluginFileDialogAction = useCallback(async () => {
    const dialog = pluginFileDialog;
    const plugin = selectedPlugin;
    if (!dialog || !plugin || dialog.loading || workingPluginName) {
      return;
    }
    const lines = pluginFileDialogLines(dialog);
    const line = lines[dialog.selectedIndex];
    if (!line) {
      return;
    }
    const configuredFiles = pluginFileConfiguredFiles(dialog.setting.value);
    if (line.action === "close") {
      setPluginFileDialog(null);
      return;
    }
    if (line.action === "add" && line.path) {
      const next = configuredFiles.includes(line.path)
        ? configuredFiles
        : [...configuredFiles, line.path];
      await applyPluginFileDialogSelection(dialog, next);
      setNotice(i18n.t("tui.pluginConfig.addedFile", "Added {name}.", {
        name: pluginFileDisplayName(line.path),
      }));
      return;
    }
    if (line.action === "remove" && line.path) {
      const next = configuredFiles.filter((item) => item !== line.path);
      await applyPluginFileDialogSelection(dialog, next);
      try {
        await client.deletePluginConfigFile(plugin.name, line.path);
      } catch (error) {
        setNotice(messageFromUnknown(error));
        return;
      }
      setNotice(i18n.t("tui.pluginConfig.removedFile", "Removed {name}.", {
        name: pluginFileDisplayName(line.path),
      }));
    }
  }, [
    applyPluginFileDialogSelection,
    client,
    pluginFileDialog,
    selectedPlugin,
    workingPluginName,
  ]);

  const loadPluginConfigSpecialChoices = useCallback(async (
    setting: PluginConfigSetting,
  ) => {
    const special = String(setting.schema?._special || "");
    const providerType = pluginConfigSpecialProviderType(special);
    const providerSubtype = pluginConfigSpecialProviderSubtype(special);
    const multi = pluginConfigSettingIsMultiChoice(setting);
    setPluginConfigChoiceDialog({
      setting,
      choices: [],
      selectedIndex: 0,
      selectedValues: Array.isArray(setting.value) ? setting.value : [setting.value],
      multi,
      loading: true,
      title: pluginConfigSpecialTitle(special, i18n),
    });
    try {
      const choices = await loadPluginSpecialChoices({
        client,
        special,
        providerType,
        providerSubtype,
        fallback: setting.value,
        plugins,
        i18n,
      });
      setPluginConfigChoiceDialog((current) =>
        current?.setting.id === setting.id
          ? {
              ...current,
              choices,
              selectedIndex: Math.max(
                0,
                choices.findIndex((choice) =>
                  current.selectedValues.some((value) =>
                    pluginChoiceValueEquals(value, choice.value),
                  ),
                ),
              ),
              loading: false,
            }
          : current,
      );
    } catch (error) {
      setPluginConfigChoiceDialog((current) =>
        current?.setting.id === setting.id
          ? {
              ...current,
              choices: [{ label: messageFromUnknown(error), value: setting.value }],
              selectedIndex: 0,
              loading: false,
            }
          : current,
      );
      setNotice(messageFromUnknown(error));
    }
  }, [client, i18n, plugins]);

  const loadConfigSpecialChoices = useCallback(async (
    setting: AstrBotConfigSetting,
  ) => {
    const special = String(setting.schema?._special || "");
    const providerType = pluginConfigSpecialProviderType(special);
    const providerSubtype = pluginConfigSpecialProviderSubtype(special);
    const multi = pluginConfigSettingIsMultiChoice(setting);
    setPluginConfigChoiceDialog({
      setting,
      choices: [],
      selectedIndex: 0,
      selectedValues: Array.isArray(setting.value) ? setting.value : [setting.value],
      multi,
      loading: true,
      title: pluginConfigSpecialTitle(special, i18n),
      applyValue: (value) => applyConfigSettingValue(setting, value),
    });
    try {
      const choices = await loadPluginSpecialChoices({
        client,
        special,
        providerType,
        providerSubtype,
        fallback: setting.value,
        plugins,
        i18n,
      });
      setPluginConfigChoiceDialog((current) =>
        current?.setting.id === setting.id
          ? {
              ...current,
              choices,
              selectedIndex: Math.max(
                0,
                choices.findIndex((choice) =>
                  current.selectedValues.some((value) =>
                    pluginChoiceValueEquals(value, choice.value),
                  ),
                ),
              ),
              loading: false,
            }
          : current,
      );
    } catch (error) {
      setPluginConfigChoiceDialog((current) =>
        current?.setting.id === setting.id
          ? {
              ...current,
              choices: [{ label: messageFromUnknown(error), value: setting.value }],
              selectedIndex: 0,
              loading: false,
            }
          : current,
      );
      setNotice(messageFromUnknown(error));
    }
  }, [applyConfigSettingValue, client, i18n, plugins]);

  const beginEditPluginConfigSetting = useCallback(() => {
    const setting = selectedPluginConfigSetting;
    if (!setting || editingPluginConfigSettingKey) {
      return;
    }
    if (!setting.editable) {
      setNotice(i18n.t("tui.pluginConfig.isConfigGroup", "{name} is a config group.", {
        name: setting.label || setting.key,
      }));
      return;
    }
    const schemaType = normalizedPluginConfigType(setting.schema, setting.value);
    if (schemaType === "bool") {
      void applyPluginConfigSettingValue(setting, !Boolean(setting.value));
      return;
    }
    if (schemaType === "template_list") {
      openPluginTemplateList(setting);
      return;
    }
    if (schemaType === "file") {
      void openPluginFileDialog(setting);
      return;
    }
    if (schemaType === "dict" || (schemaType === "object" && !setting.isGroup)) {
      openPluginObjectEditor(setting);
      return;
    }
    if (setting.schema?._special) {
      void loadPluginConfigSpecialChoices(setting);
      return;
    }
    if (setting.schema?.options?.length) {
      void openPluginConfigChoices(setting, {
        setting,
        choices: pluginConfigOptionChoicesForI18n(setting, i18n),
        multi: pluginConfigSettingIsMultiChoice(setting),
        title: i18n.t("tui.pluginConfig.optionsTitle", "{name} Options", {
          name: setting.label || setting.key,
        }),
      });
      return;
    }
    const nextValue = providerEditableValue(setting.value);
    setEditingPluginConfigSettingKey(setting.id);
    setPluginConfigEditValue(nextValue);
    setPluginConfigEditCursor(Array.from(nextValue).length);
    setNotice(i18n.t("tui.pluginConfig.editing", "Editing {name}. Enter saves, Esc cancels.", {
      name: setting.label || setting.key,
    }));
  }, [
    applyPluginConfigSettingValue,
    editingPluginConfigSettingKey,
    loadPluginConfigSpecialChoices,
    openPluginConfigChoices,
    openPluginFileDialog,
    openPluginObjectEditor,
    openPluginTemplateList,
    selectedPluginConfigSetting,
  ]);

  const beginEditConfigSetting = useCallback(() => {
    const setting = selectedConfigSetting;
    if (!setting || editingConfigSettingKey) {
      return;
    }
    if (!setting.editable) {
      setNotice(i18n.t("tui.pluginConfig.isConfigGroup", "{name} is a config group.", {
        name: setting.label || setting.key,
      }));
      return;
    }
    const schemaType = normalizedPluginConfigType(setting.schema, setting.value);
    if (schemaType === "bool") {
      void applyConfigSettingValue(setting, !Boolean(setting.value));
      return;
    }
    if (schemaType === "dict" || (schemaType === "object" && !setting.isGroup)) {
      openPluginObjectEditor(setting, (value) => applyConfigSettingValue(setting, value));
      return;
    }
    if (setting.schema?._special) {
      void loadConfigSpecialChoices(setting);
      return;
    }
    if (setting.schema?.options?.length) {
      void openPluginConfigChoices(setting, {
        setting,
        choices: pluginConfigOptionChoicesForI18n(setting, i18n),
        multi: pluginConfigSettingIsMultiChoice(setting),
        title: i18n.t("tui.pluginConfig.optionsTitle", "{name} Options", {
          name: setting.label || setting.key,
        }),
        applyValue: (value) => applyConfigSettingValue(setting, value),
      });
      return;
    }
    const nextValue = providerEditableValue(setting.value);
    setEditingConfigSettingKey(setting.id);
    setConfigEditValue(nextValue);
    setConfigEditCursor(Array.from(nextValue).length);
    setNotice(i18n.t("tui.pluginConfig.editing", "Editing {name}. Enter saves, Esc cancels.", {
      name: setting.label || setting.key,
    }));
  }, [
    applyConfigSettingValue,
    editingConfigSettingKey,
    i18n,
    loadConfigSpecialChoices,
    openPluginConfigChoices,
    openPluginObjectEditor,
    selectedConfigSetting,
    setConfigEditCursor,
    setConfigEditValue,
    setEditingConfigSettingKey,
  ]);

  const cancelEditConfigSetting = useCallback(() => {
    if (!editingConfigSettingKey) {
      return;
    }
    setEditingConfigSettingKey(null);
    setConfigEditValue("");
    setConfigEditCursor(0);
    setNotice(i18n.t("tui.pluginConfig.editCanceled", "Edit canceled."));
  }, [
    editingConfigSettingKey,
    i18n,
    setConfigEditCursor,
    setConfigEditValue,
    setEditingConfigSettingKey,
  ]);

  const saveConfigSetting = useCallback(async () => {
    const setting = selectedConfigSetting;
    if (!setting || !editingConfigSettingKey || savingConfig) {
      return;
    }
    const nextValue = parsePluginConfigEditableValue(
      configEditValue,
      setting.value,
      setting.schema,
    );
    await applyConfigSettingValue(setting, nextValue);
    setEditingConfigSettingKey(null);
    setConfigEditValue("");
    setConfigEditCursor(0);
  }, [
    applyConfigSettingValue,
    configEditValue,
    editingConfigSettingKey,
    savingConfig,
    selectedConfigSetting,
    setConfigEditCursor,
    setConfigEditValue,
    setEditingConfigSettingKey,
  ]);

  const executeSelectedConfigFileAction = useCallback(async () => {
    const selected = selectedAbconf;
    if (loadingConfig || savingConfig) {
      return;
    }
    if (selectedConfigFileAction === "new") {
      setConfigFileActionDialog({
        mode: "create",
        name: "",
        cursor: 0,
      });
      return;
    }
    if (!selected) {
      return;
    }
    if (selectedConfigFileAction === "copy") {
      const name = `${selected.name || selected.id}-copy`;
      setConfigFileActionDialog({
        mode: "copy",
        config: selected,
        name,
        cursor: Array.from(name).length,
      });
      return;
    }
    if (selectedConfigFileAction === "rename") {
      if (selected.id === "default") {
        setNotice(i18n.t("tui.config.defaultReadonly", "Default config cannot be renamed."));
        return;
      }
      const name = selected.name || selected.id;
      setConfigFileActionDialog({
        mode: "rename",
        config: selected,
        name,
        cursor: Array.from(name).length,
      });
      return;
    }
    if (selected.id === "default") {
      setNotice(i18n.t("tui.config.defaultReadonly", "Default config cannot be deleted."));
      return;
    }
    if (pendingConfigDeleteId !== selected.id) {
      setPendingConfigDeleteId(selected.id);
      setNotice(i18n.t("tui.config.confirmDelete", "Press Enter again to delete config {name}.", {
        name: selected.name || selected.id,
      }));
      return;
    }
    setSavingConfig(true);
    try {
      await client.deleteAbconf(selected.id);
      setPendingConfigDeleteId(null);
      const nextConfig = await loadConfigList("default");
      await loadNormalConfig(nextConfig);
      setNotice(i18n.t("tui.config.deleted", "Deleted config {name}.", {
        name: selected.name || selected.id,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setSavingConfig(false);
    }
  }, [
    client,
    i18n,
    loadConfigList,
    loadNormalConfig,
    loadingConfig,
    pendingConfigDeleteId,
    savingConfig,
    selectedAbconf,
    selectedConfigFileAction,
    setConfigFileActionDialog,
    setPendingConfigDeleteId,
    setSavingConfig,
  ]);

  const executeConfigFileActionDialog = useCallback(async () => {
    const dialog = configFileActionDialog;
    if (!dialog || savingConfig) {
      return;
    }
    const name = dialog.name.trim();
    if (!name) {
      setNotice(i18n.t("features.config.configManagement.pleaseEnterName", "Please enter a name."));
      return;
    }
    const duplicate = abconfs.some((item) =>
      item.id !== dialog.config?.id &&
      String(item.name || "").trim() === name,
    );
    if (duplicate) {
      setNotice(i18n.t("features.config.configManagement.nameExists", "Name already exists."));
      return;
    }
    setSavingConfig(true);
    try {
      if (dialog.mode === "rename" && dialog.config?.id) {
        await client.updateAbconfInfo(dialog.config.id, name);
        await loadConfigList(dialog.config.id);
        setNotice(i18n.t("tui.config.renamed", "Renamed config."));
      } else {
        let sourceConfig: Record<string, unknown> | undefined;
        if (dialog.mode === "copy" && dialog.config?.id) {
          const payload = await client.getAbconf(dialog.config.id);
          sourceConfig = asRecord(payload.config) || undefined;
        }
        const result = await client.createAbconf(name, sourceConfig);
        const nextConfig = await loadConfigList(result.conf_id);
        await loadNormalConfig(nextConfig);
        setConfigTab("normal");
        setConfigPane("fileDialog");
        setNotice(result.message || i18n.t("tui.config.created", "Created config {name}.", { name }));
      }
      setConfigFileActionDialog(null);
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setSavingConfig(false);
    }
  }, [
    abconfs,
    client,
    configFileActionDialog,
    i18n,
    loadConfigList,
    loadNormalConfig,
    savingConfig,
    setConfigFileActionDialog,
    setConfigPane,
    setConfigTab,
    setSavingConfig,
  ]);

  const executePersonaFolderDialog = useCallback(async () => {
    const dialog = creatingPersonaFolder;
    if (!dialog || workingPersonaId) {
      return;
    }
    const name = dialog.name.trim();
    if (!name) {
      setNotice(i18n.t("features.persona.folder.validation.nameRequired", "Folder name is required."));
      return;
    }
    setWorkingPersonaId("__folder__");
    try {
      const result = await client.createPersonaFolder({
        name,
        parent_id: currentPersonaFolderId,
      });
      await reloadPersonas(currentPersonaFolderId);
      setCreatingPersonaFolder(null);
      setNotice(result.message || i18n.t("features.persona.folder.messages.createSuccess", "Folder created successfully"));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPersonaId(null);
    }
  }, [
    client,
    creatingPersonaFolder,
    currentPersonaFolderId,
    i18n,
    reloadPersonas,
    setCreatingPersonaFolder,
    workingPersonaId,
  ]);

  const cancelEditPluginConfigSetting = useCallback(() => {
    if (!editingPluginConfigSettingKey) {
      return;
    }
    setEditingPluginConfigSettingKey(null);
    setPluginConfigEditValue("");
    setPluginConfigEditCursor(0);
    setNotice(i18n.t("tui.pluginConfig.editCanceled", "Edit canceled."));
  }, [editingPluginConfigSettingKey]);

  const savePluginConfigSetting = useCallback(async () => {
    const plugin = selectedPlugin;
    const pluginConfig = plugin ? pluginConfigs[plugin.name] : null;
    const setting = selectedPluginConfigSetting;
    if (
      !plugin ||
      !pluginConfig ||
      !setting ||
      !editingPluginConfigSettingKey ||
      workingPluginName
    ) {
      return;
    }
    const currentConfig = pluginConfig.config || {};
    const nextConfig = setConfigValueAtPath(
      currentConfig,
      setting.path,
      parsePluginConfigEditableValue(
        pluginConfigEditValue,
        setting.value,
        setting.schema,
      ),
    );
    const nextPayload = {
      ...pluginConfig,
      config: nextConfig,
    };

    setWorkingPluginName(plugin.name);
    setPluginConfigs((current) => ({
      ...current,
      [plugin.name]: nextPayload,
    }));
    try {
      await client.updatePluginConfig(plugin.name, nextConfig);
      setPluginDetails((current) => {
        const next = { ...current };
        delete next[plugin.name];
        return next;
      });
      setEditingPluginConfigSettingKey(null);
      setPluginConfigEditValue("");
      setPluginConfigEditCursor(0);
      await reloadPlugins();
      setNotice(i18n.t("tui.common.updated", "Updated {name}.", {
        name: setting.label || setting.key,
      }));
    } catch (error) {
      setPluginConfigs((current) => ({
        ...current,
        [plugin.name]: pluginConfig,
      }));
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingPluginName(null);
    }
  }, [
    client,
    editingPluginConfigSettingKey,
    pluginConfigEditValue,
    pluginConfigs,
    reloadPlugins,
    selectedPlugin,
    selectedPluginConfigSetting,
    workingPluginName,
  ]);

  const executeSelectedMarketPluginAction = useCallback(async () => {
    const plugin = selectedMarketPlugin;
    if (!plugin || workingMarketPluginName) {
      return;
    }
    const sourceUrl = String(plugin.repo || plugin.download_url || "").trim();
    if (!sourceUrl) {
      setNotice(i18n.t("tui.plugins.noInstallSource", "{name} has no install source.", {
        name: plugin.name,
      }));
      return;
    }

    const workingKey = marketPluginKey(plugin);
    if (pendingMarketPluginKey !== workingKey) {
      setPendingMarketPluginKey(workingKey);
      setNotice(i18n.t("tui.plugins.confirmMarketAction", "Press Enter again to {action} {name}.", {
        action: marketActionLabel(plugin, i18n).toLowerCase(),
        name: plugin.name,
      }));
      return;
    }

    setWorkingMarketPluginName(workingKey);
    setPendingMarketPluginKey(null);
    setPendingPluginDeleteName(null);
    try {
      if (plugin.installed_plugin?.name) {
        setNotice(i18n.t("tui.plugins.marketWorking", "{action} plugin {name}...", {
          action: plugin.has_update
            ? i18n.t("tui.plugins.marketAction.updating", "Updating")
            : i18n.t("tui.plugins.marketAction.reinstalling", "Reinstalling"),
          name: plugin.installed_plugin.name,
        }));
        await client.updatePlugin(plugin.installed_plugin.name, {
          downloadUrl: String(plugin.download_url || ""),
        });
        setPluginDetails((current) => {
          const next = { ...current };
          delete next[plugin.installed_plugin?.name || ""];
          return next;
        });
        await reloadPlugins();
        setNotice(i18n.t("tui.plugins.updatedOrReinstalled", "{action} plugin {name}.", {
          action: plugin.has_update
            ? i18n.t("tui.plugins.marketAction.updated", "Updated")
            : i18n.t("tui.plugins.marketAction.reinstalled", "Reinstalled"),
          name: plugin.name,
        }));
        return;
      }

      setNotice(i18n.t("tui.plugins.installing", "Installing plugin {name}...", {
        name: plugin.name,
      }));
      const result = await client.installPluginEnvelope(sourceUrl, {
        downloadUrl: String(plugin.download_url || ""),
      });
      if (result.status === "warning" || isPluginInstallWarning(result.data)) {
        setPendingMarketInstallWarning({
          pluginKey: workingKey,
          pluginName: plugin.name,
          sourceUrl,
          downloadUrl: String(plugin.download_url || ""),
          message: result.message ||
            String(result.data.warning_type || i18n.t("tui.plugins.installWarningFallback", "Install warning.")),
        });
        setNotice(i18n.t("tui.plugins.installWarning", "Install warning for {name}. Confirm to continue.", {
          name: plugin.name,
        }));
        return;
      }
      await reloadPlugins();
      setNotice(i18n.t("tui.plugins.installedOk", "Installed plugin {name}.", {
        name: plugin.name,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingMarketPluginName(null);
    }
  }, [
    client,
    pendingMarketPluginKey,
    reloadPlugins,
    selectedMarketPlugin,
    workingMarketPluginName,
  ]);

  const confirmPendingMarketInstallWarning = useCallback(async () => {
    const warning = pendingMarketInstallWarning;
    if (!warning || workingMarketPluginName) {
      return;
    }
    setWorkingMarketPluginName(warning.pluginKey);
    setNotice(i18n.t("tui.plugins.installingIgnoringWarning", "Installing plugin {name} ignoring version warning...", {
      name: warning.pluginName,
    }));
    try {
      await client.installPlugin(warning.sourceUrl, {
        downloadUrl: warning.downloadUrl,
        ignoreVersionCheck: true,
      });
      setPendingMarketInstallWarning(null);
      await reloadPlugins();
      setNotice(i18n.t("tui.plugins.installedOk", "Installed plugin {name}.", {
        name: warning.pluginName,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setWorkingMarketPluginName(null);
    }
  }, [
    client,
    pendingMarketInstallWarning,
    reloadPlugins,
    workingMarketPluginName,
  ]);

  useEffect(() => {
    if (
      activeView !== "plugins" ||
      !selectedPlugin ||
      pluginDetails[selectedPlugin.name] ||
      loadingPluginDetailName ||
      workingPluginName
    ) {
      return;
    }
    void fetchSelectedPluginDetail().catch((error) => {
      setNotice(messageFromUnknown(error));
    });
  }, [
    activeView,
    fetchSelectedPluginDetail,
    loadingPluginDetailName,
    pluginDetails,
    selectedPlugin,
    workingPluginName,
  ]);

  useEffect(() => {
    if (
      activeView !== "plugins" ||
      !selectedPlugin ||
      pluginConfigs[selectedPlugin.name] ||
      loadingPluginConfigName ||
      workingPluginName
    ) {
      return;
    }
    void fetchSelectedPluginConfig().catch((error) => {
      setNotice(messageFromUnknown(error));
    });
  }, [
    activeView,
    fetchSelectedPluginConfig,
    loadingPluginConfigName,
    pluginConfigs,
    selectedPlugin,
    workingPluginName,
  ]);

  const beginCreatePlatform = useCallback(() => {
    if (isCreatingPlatform || isTogglingPlatform) {
      return;
    }
    if (!platformTemplates.length) {
      setNotice(i18n.t("features.platform.dialog.noTemplates", "No platform adapter templates available."));
      return;
    }
    setSelectedPlatformTemplateIndex(0);
    setPlatformRegistration(null);
    setIsCreatingPlatform(true);
    setNotice(i18n.t("tui.platforms.selectAdapterTemplate", "Select a platform adapter template."));
  }, [isCreatingPlatform, isTogglingPlatform, platformTemplates.length]);

  const cancelCreatePlatform = useCallback(() => {
    if (!isCreatingPlatform) {
      return;
    }
    setPlatformRegistration(null);
    setIsCreatingPlatform(false);
    setNotice(i18n.t("tui.platforms.createCanceled", "Create canceled."));
  }, [isCreatingPlatform]);

  const startPlatformLogin = useCallback(async () => {
    const platform = selectedPlatform;
    if (!platform) {
      return;
    }
    const type = String(platform.type || "");
    if (!PLATFORM_REGISTRATION_TYPES.has(type)) {
      setNotice(i18n.t("tui.platforms.scanUnsupported", "{id} does not support scan login.", {
        id: platform.id,
      }));
      return;
    }
    if (isPlatformLoggedIn(platform)) {
      setNotice(i18n.t("tui.platforms.alreadyLoggedIn", "{id} is already logged in.", {
        id: platform.id,
      }));
      return;
    }

    setPlatformRegistration({
      platformId: platform.id,
      config: platform,
      status: "starting",
      message: i18n.t("tui.platforms.scanStarting", "Starting scan registration..."),
    });
    try {
      const result = await client.platformRegistration(type, {
        action: "start",
        platform_config: platform,
      });
      setPlatformRegistration({
        platformId: platform.id,
        config: platform,
        status: result.status || "pending",
        registrationCode: result.registration_code || result.device_code || result.qrcode,
        message: result.message,
        qrValue: platformRegistrationQrValue(result),
        userCode: result.user_code,
        verificationUri: result.verification_uri,
        interval: result.interval,
      });
      setNotice(i18n.t("tui.platforms.scanStarted", "Scan login started for {id}.", {
        id: platform.id,
      }));
    } catch (error) {
      setPlatformRegistration({
        platformId: platform.id,
        config: platform,
        status: "error",
        message: messageFromUnknown(error),
      });
      setNotice(messageFromUnknown(error));
    }
  }, [
    client,
    selectedPlatform,
  ]);

  useEffect(() => {
    if (!platformRegistration) {
      return undefined;
    }
    if (platformRegistration.status === "created") {
      const originalId = platformRegistration.platformId || platformRegistration.config.id;
      const nextConfig = platformRegistration.config;
      setIsTogglingPlatform(true);
      void client.updatePlatform(originalId, nextConfig)
        .then(async () => {
          await reloadPlatforms();
          setPlatformRegistration(null);
          setNotice(i18n.t("tui.platforms.loggedIn", "Logged in {id}.", {
            id: nextConfig.id,
          }));
        })
        .catch((error) => {
          setPlatformRegistration((current) =>
            current
              ? {
                  ...current,
                  status: "error",
                  message: messageFromUnknown(error),
                }
              : current,
          );
          setNotice(messageFromUnknown(error));
        })
        .finally(() => {
          setIsTogglingPlatform(false);
        });
      return undefined;
    }
    const type = String(platformRegistration.config.type || "");
    if (
      !PLATFORM_REGISTRATION_TYPES.has(type) ||
      !platformRegistration.registrationCode ||
      platformRegistration.status === "created" ||
      platformRegistration.status === "error" ||
      platformRegistration.status === "denied" ||
      platformRegistration.status === "expired"
    ) {
      return undefined;
    }

    const intervalMs = Math.max(1, platformRegistration.interval || 3) * 1000;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await client.platformRegistration(type, {
            action: "poll",
            platform_config: platformRegistration.config,
            registration_code: platformRegistration.registrationCode,
          });
          setPlatformRegistration((current) => {
            if (!current || current.registrationCode !== platformRegistration.registrationCode) {
              return current;
            }
            const nextConfig = applyPlatformRegistrationResult(current.config, result);
            return {
              ...current,
              config: nextConfig,
              status: result.status || current.status,
              message: result.message || current.message,
              qrValue: platformRegistrationQrValue(result) || current.qrValue,
              interval:
                result.status === "slow_down"
                  ? Math.max(1, result.interval || current.interval || 3) + 5
                  : result.interval || current.interval,
            };
          });
        } catch (error) {
          setPlatformRegistration((current) =>
            current
              ? {
                  ...current,
                  status: "error",
                  message: messageFromUnknown(error),
                }
              : current,
          );
          setNotice(messageFromUnknown(error));
        }
      })();
    }, intervalMs);
    return () => {
      clearTimeout(timer);
    };
  }, [client, platformRegistration, reloadPlatforms]);

  const savePlatformCreate = useCallback(async () => {
    if (!isCreatingPlatform || isTogglingPlatform) {
      return;
    }
    const template = platformTemplates[selectedPlatformTemplateIndex];
    if (!template) {
      setNotice(i18n.t("tui.platforms.noTemplateSelected", "No platform template selected."));
      return;
    }
    const platform = platformConfigFromTemplate(template, platforms);
    if (!platform.id) {
      setNotice(i18n.t("tui.platforms.idRequired", "Platform id is required."));
      return;
    }

    setIsTogglingPlatform(true);
    try {
      await client.createPlatform(platform);
      await reloadPlatforms();
      setSelectedPlatformIndex(platforms.length);
      setSelectedPlatformAction("switch");
      setSelectedPlatformSettingIndex(0);
      setPlatformRegistration(null);
      setIsCreatingPlatform(false);
      setNotice(i18n.t("tui.platforms.created", "Created {template} adapter {id}. Edit settings on the right.", {
        template: template.name,
        id: platform.id,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingPlatform(false);
    }
  }, [
    client,
    isCreatingPlatform,
    isTogglingPlatform,
    platformTemplates,
    platforms,
    platforms.length,
    reloadPlatforms,
    selectedPlatformTemplateIndex,
  ]);

  const toggleSelectedPlatform = useCallback(async () => {
    const platform = selectedPlatform;
    if (!platform || isTogglingPlatform) {
      return;
    }
    const enable = platform.enable === false;
    const nextPlatform = { ...platform, enable };
    setIsTogglingPlatform(true);
    setPlatforms((current) =>
      current.map((item) => (item.id === platform.id ? nextPlatform : item)),
    );
    try {
      await client.updatePlatform(platform.id, nextPlatform);
      await reloadPlatforms();
      setNotice(enable
        ? i18n.t("tui.platforms.enabled", "Platform enabled.")
        : i18n.t("tui.platforms.disabled", "Platform disabled."));
    } catch (error) {
      setPlatforms((current) =>
        current.map((item) => (item.id === platform.id ? platform : item)),
      );
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingPlatform(false);
    }
  }, [client, isTogglingPlatform, reloadPlatforms, selectedPlatform]);

  const deleteSelectedPlatform = useCallback(async () => {
    const platform = selectedPlatform;
    if (!platform || isTogglingPlatform) {
      return;
    }
    if (!pendingPlatformDelete || pendingPlatformDelete.id !== platform.id) {
      setPendingPlatformDelete({ id: platform.id });
      setNotice(i18n.t("tui.platforms.confirmDelete", "Press Enter again to delete platform {id}.", {
        id: platform.id,
      }));
      return;
    }

    setIsTogglingPlatform(true);
    try {
      await client.deletePlatform(platform.id);
      setPendingPlatformDelete(null);
      setSelectedPlatformIndex(0);
      setSelectedPlatformSettingIndex(0);
      await reloadPlatforms();
      setNotice(i18n.t("tui.platforms.deleted", "Deleted platform {id}.", {
        id: platform.id,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingPlatform(false);
    }
  }, [
    client,
    isTogglingPlatform,
    pendingPlatformDelete,
    reloadPlatforms,
    selectedPlatform,
  ]);

  const beginEditPlatformSetting = useCallback(() => {
    const setting = selectedPlatformSetting;
    if (!setting || editingPlatformSettingKey) {
      return;
    }
    const nextValue = providerEditableValue(setting.value);
    setEditingPlatformSettingKey(setting.key);
    setPlatformEditValue(nextValue);
    setPlatformEditCursor(Array.from(nextValue).length);
    setNotice(i18n.t("tui.platforms.editing", "Editing {key}. Enter saves, Esc cancels.", {
      key: setting.key,
    }));
  }, [editingPlatformSettingKey, selectedPlatformSetting]);

  const cancelEditPlatformSetting = useCallback(() => {
    if (!editingPlatformSettingKey) {
      return;
    }
    setEditingPlatformSettingKey(null);
    setPlatformEditValue("");
    setPlatformEditCursor(0);
    setNotice(i18n.t("tui.pluginConfig.editCanceled", "Edit canceled."));
  }, [editingPlatformSettingKey]);

  const savePlatformSetting = useCallback(async () => {
    const platform = selectedPlatform;
    const setting = selectedPlatformSetting;
    if (
      !platform ||
      !setting ||
      !editingPlatformSettingKey ||
      isTogglingPlatform
    ) {
      return;
    }
    const configKey = setting.configKey || setting.key;
    const nextValue =
      configKey === "id"
        ? platformEditValue.trim()
        : parseProviderEditableValue(platformEditValue, setting.value);
    if (configKey === "id" && !isPlatformIdValid(String(nextValue))) {
      setNotice(i18n.t("tui.platforms.invalidName", "Invalid platform name. It cannot be empty or contain ! or :."));
      return;
    }
    const nextPlatform = { ...platform, [configKey]: nextValue };

    setIsTogglingPlatform(true);
    setPlatforms((current) =>
      current.map((item) => (item.id === platform.id ? nextPlatform : item)),
    );
    try {
      await client.updatePlatform(platform.id, nextPlatform);
      await reloadPlatforms();
      setEditingPlatformSettingKey(null);
      setPlatformEditValue("");
      setPlatformEditCursor(0);
      setNotice(i18n.t("tui.common.updated", "Updated {name}.", {
        name: setting.key,
      }));
    } catch (error) {
      setPlatforms((current) =>
        current.map((item) => (item.id === platform.id ? platform : item)),
      );
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingPlatform(false);
    }
  }, [
    client,
    editingPlatformSettingKey,
    isTogglingPlatform,
    platformEditValue,
    reloadPlatforms,
    selectedPlatform,
    selectedPlatformSetting,
  ]);

  const executeSelectedPlatformAction = useCallback(async () => {
    if (selectedPlatformAction === "switch") {
      await toggleSelectedPlatform();
      return;
    }
    if (selectedPlatformAction === "login") {
      await startPlatformLogin();
      return;
    }
    await deleteSelectedPlatform();
  }, [
    deleteSelectedPlatform,
    selectedPlatformAction,
    startPlatformLogin,
    toggleSelectedPlatform,
  ]);

  const toggleSelectedProvider = useCallback(async () => {
    const row = selectedProviderEntries[selectedProviderIndex]?.row;
    const provider = row?.provider;
    if (!provider || isTogglingProvider) {
      return;
    }

    const enable = !providerEnabled(provider);
    setIsTogglingProvider(true);
    setProviderTemplate((current) =>
      current
        ? {
            ...current,
            providers: current.providers.map((item) =>
              item.id === provider.id ? { ...item, enable } : item,
            ),
          }
        : current,
    );
    try {
      await client.updateProvider(provider.id, { ...provider, enable });
      await reloadProviders();
      setNotice(enable
        ? i18n.t("tui.providers.enabled", "Provider enabled.")
        : i18n.t("tui.providers.disabled", "Provider disabled."));
    } catch (error) {
      setProviderTemplate((current) =>
        current
          ? {
              ...current,
              providers: current.providers.map((item) =>
                item.id === provider.id ? provider : item,
              ),
            }
          : current,
      );
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingProvider(false);
    }
  }, [
    client,
    isTogglingProvider,
    reloadProviders,
    selectedProviderIndex,
    selectedProviderEntries,
  ]);

  const toggleSelectedProviderSource = useCallback(async () => {
    const source = selectedProviderSource;
    if (!source || isTogglingProvider) {
      return;
    }

    const enable = source.enable === false;
    setIsTogglingProvider(true);
    setProviderTemplate((current) =>
      current
        ? {
            ...current,
            provider_sources: current.provider_sources.map((item) =>
              item.id === source.id ? { ...item, enable } : item,
            ),
          }
        : current,
    );
    try {
      await client.updateProviderSource(source.id, { ...source, enable });
      await reloadProviders();
      setNotice(enable
        ? i18n.t("tui.providers.sourceEnabled", "Provider source enabled.")
        : i18n.t("tui.providers.sourceDisabled", "Provider source disabled."));
    } catch (error) {
      setProviderTemplate((current) =>
        current
          ? {
              ...current,
              provider_sources: current.provider_sources.map((item) =>
                item.id === source.id ? source : item,
              ),
            }
          : current,
      );
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingProvider(false);
    }
  }, [
    client,
    isTogglingProvider,
    reloadProviders,
    selectedProviderSource,
  ]);

  const beginCreateProviderSource = useCallback(() => {
    if (isCreatingProviderSource || isTogglingProvider) {
      return;
    }
    if (!providerSourceTemplates.length) {
      setNotice(i18n.t("tui.providers.noSourceTemplates", "No provider source templates available."));
      return;
    }
    setSelectedProviderSourceTemplateIndex(0);
    setIsCreatingProviderSource(true);
    setNotice(i18n.t("tui.providers.selectSourceTemplate", "Select a provider source template."));
  }, [isCreatingProviderSource, isTogglingProvider, providerSourceTemplates.length]);

  const cancelCreateProviderSource = useCallback(() => {
    if (!isCreatingProviderSource) {
      return;
    }
    setIsCreatingProviderSource(false);
    setNotice(i18n.t("tui.platforms.createCanceled", "Create canceled."));
  }, [isCreatingProviderSource]);

  const beginCreateProvider = useCallback(() => {
    if (isCreatingProvider || isTogglingProvider) {
      return;
    }
    if (!providerTemplates.length) {
      setNotice(i18n.t("tui.providers.noProviderTemplates", "No {type} provider templates available.", {
        type: providerType,
      }));
      return;
    }
    setSelectedProviderTemplateIndex(0);
    setIsCreatingProvider(true);
    setNotice(i18n.t("tui.providers.selectProviderTemplate", "Select a provider template."));
  }, [
    isCreatingProvider,
    isTogglingProvider,
    providerTemplates.length,
    providerType,
  ]);

  const cancelCreateProvider = useCallback(() => {
    if (!isCreatingProvider) {
      return;
    }
    setIsCreatingProvider(false);
    setNotice(i18n.t("tui.platforms.createCanceled", "Create canceled."));
  }, [isCreatingProvider]);

  const saveProviderCreate = useCallback(async () => {
    if (!isCreatingProvider || isTogglingProvider) {
      return;
    }

    const template = providerTemplates[selectedProviderTemplateIndex];
    if (!template) {
      setNotice(i18n.t("tui.providers.noProviderTemplateSelected", "No provider template selected."));
      return;
    }
    const provider = providerConfigFromTemplate(
      template,
      providerTemplate?.providers || [],
    );
    if (!provider.id) {
      setNotice(i18n.t("tui.providers.providerIdRequired", "Provider id is required."));
      return;
    }
    if (providerTemplate?.providers.some((item) => item.id === provider.id)) {
      setNotice(i18n.t("tui.providers.providerExists", "Provider {id} already exists.", {
        id: provider.id,
      }));
      return;
    }

    setIsTogglingProvider(true);
    try {
      await client.createProvider(provider);
      await reloadProviders();
      setSelectedProviderIndex(Math.max(0, providerRows.length));
      setSelectedProviderModelAction(defaultProviderModelAction({ type: "configured" } as ProviderModelEntry));
      setIsCreatingProvider(false);
      setNotice(i18n.t("tui.providers.createdProvider", "Created {template} provider {id}.", {
        template: template.name,
        id: provider.id,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingProvider(false);
    }
  }, [
    client,
    defaultProviderModelAction,
    isCreatingProvider,
    isTogglingProvider,
    providerRows.length,
    providerTemplate?.providers,
    providerTemplates,
    reloadProviders,
    selectedProviderTemplateIndex,
  ]);

  const saveProviderSourceCreate = useCallback(async () => {
    if (!isCreatingProviderSource || isTogglingProvider) {
      return;
    }

    const template = providerSourceTemplates[selectedProviderSourceTemplateIndex];
    if (!template) {
      setNotice(i18n.t("tui.providers.noSourceTemplateSelected", "No provider source template selected."));
      return;
    }
    const existingSources = providerTemplate?.provider_sources || providerSources;
    const source = providerSourceConfigFromTemplate(template, existingSources);
    if (!source.id) {
      setNotice(i18n.t("tui.providers.sourceIdRequired", "Provider source id is required."));
      return;
    }
    if (providerTemplate?.provider_sources.some((item) => item.id === source.id)) {
      setNotice(i18n.t("tui.providers.sourceExists", "Provider source {id} already exists.", {
        id: source.id,
      }));
      return;
    }

    setIsTogglingProvider(true);
    try {
      await client.updateProviderSource(source.id, source);
      await reloadProviders();
      const nextIndex = Math.max(0, providerSources.length);
      setSelectedProviderSourceIndex(nextIndex);
      setSelectedProviderSourceAction("switch");
      setSelectedProviderSourceSettingIndex(0);
      setSelectedProviderIndex(0);
      setIsCreatingProviderSource(false);
      setNotice(i18n.t("tui.providers.createdSource", "Created {template} source {id}. Edit settings on the right.", {
        template: template.name,
        id: source.id,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingProvider(false);
    }
  }, [
    client,
    isCreatingProviderSource,
    isTogglingProvider,
    providerSourceTemplates,
    providerSources.length,
    providerSources,
    providerTemplate?.provider_sources,
    reloadProviders,
    selectedProviderSourceTemplateIndex,
  ]);

  const beginEditProviderSourceSetting = useCallback(() => {
    const setting = selectedProviderSourceSetting;
    if (!setting || editingProviderSourceSettingKey) {
      return;
    }
    const nextValue = providerEditableValue(setting.value);
    setEditingProviderSourceSettingKey(setting.key);
    setProviderSourceEditValue(nextValue);
    setProviderSourceEditCursor(Array.from(nextValue).length);
    setNotice(i18n.t("tui.providers.editingSource", "Editing {key}. Enter saves, Esc cancels.", {
      key: setting.key,
    }));
  }, [editingProviderSourceSettingKey, selectedProviderSourceSetting]);

  const cancelEditProviderSourceSetting = useCallback(() => {
    if (!editingProviderSourceSettingKey) {
      return;
    }
    setEditingProviderSourceSettingKey(null);
    setProviderSourceEditValue("");
    setProviderSourceEditCursor(0);
    setNotice(i18n.t("tui.pluginConfig.editCanceled", "Edit canceled."));
  }, [editingProviderSourceSettingKey]);

  const saveProviderSourceSetting = useCallback(async () => {
    const source = selectedProviderSource;
    const setting = selectedProviderSourceSetting;
    if (
      !source ||
      !setting ||
      !editingProviderSourceSettingKey ||
      isTogglingProvider
    ) {
      return;
    }

    const nextValue = parseProviderEditableValue(providerSourceEditValue, setting.value);
    const nextSource = { ...source, [setting.key]: nextValue };
    setIsTogglingProvider(true);
    setProviderTemplate((current) =>
      current
        ? {
            ...current,
            provider_sources: current.provider_sources.map((item) =>
              item.id === source.id ? nextSource : item,
            ),
          }
        : current,
    );
    try {
      await client.updateProviderSource(source.id, nextSource);
      await reloadProviders();
      setEditingProviderSourceSettingKey(null);
      setProviderSourceEditValue("");
      setProviderSourceEditCursor(0);
      setNotice(i18n.t("tui.common.updated", "Updated {name}.", {
        name: setting.key,
      }));
    } catch (error) {
      setProviderTemplate((current) =>
        current
          ? {
              ...current,
              provider_sources: current.provider_sources.map((item) =>
                item.id === source.id ? source : item,
              ),
            }
          : current,
      );
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingProvider(false);
    }
  }, [
    client,
    editingProviderSourceSettingKey,
    isTogglingProvider,
    providerSourceEditValue,
    reloadProviders,
    selectedProviderSource,
    selectedProviderSourceSetting,
  ]);

  const beginEditProviderConfig = useCallback(() => {
    const provider = selectedProviderEntries[selectedProviderIndex]?.provider;
    if (!provider || editingProviderConfig || isTogglingProvider) {
      return;
    }
    const nextProvider = mergeProviderConfigWithTemplate(provider, providerTemplate);
    setEditingProviderConfig(nextProvider);
    setEditingProviderOriginalId(provider.id);
    setSelectedProviderConfigSettingIndex(0);
    setEditingProviderConfigSettingKey(null);
    setProviderConfigEditValue("");
    setProviderConfigEditCursor(0);
    setNotice(i18n.t("tui.providers.editingProvider", "Editing provider {id}.", {
      id: provider.id,
    }));
  }, [
    editingProviderConfig,
    isTogglingProvider,
    providerTemplate,
    selectedProviderEntries,
    selectedProviderIndex,
  ]);

  const cancelEditProviderConfig = useCallback(() => {
    if (!editingProviderConfig) {
      return;
    }
    setEditingProviderConfig(null);
    setEditingProviderOriginalId("");
    setSelectedProviderConfigSettingIndex(0);
    setEditingProviderConfigSettingKey(null);
    setProviderConfigEditValue("");
    setProviderConfigEditCursor(0);
    setNotice(i18n.t("tui.providers.modelConfigCanceled", "Model config edit canceled."));
  }, [editingProviderConfig]);

  const cancelEditProviderConfigSetting = useCallback(() => {
    if (!editingProviderConfigSettingKey) {
      return;
    }
    setEditingProviderConfigSettingKey(null);
    setProviderConfigEditValue("");
    setProviderConfigEditCursor(0);
    setNotice(i18n.t("tui.pluginConfig.fieldEditCanceled", "Field edit canceled."));
  }, [editingProviderConfigSettingKey]);

  const saveProviderConfigValue = useCallback(async (
    setting: ProviderConfigSetting,
    nextValue: unknown,
  ) => {
    if (!editingProviderConfig || isTogglingProvider) {
      return;
    }
    const originalId = editingProviderOriginalId || editingProviderConfig.id;
    const nextProvider = setConfigValueAtPath(
      editingProviderConfig as Record<string, unknown>,
      setting.path,
      nextValue,
    ) as ProviderConfig;
    const previousProvider = providerTemplate?.providers.find((item) => item.id === originalId);

    setIsTogglingProvider(true);
    setEditingProviderConfig(nextProvider);
    setProviderTemplate((current) =>
      current
        ? {
            ...current,
            providers: current.providers.map((item) =>
              item.id === originalId ? nextProvider : item,
            ),
          }
        : current,
    );
    try {
      await client.updateProvider(originalId, nextProvider);
      await reloadProviders();
      setEditingProviderOriginalId(nextProvider.id || originalId);
      setEditingProviderConfig(nextProvider);
      setNotice(i18n.t("tui.providers.saved", "Saved {name}.", {
        name: setting.label || setting.key,
      }));
    } catch (error) {
      if (previousProvider) {
        setProviderTemplate((current) =>
          current
            ? {
                ...current,
                providers: current.providers.map((item) =>
                  item.id === nextProvider.id || item.id === originalId ? previousProvider : item,
                ),
              }
            : current,
        );
      }
      setEditingProviderConfig(editingProviderConfig);
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingProvider(false);
    }
  }, [
    client,
    editingProviderConfig,
    editingProviderOriginalId,
    isTogglingProvider,
    providerTemplate?.providers,
    reloadProviders,
  ]);

  const saveProviderConfigField = useCallback(async () => {
    const setting = selectedProviderConfigSetting;
    if (
      !editingProviderConfig ||
      !editingProviderConfigSettingKey ||
      !setting ||
      isTogglingProvider
    ) {
      return;
    }
    const nextValue = parsePluginConfigEditableValue(
      providerConfigEditValue,
      setting.value,
      setting.schema,
    );
    await saveProviderConfigValue(setting, nextValue);
    setEditingProviderConfigSettingKey(null);
    setProviderConfigEditValue("");
    setProviderConfigEditCursor(0);
  }, [
    editingProviderConfig,
    editingProviderConfigSettingKey,
    isTogglingProvider,
    providerConfigEditValue,
    saveProviderConfigValue,
    selectedProviderConfigSetting,
  ]);

  const beginEditProviderConfigSetting = useCallback(() => {
    const setting = selectedProviderConfigSetting;
    if (!editingProviderConfig || !setting || editingProviderConfigSettingKey) {
      return;
    }
    if (!setting.editable) {
      setNotice(i18n.t("tui.pluginConfig.isConfigGroup", "{name} is a config group.", {
        name: setting.label || setting.key,
      }));
      return;
    }
    const schemaType = normalizedPluginConfigType(setting.schema, setting.value);
    if (schemaType === "bool") {
      void saveProviderConfigValue(setting, !Boolean(setting.value));
      return;
    }
    if (schemaType === "dict" || (schemaType === "object" && !setting.isGroup)) {
      openPluginObjectEditor(setting, async (value: unknown) => {
        await saveProviderConfigValue(setting, value);
      });
      return;
    }
    if (setting.schema?.options?.length) {
      void openPluginConfigChoices(setting, {
        setting,
        choices: pluginConfigOptionChoices(setting),
        multi: pluginConfigSettingIsMultiChoice(setting),
        title: i18n.t("tui.pluginConfig.optionsTitle", "{name} Options", {
          name: setting.label || setting.key,
        }),
        applyValue: async (value: unknown) => {
          await saveProviderConfigValue(setting, value);
        },
      });
      return;
    }
    const nextValue = providerEditableValue(setting.value);
    setEditingProviderConfigSettingKey(setting.id);
    setProviderConfigEditValue(nextValue);
    setProviderConfigEditCursor(Array.from(nextValue).length);
    setNotice(i18n.t("tui.pluginConfig.editingField", "Editing {name}. Enter saves field, Esc returns.", {
      name: setting.label || setting.key,
    }));
  }, [
    editingProviderConfig,
    editingProviderConfigSettingKey,
    i18n,
    openPluginConfigChoices,
    openPluginObjectEditor,
    saveProviderConfigValue,
    selectedProviderConfigSetting,
  ]);

  const testSelectedProvider = useCallback(async () => {
    const row = selectedProviderEntries[selectedProviderIndex]?.row;
    const provider = row?.provider;
    if (!provider || testingProviderId) {
      return;
    }

    setTestingProviderId(provider.id);
    setNotice(i18n.t("tui.providers.testing", "Testing provider {id}...", {
      id: provider.id,
    }));
    try {
      const result = await client.checkProvider(provider.id);
      setProviderStatuses((current) => ({ ...current, [provider.id]: result }));
      if (result.status === "available" && !result.error) {
        setNotice(i18n.t("tui.providers.available", "Provider {id} is available.", {
          id: provider.id,
        }));
      } else {
        setNotice(result.error || i18n.t("tui.providers.statusNotice", "Provider {id} is {status}.", {
          id: provider.id,
          status: result.status,
        }));
      }
    } catch (error) {
      setProviderStatuses((current) => ({
        ...current,
        [provider.id]: {
          id: provider.id,
          status: "unavailable",
          error: messageFromUnknown(error),
        },
      }));
      setNotice(messageFromUnknown(error));
    } finally {
      setTestingProviderId(null);
    }
  }, [client, selectedProviderEntries, selectedProviderIndex, testingProviderId]);

  const deleteSelectedProvider = useCallback(async () => {
    const row = selectedProviderEntries[selectedProviderIndex]?.row;
    const provider = row?.provider;
    if (!provider || isTogglingProvider) {
      return;
    }
    if (pendingProviderDelete?.kind !== "model" || pendingProviderDelete.id !== provider.id) {
      setPendingProviderDelete({ kind: "model", id: provider.id });
      setNotice(i18n.t("tui.providers.confirmDeleteModel", "Press Enter again to delete model {id}.", {
        id: provider.id,
      }));
      return;
    }

    setIsTogglingProvider(true);
    try {
      await client.deleteProvider(provider.id);
      setPendingProviderDelete(null);
      await reloadProviders();
      setNotice(i18n.t("tui.providers.deletedModel", "Deleted provider {id}.", {
        id: provider.id,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingProvider(false);
    }
  }, [
    client,
    isTogglingProvider,
    pendingProviderDelete,
    reloadProviders,
    selectedProviderIndex,
    selectedProviderEntries,
  ]);

  const deleteSelectedProviderSource = useCallback(async () => {
    const source = selectedProviderSource;
    if (!source || isTogglingProvider) {
      return;
    }
    if (pendingProviderDelete?.kind !== "source" || pendingProviderDelete.id !== source.id) {
      setPendingProviderDelete({ kind: "source", id: source.id });
      setNotice(i18n.t("tui.providers.confirmDeleteSource", "Press Enter again to delete source {id}.", {
        id: source.id,
      }));
      return;
    }

    setIsTogglingProvider(true);
    try {
      await client.deleteProviderSource(source.id);
      setPendingProviderDelete(null);
      setSelectedProviderSourceIndex(0);
      setSelectedProviderSourceSettingIndex(0);
      setSelectedProviderIndex(0);
      await reloadProviders();
      setNotice(i18n.t("tui.providers.deletedSource", "Deleted provider source {id}.", {
        id: source.id,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingProvider(false);
    }
  }, [
    client,
    isTogglingProvider,
    pendingProviderDelete,
    reloadProviders,
    selectedProviderSource,
  ]);

  const fetchSelectedProviderSourceModels = useCallback(async () => {
    const source = selectedProviderSource;
    if (!source || loadingProviderSourceModelsId) {
      return;
    }

    setLoadingProviderSourceModelsId(source.id);
    try {
      const payload = await client.getProviderSourceModels(source.id);
      const metadata = payload.model_metadata || {};
      const models = (payload.models || []).map((name) => ({
        name,
        metadata: metadata[name] || null,
      }));
      setProviderSourceModels((current) => ({
        ...current,
        [source.id]: models,
      }));
      setNotice(i18n.t("tui.providers.fetchedModels", "Fetched {count} model(s) from {id}.", {
        count: models.length,
        id: source.id,
      }));
    } catch (error) {
      setProviderSourceModels((current) => ({
        ...current,
        [source.id]: [],
      }));
      setNotice(messageFromUnknown(error));
    } finally {
      setLoadingProviderSourceModelsId(null);
    }
  }, [
    client,
    loadingProviderSourceModelsId,
    selectedProviderSource,
  ]);

  const addSelectedAvailableProviderModel = useCallback(async () => {
    const source = selectedProviderSource;
    const entry = selectedProviderEntries[selectedProviderIndex];
    if (!source || entry?.type !== "available" || isTogglingProvider) {
      return;
    }

    const metadata = entry.metadata;
    const context = providerMetadataContext(metadata);
    const providerConfig = {
      id: `${source.id}/${entry.model}`,
      enable: true,
      provider_source_id: source.id,
      model: entry.model,
      modalities: providerModalitiesFromMetadata(metadata),
      custom_extra_body: {},
      max_context_tokens: context,
    };

    setIsTogglingProvider(true);
    try {
      await client.createProvider(providerConfig);
      await reloadProviders();
      setNotice(i18n.t("features.provider.models.addSuccess", "Model {model} added successfully", {
        model: entry.model,
      }));
    } catch (error) {
      setNotice(messageFromUnknown(error));
    } finally {
      setIsTogglingProvider(false);
    }
  }, [
    client,
    isTogglingProvider,
    reloadProviders,
    selectedProviderEntries,
    selectedProviderIndex,
    selectedProviderSource,
  ]);

  const executeSelectedProviderSourceAction = useCallback(async () => {
    if (selectedProviderSourceAction === "switch") {
      await toggleSelectedProviderSource();
      return;
    }
    if (selectedProviderSourceAction === "models") {
      await fetchSelectedProviderSourceModels();
      return;
    }
    await deleteSelectedProviderSource();
  }, [
    deleteSelectedProviderSource,
    fetchSelectedProviderSourceModels,
    selectedProviderSourceAction,
    toggleSelectedProviderSource,
  ]);

  const executeSelectedProviderModelAction = useCallback(async () => {
    if (selectedProviderModelAction === "add") {
      await addSelectedAvailableProviderModel();
      return;
    }
    if (selectedProviderModelAction === "switch") {
      await toggleSelectedProvider();
      return;
    }
    if (selectedProviderModelAction === "config") {
      beginEditProviderConfig();
      return;
    }
    if (selectedProviderModelAction === "test") {
      await testSelectedProvider();
      return;
    }
    await deleteSelectedProvider();
  }, [
    addSelectedAvailableProviderModel,
    beginEditProviderConfig,
    deleteSelectedProvider,
    selectedProviderModelAction,
    testSelectedProvider,
    toggleSelectedProvider,
  ]);

  const sendMessage = useCallback(
    async (text: string) => {
      let messageText = text.trim();
      if (!messageText) {
        return;
      }
      const [command] = messageText.split(/\s+/, 1);
      const argument = messageText.slice(command.length).trim();
      try {
        if (command === "/help") {
          setNotice(i18n.t("tui.chat.commands", "/new · /rename NAME · /delete · /stop · /older · /refresh · /search TEXT · /help"));
          return;
        }
        if (command === "/new") { await createSession(); return; }
        if (command === "/refresh") {
          await refreshAll();
          if (selectedSessionId && !abortRef.current) await loadSessionMessages(selectedSessionId);
          return;
        }
        if (command === "/search") { setSessionFilter(argument); return; }
        if (command === "/older") {
          const pageState = historyPageRef.current;
          if (!selectedSessionId || pageState.loading || abortRef.current) return;
          if (!pageState.hasMore) { setNotice(i18n.t("tui.chat.noOlder", "No earlier messages are available.")); return; }
          pageState.loading = true;
          try {
            const payload = await client.getSession(selectedSessionId, { page: pageState.page + 1 });
            if (selectedSessionRef.current !== selectedSessionId || abortRef.current) return;
            historyPageRef.current = { page: payload.page || pageState.page + 1, hasMore: Boolean(payload.has_more), loading: false };
            setMessages((current) => {
              const ids = new Set(current.filter((record) => record.id != null).map((record) => String(record.id)));
              const fresh = payload.history.filter((record) => record.id == null || !ids.has(String(record.id))).map(normalizeChatRecord);
              return [...fresh, ...current];
            });
            setMessageScrollOffset(Number.MAX_SAFE_INTEGER);
          } finally { pageState.loading = false; }
          return;
        }
        if (["/rename", "/delete", "/stop"].includes(command)) {
          if (!selectedSession?.session_id) return;
          const sessionId = selectedSession.session_id;
          if (command === "/stop") {
            await client.stopSession(sessionId);
            abortRef.current?.abort();
            setNotice(i18n.t("tui.chat.stopped", "Response stopped."));
          } else if (command === "/rename") {
            if (!argument) { setNotice(i18n.t("tui.chat.renameHint", "Use /rename NAME to rename this chat.")); return; }
            await client.renameSession(sessionId, argument);
            await loadSessions(selectedSessionRef.current || undefined);
          } else if (argument === "confirm" && pendingChatDeleteRef.current === sessionId) {
            pendingChatDeleteRef.current = null;
            await client.deleteSession(sessionId);
            await loadSessions();
            setNotice(i18n.t("tui.chat.deleted", "Chat deleted."));
          } else {
            pendingChatDeleteRef.current = sessionId;
            setNotice(i18n.t("tui.chat.confirmDelete", "Delete {name} and its history? Type /delete confirm to confirm.", { name: sessionTitle(selectedSession) }));
          }
          return;
        }
      } catch (error) { setNotice(messageFromUnknown(error)); return; }
      pendingChatDeleteRef.current = null;
      if (!selectedSession?.session_id || isSending || abortRef.current) return;
      if (messageText.startsWith("//")) messageText = messageText.slice(1);
      ++historyRequestRef.current;
      setActiveView("chat");
      setMessageScrollOffset(0);

      const localUserId = `local-user-${Date.now()}`;
      const localBotId = `local-bot-${Date.now()}`;
      setMessages((current) => [
        ...current,
        {
          id: localUserId,
          local_id: localUserId,
          created_at: new Date().toISOString(),
          content: {
            type: "user",
            message: [{ type: "plain", text: messageText }],
          },
        },
        {
          id: localBotId,
          local_id: localBotId,
          created_at: new Date().toISOString(),
          content: {
            type: "bot",
            message: [],
            isLoading: true,
          },
        },
      ]);

      setIsSending(true);
      setNotice(i18n.t("tui.chat.streamingResponse", "Streaming response..."));
      const abort = new AbortController();
      abortRef.current = abort;

      const updateBot = (updater: (record: ChatRecord) => ChatRecord) => {
        setMessages((current) =>
          current.map((record) =>
            record.local_id === localBotId ? updater(record) : record,
          ),
        );
      };

      let streamFailed = false;
      try {
        for await (const payload of recoverChatStream(client, selectedSession.session_id, client.sendMessage(selectedSession.session_id, messageText, {
          signal: abort.signal,
        }), abort.signal)) {
          const type = String(payload.type || payload.t || "");
          const data = payload.data;

          if (type === "user_message_saved") {
            setMessages((current) =>
              current.map((record) =>
                record.local_id === localUserId
                  ? {
                      ...record,
                      id: (data as { id?: string | number })?.id || record.id,
                      created_at:
                        (data as { created_at?: string })?.created_at ||
                        record.created_at,
                      llm_checkpoint_id:
                        (data as { llm_checkpoint_id?: string })?.llm_checkpoint_id ||
                        record.llm_checkpoint_id,
                    }
                  : record,
              ),
            );
            continue;
          }

          if (type === "error") {
            streamFailed = true;
            setNotice(payloadText(data));
          }
          updateBot((record) => applyChatEvent(record, payload));
        }
        if (!streamFailed && selectedSessionRef.current === selectedSession.session_id) setNotice(i18n.t("tui.chat.responseComplete", "Response complete."));
      } catch (error) {
        if (!abort.signal.aborted) {
          streamFailed = true;
          updateBot((record) =>
            appendPlainPart(record, `\n${messageFromUnknown(error)}`),
          );
          setNotice(messageFromUnknown(error));
        }
      } finally {
        updateBot((record) => ({ ...record, content: { ...record.content, isLoading: false } }));
        if (abortRef.current === abort) {
          abortRef.current = null;
          setIsSending(false);
          if (selectedSessionRef.current === selectedSession.session_id) {
            await loadSessions(selectedSession.session_id).catch(() => undefined);
            if (!abort.signal.aborted && !streamFailed) await loadSessionMessages(selectedSession.session_id).catch(() => undefined);
          }
        }
      }
    },
    [client, createSession, i18n, isSending, loadSessionMessages, loadSessions, refreshAll, selectedSession, selectedSessionId],
  );


  const sessionViewportHeight = Math.max(1, layout.bodyHeight - (sessionFilter ? 9 : 8));
  const sessionWindowStart = useMemo(() => {
    if (selectedFilteredIndex < 0) {
      return 0;
    }
    const maxStart = Math.max(0, filteredSessions.length - sessionViewportHeight);
    return Math.min(maxStart, Math.max(0, selectedFilteredIndex - sessionViewportHeight + 1));
  }, [filteredSessions.length, selectedFilteredIndex, sessionViewportHeight]);

  const visibleSessions = useMemo(
    () =>
      filteredSessions.slice(
        sessionWindowStart,
        sessionWindowStart + sessionViewportHeight,
      ),
    [filteredSessions, sessionViewportHeight, sessionWindowStart],
  );

  const allMessageRows = useMemo<MessageRow[]>(() => {
    const wrapWidth = Math.max(16, Math.min(88, layout.contentWidth - 6));
    return messages.flatMap((record, recordIndex) => {
      const role = record.content.type === "user" ? "user" : "bot";
      const recordKey = String(record.local_id ?? record.id ?? recordIndex);
      const body =
        textFromParts(record.content.message).trim() ||
        (record.content.isLoading ? "..." : " ");
      const lines = wrapText(body, wrapWidth);
      const nextRows: MessageRow[] = [];
      if (recordIndex > 0) {
        nextRows.push({ id: `${recordKey}-space`, role: "space", text: "" });
      }
      nextRows.push({
        id: `${recordKey}-label`,
        role,
        text: role === "user" ? i18n.t("features.chat.message.user", "User") : "AstrBot",
        label: true,
      });
      lines.forEach((line, lineIndex) => {
        nextRows.push({
          id: `${recordKey}-${lineIndex}`,
          role,
          text: line,
        });
      });
      return nextRows;
    });
  }, [i18n, layout.contentWidth, messages]);

  const messageViewportHeight = Math.max(1, layout.bodyHeight - 2);
  const maxMessageScrollOffset = Math.max(0, allMessageRows.length - messageViewportHeight);

  useEffect(() => {
    setMessageScrollOffset((current) =>
      Math.min(current, Math.max(0, allMessageRows.length - messageViewportHeight)),
    );
  }, [allMessageRows.length, messageViewportHeight]);

  const visibleMessageRows = useMemo(() => {
    if (!allMessageRows.length) {
      return [];
    }
    const end = Math.max(
      messageViewportHeight,
      allMessageRows.length - Math.min(messageScrollOffset, maxMessageScrollOffset),
    );
    const start = Math.max(0, end - messageViewportHeight);
    return allMessageRows.slice(start, end);
  }, [
    allMessageRows,
    maxMessageScrollOffset,
    messageScrollOffset,
    messageViewportHeight,
  ]);

  const consoleLines = useMemo(
    () => buildConsoleLines(logs, layout.contentWidth),
    [layout.contentWidth, logs],
  );

  const consoleViewportHeight = Math.max(1, layout.bodyHeight - 2);
  const maxConsoleScrollOffset = Math.max(0, consoleLines.length - consoleViewportHeight);

  useEffect(() => {
    setConsoleScrollOffset((current) =>
      Math.min(current, Math.max(0, consoleLines.length - consoleViewportHeight)),
    );
  }, [consoleLines.length, consoleViewportHeight]);

  const visibleConsoleLines = useMemo(() => {
    if (!consoleLines.length) {
      return [];
    }
    const end = Math.max(
      consoleViewportHeight,
      consoleLines.length - Math.min(consoleScrollOffset, maxConsoleScrollOffset),
    );
    const start = Math.max(0, end - consoleViewportHeight);
    return consoleLines.slice(start, end);
  }, [
    consoleLines,
    consoleScrollOffset,
    consoleViewportHeight,
    maxConsoleScrollOffset,
  ]);

  const selectedCommand = commands[selectedCommandIndex] || null;
  const commandsViewportHeight = Math.max(1, layout.bodyHeight - 6);
  const commandWindowStart = useMemo(() => {
    const maxStart = Math.max(0, commands.length - commandsViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedCommandIndex - commandsViewportHeight + 1),
    );
  }, [commands.length, commandsViewportHeight, selectedCommandIndex]);

  const visibleCommands = useMemo(
    () => commands.slice(commandWindowStart, commandWindowStart + commandsViewportHeight),
    [commandWindowStart, commands, commandsViewportHeight],
  );

  const selectedTool = tools[selectedToolIndex] || null;
  const toolWindowStart = useMemo(() => {
    const maxStart = Math.max(0, tools.length - commandsViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedToolIndex - commandsViewportHeight + 1),
    );
  }, [commandsViewportHeight, selectedToolIndex, tools.length]);

  const visibleTools = useMemo(
    () => tools.slice(toolWindowStart, toolWindowStart + commandsViewportHeight),
    [commandsViewportHeight, toolWindowStart, tools],
  );

  const pluginPanelHeight = Math.max(1, layout.bodyHeight - 3);
  const pluginViewportHeight = Math.max(1, pluginPanelHeight - 4);
  const marketPluginViewportHeight = pluginViewportHeight;
  const pluginWindowStart = useMemo(() => {
    const maxStart = Math.max(0, plugins.length - pluginViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedPluginIndex - pluginViewportHeight + 1),
    );
  }, [plugins.length, pluginViewportHeight, selectedPluginIndex]);
  const visiblePlugins = useMemo(
    () => plugins.slice(pluginWindowStart, pluginWindowStart + pluginViewportHeight),
    [pluginWindowStart, plugins, pluginViewportHeight],
  );
  const marketPluginWindowStart = useMemo(() => {
    const maxStart = Math.max(0, filteredMarketPlugins.length - marketPluginViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedMarketPluginIndex - marketPluginViewportHeight + 1),
    );
  }, [filteredMarketPlugins.length, marketPluginViewportHeight, selectedMarketPluginIndex]);
  const visibleMarketPlugins = useMemo(
    () =>
      filteredMarketPlugins.slice(
        marketPluginWindowStart,
        marketPluginWindowStart + marketPluginViewportHeight,
      ),
    [filteredMarketPlugins, marketPluginWindowStart, marketPluginViewportHeight],
  );
  const marketDetailViewportHeight = Math.max(1, pluginPanelHeight - 2);
  const pluginDetailFixedRows =
    1 +
    1 +
    4 +
    (selectedPlugin?.reserved ? 1 : 0) +
    (selectedPlugin?.support_platforms?.length ? 1 : 0) +
    (selectedPlugin?.astrbot_version ? 1 : 0) +
    1 +
    1 +
    1 +
    1 +
    1;
  const pluginConfigPreviewHeight =
    pluginPane === "config" &&
    selectedPluginConfigSettings.length &&
    !editingPluginConfigSettingKey
      ? selectedPluginConfigSetting?.hint
        ? 6
        : 5
      : 0;
  const pluginDetailListBudget = Math.max(
    2,
    pluginPanelHeight - 2 - pluginDetailFixedRows - pluginConfigPreviewHeight,
  );
  const pluginComponentViewportHeight = Math.max(
    1,
    Math.min(
      selectedPluginComponents.length || 1,
      Math.floor(pluginDetailListBudget / 2),
    ),
  );
  const pluginConfigViewportHeight = Math.max(
    1,
    pluginDetailListBudget - pluginComponentViewportHeight,
  );
  const pluginComponentWindowStart = useMemo(() => {
    const maxStart = Math.max(0, selectedPluginComponents.length - pluginComponentViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedPluginComponentIndex - pluginComponentViewportHeight + 1),
    );
  }, [
    pluginComponentViewportHeight,
    selectedPluginComponentIndex,
    selectedPluginComponents.length,
  ]);
  const visiblePluginComponents = useMemo(
    () =>
      selectedPluginComponents.slice(
        pluginComponentWindowStart,
        pluginComponentWindowStart + pluginComponentViewportHeight,
      ),
    [
      pluginComponentViewportHeight,
      pluginComponentWindowStart,
      selectedPluginComponents,
    ],
  );
  const pluginConfigWindowStart = useMemo(() => {
    const maxStart = Math.max(0, selectedPluginConfigSettings.length - pluginConfigViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedPluginConfigSettingIndex - pluginConfigViewportHeight + 1),
    );
  }, [
    pluginConfigViewportHeight,
    selectedPluginConfigSettingIndex,
    selectedPluginConfigSettings.length,
  ]);
  const visiblePluginConfigSettings = useMemo(
    () =>
      selectedPluginConfigSettings.slice(
        pluginConfigWindowStart,
        pluginConfigWindowStart + pluginConfigViewportHeight,
      ),
    [
      pluginConfigViewportHeight,
      pluginConfigWindowStart,
      selectedPluginConfigSettings,
    ],
  );
  const configFileViewportHeight = Math.max(1, layout.bodyHeight - 8);
  const abconfWindowStart = useMemo(() => {
    const maxStart = Math.max(0, abconfs.length - configFileViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedAbconfIndex - configFileViewportHeight + 1),
    );
  }, [abconfs.length, configFileViewportHeight, selectedAbconfIndex]);
  const visibleAbconfs = useMemo(
    () => abconfs.slice(abconfWindowStart, abconfWindowStart + configFileViewportHeight),
    [abconfWindowStart, abconfs, configFileViewportHeight],
  );
  const configSettingViewportHeight = Math.max(1, layout.bodyHeight - 12);
  const selectedConfigGroupSettingIndex = Math.max(
    0,
    selectedConfigGroupSettings.findIndex((setting) => setting.id === selectedConfigSetting?.id),
  );
  const configSettingWindowStart = useMemo(() => {
    const maxStart = Math.max(0, selectedConfigGroupSettings.length - configSettingViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedConfigGroupSettingIndex - configSettingViewportHeight + 1),
    );
  }, [
    configSettingViewportHeight,
    selectedConfigGroupSettingIndex,
    selectedConfigGroupSettings.length,
  ]);
  const visibleConfigSettings = useMemo(
    () =>
      selectedConfigGroupSettings.slice(
        configSettingWindowStart,
        configSettingWindowStart + configSettingViewportHeight,
      ),
    [
      configSettingViewportHeight,
      configSettingWindowStart,
      selectedConfigGroupSettings,
    ],
  );
  const selectedConfigVisibleSettingIndex = selectedConfigGroupSettingIndex;
  const personaViewportHeight = Math.max(1, layout.bodyHeight - 5);
  const personaWindowStart = useMemo(() => {
    const maxStart = Math.max(0, agentEntries.length - personaViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedAgentEntryIndex - personaViewportHeight + 1),
    );
  }, [agentEntries.length, personaViewportHeight, selectedAgentEntryIndex]);
  const visibleAgentEntries = useMemo(
    () => agentEntries.slice(personaWindowStart, personaWindowStart + personaViewportHeight),
    [agentEntries, personaWindowStart, personaViewportHeight],
  );
  const currentPersonaFolderName =
    currentPersonaFolder?.name ||
    i18n.t("features.persona.folder.rootFolder", "Root Folder");
  const currentPersonaFolderPath = currentPersonaFolderPathItems.length
    ? currentPersonaFolderPathItems.map((folder) => folder.name).join(" / ")
    : currentPersonaFolderName;

  const currentSessionTitle = selectedSession
    ? sessionTitle(selectedSession)
    : i18n.t("tui.chat.newChatTitle", "New chat");
  const headerMeta = `${username || i18n.t("core.navigation.dashboard", "Dashboard")} @ ${serverUrl} (${tokenStoreKind})`;
  const sessionTitleText = sessionFilter
    ? i18n.t("tui.chat.chatsFiltered", "Chats {shown}/{total}", {
        shown: filteredSessions.length,
        total: sessions.length,
      })
    : i18n.t("tui.chat.chats", "Chats");
  const chatMeta = [
    isSending ? i18n.t("tui.chat.streaming", "streaming") : "",
    messageScrollOffset > 0
      ? i18n.t("tui.chat.history", "history +{count}", { count: messageScrollOffset })
      : "",
  ].filter(Boolean);
  const consoleMeta = consoleScrollOffset > 0
    ? i18n.t("tui.console.history", "history +{count}", { count: consoleScrollOffset })
    : i18n.t("tui.console.liveTail", "live tail");
  const toolSummary = tools.length
    ? i18n.t("tui.commands.totalSummary", "{total} total, {disabled} disabled, {readonly} readonly", {
        total: tools.length,
        disabled: tools.filter((tool) => !tool.active).length,
        readonly: tools.filter((tool) => tool.readonly).length,
      })
    : "";
  const componentSummary =
    componentsView === "tools"
      ? toolSummary
        ? `${i18n.t("tui.commands.tools", "Tools")} ${toolSummary}`
        : i18n.t("tui.commands.tools", "Tools")
      : commandSummary
        ? `${i18n.t("core.navigation.commands", "Commands")} ${commandSummary}`
        : i18n.t("core.navigation.commands", "Commands");
  const commandMeta =
    componentsView === "tools"
      ? tools.length
        ? `${selectedToolIndex + 1}/${tools.length}  ${i18n.t("tui.commands.enterToggles", "Enter toggles")}`
        : i18n.t("tui.commands.loadingToolsShort", "loading tools")
      : commands.length
        ? `${selectedCommandIndex + 1}/${commands.length}  ${i18n.t("tui.commands.enterToggles", "Enter toggles")}`
        : i18n.t("tui.commands.loadingCommandsShort", "loading commands");
  const providerSourceViewportHeight = Math.max(1, layout.bodyHeight - 7);
  const providerListViewportHeight = Math.max(
    1,
    layout.bodyHeight - (providerUsesSourceLayout ? 13 : 6),
  );
  const providerSourceWindowStart = useMemo(() => {
    const maxStart = Math.max(0, providerSources.length - providerSourceViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedProviderSourceIndex - providerSourceViewportHeight + 1),
    );
  }, [providerSources.length, providerSourceViewportHeight, selectedProviderSourceIndex]);
  const visibleProviderSources = useMemo(
    () => providerSources.slice(
      providerSourceWindowStart,
      providerSourceWindowStart + providerSourceViewportHeight,
    ),
    [providerSourceWindowStart, providerSources, providerSourceViewportHeight],
  );
  const providerWindowStart = useMemo(() => {
    const maxStart = Math.max(0, selectedProviderEntries.length - providerListViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedProviderIndex - providerListViewportHeight + 1),
    );
  }, [selectedProviderEntries.length, providerListViewportHeight, selectedProviderIndex]);
  const visibleProviderEntries = useMemo(
    () => selectedProviderEntries.slice(
      providerWindowStart,
      providerWindowStart + providerListViewportHeight,
    ),
    [selectedProviderEntries, providerWindowStart, providerListViewportHeight],
  );
  const platformViewportHeight = Math.max(1, layout.bodyHeight - 5);
  const platformWindowStart = useMemo(() => {
    const maxStart = Math.max(0, platforms.length - platformViewportHeight);
    return Math.min(
      maxStart,
      Math.max(0, selectedPlatformIndex - platformViewportHeight + 1),
    );
  }, [platforms.length, platformViewportHeight, selectedPlatformIndex]);
  const visiblePlatforms = useMemo(
    () => platforms.slice(platformWindowStart, platformWindowStart + platformViewportHeight),
    [platformWindowStart, platforms, platformViewportHeight],
  );
  const statusViewportHeight = Math.max(1, layout.bodyHeight - 1);
  const statusLines = useMemo(
    () =>
      buildStatusLines({
        stats,
        providerStats,
        version,
        width: layout.contentWidth,
        tokenRange,
        updatedAt: lastStatsUpdatedAt,
        i18n,
      }),
    [
      lastStatsUpdatedAt,
      layout.contentWidth,
      providerStats,
      stats,
      tokenRange,
      version,
      i18n,
    ],
  );
  const maxStatusScrollOffset = Math.max(0, statusLines.length - statusViewportHeight);

  useEffect(() => {
    setStatusScrollOffset((current) =>
      Math.min(current, Math.max(0, statusLines.length - statusViewportHeight)),
    );
  }, [statusLines.length, statusViewportHeight]);

  const visibleStatusLines = useMemo(
    () =>
      statusLines.slice(
        Math.min(statusScrollOffset, maxStatusScrollOffset),
        Math.min(statusScrollOffset, maxStatusScrollOffset) + statusViewportHeight,
      ),
    [maxStatusScrollOffset, statusLines, statusScrollOffset, statusViewportHeight],
  );

  const inputCtx: InputContext = {
    ...ctx,
    refreshAll,
    activeView,
    agentEditCursor,
    agentEditValue,
    agentFields,
    agentPane,
    abconfs,
    applyPluginConfigSettingValue,
    beginCreatePlatform,
    beginCreateProvider,
    beginCreateProviderSource,
    beginEditAgentField,
    beginEditConfigSetting,
    beginEditPlatformSetting,
    beginEditPluginConfigSetting,
    beginEditProviderConfigSetting,
    beginEditProviderSourceSetting,
    beginEditSelectedPersona,
    cancelCreatePlatform,
    cancelCreateProvider,
    cancelCreateProviderSource,
    cancelEditAgentField,
    cancelEditConfigSetting,
    cancelEditPlatformSetting,
    cancelEditPluginConfigSetting,
    cancelEditProviderConfig,
    cancelEditProviderConfigSetting,
    cancelEditProviderSourceSetting,
    cancelPersonaEdit,
    commandSummary,
    commands,
    componentsView,
    configEditCursor,
    configEditValue,
    configFileActionDialog,
    configPane,
    configTab,
    confirmPendingMarketInstallWarning,
    consoleScrollOffset,
    createSession,
    defaultProviderModelAction,
    editingAgentFieldKey,
    editingConfigSettingKey,
    editingPersonaDraft,
    editingPersonaOriginal,
    editingPlatformSettingKey,
    editingPluginConfigSettingKey,
    editingProviderConfig,
    editingProviderConfigSettingKey,
    editingProviderOriginalId,
    editingProviderSourceSettingKey,
    executePluginFileDialogAction,
    executePluginObjectEditorAction,
    executePluginTemplateListDialog,
    executeConfigFileActionDialog,
    executePersonaFolderDialog,
    executeSelectedAgentAction,
    executeSelectedConfigFileAction,
    executeSelectedMarketPluginAction,
    executeSelectedPlatformAction,
    executeSelectedPluginAction,
    executeSelectedPluginDetailAction,
    executeSelectedProviderModelAction,
    executeSelectedProviderSourceAction,
    exit,
    filteredMarketPlugins,
    filteredSessions,
    i18n,
    input,
    isCreatingPersona,
    isCreatingPlatform,
    isCreatingProvider,
    isCreatingProviderSource,
    isEditingMarketFilter,
    isEditingPersona,
    isSending,
    isTogglingCommand,
    isTogglingPlatform,
    isTogglingProvider,
    loadingConfig,
    lastStatsUpdatedAt,
    layout,
    loadingPluginConfigName,
    loadingPluginDetailName,
    loadingProviderSourceModelsId,
    logs,
    marketDetailScrollOffset,
    marketFilter,
    marketFilterCursor,
    marketPlugins,
    maxConsoleScrollOffset,
    maxMessageScrollOffset,
    maxStatusScrollOffset,
    messageScrollOffset,
    messages,
    pendingMarketInstallWarning,
    pendingConfigDeleteId,
    pendingMarketPluginKey,
    pendingPersonaDeleteId,
    pendingPlatformDelete,
    pendingPluginDeleteName,
    pendingProviderDelete,
    personas,
    platformEditCursor,
    platformEditValue,
    platformPane,
    platformRegistration,
    platformStats,
    platformTemplates,
    platforms,
    pluginConfigChoiceDialog,
    pluginConfigEditCursor,
    pluginConfigEditValue,
    pluginConfigTemplateListDialog,
    pluginConfigs,
    pluginDetails,
    pluginFileDialog,
    pluginObjectEditor,
    pluginPane,
    pluginTab,
    pluginTemplateFieldEdit,
    plugins,
    providerConfigEditCursor,
    providerConfigEditValue,
    providerConfigSettings,
    providerPane,
    providerSourceEditCursor,
    providerSourceEditValue,
    providerSourceModels,
    providerSourceSettings,
    providerSourceTemplates,
    providerSources,
    providerStats,
    providerStatuses,
    providerTemplate,
    providerTemplates,
    providerType,
    providerUsesSourceLayout,
    saveConfigSetting,
    saveAgentField,
    savePlatformCreate,
    savePlatformSetting,
    savePluginConfigSetting,
    savePluginObjectEditorField,
    savePluginTemplateFieldEdit,
    saveProviderConfigField,
    saveProviderCreate,
    saveProviderSourceCreate,
    saveProviderSourceSetting,
    selectedAgentAction,
    selectedAgentActions,
    selectedAgentEntry,
    agentEntries,
    selectedAbconfIndex,
    selectedAgentEntryIndex,
    selectedAgentFieldIndex,
    selectedConfigFileAction,
    selectedConfigGroupIndex,
    selectedConfigGroups,
    selectedConfigGroupSettings,
    selectedConfigSettingIndex,
    selectedConfigSettings,
    selectedConfigVisibleSettingIndex,
    selectedCommandIndex,
    selectedFilteredIndex,
    selectedMarketPluginIndex,
    selectedPersonaIndex,
    selectedPlatformAction,
    selectedPlatformActions,
    selectedPlatformIndex,
    selectedPlatformSettingIndex,
    selectedPlatformSettings,
    selectedPlatformTemplateIndex,
    selectedPluginAction,
    selectedPluginComponentIndex,
    selectedPluginComponents,
    selectedPluginConfigSettingIndex,
    selectedPluginConfigSettings,
    selectedPluginDetailAction,
    selectedPluginIndex,
    selectedProviderConfigSettingIndex,
    selectedProviderEntries,
    selectedProviderEntry,
    selectedProviderIndex,
    selectedProviderModelAction,
    selectedProviderSourceAction,
    selectedProviderSourceIndex,
    selectedProviderSourceSettingIndex,
    selectedProviderSourceTemplateIndex,
    selectedProviderTemplateIndex,
    selectedSessionId,
    selectedSidebarAction,
    selectedToolIndex,
    sendMessage,
    sessionFilter,
    sessions,
    setActiveView,
    setAgentEditCursor,
    setAgentEditValue,
    setAgentPane,
    setConfigEditCursor,
    setConfigEditValue,
    setConfigFileActionDialog,
    setConfigPane,
    setConfigTab,
    setSelectedConfigGroupIndex,
    setCommandSummary,
    setCommands,
    setComponentsView,
    setConsoleScrollOffset,
    setEditingAgentFieldKey,
    setEditingConfigSettingKey,
    setEditingPersonaDraft,
    setEditingPersonaOriginal,
    setEditingPlatformSettingKey,
    setEditingPluginConfigSettingKey,
    setEditingProviderConfig,
    setEditingProviderConfigSettingKey,
    setEditingProviderOriginalId,
    setEditingProviderSourceSettingKey,
    setInput,
    setIsCreatingPersona,
    setIsCreatingPlatform,
    setIsCreatingProvider,
    setIsCreatingProviderSource,
    setIsEditingMarketFilter,
    setIsSending,
    setIsTogglingCommand,
    setIsTogglingPlatform,
    setIsTogglingProvider,
    setLastStatsUpdatedAt,
    setLoadingPluginConfigName,
    setLoadingPluginDetailName,
    setLoadingProviderSourceModelsId,
    setLogs,
    setMarketDetailScrollOffset,
    setMarketFilter,
    setMarketFilterCursor,
    setMarketPlugins,
    setMessageScrollOffset,
    setMessages,
    setNotice,
    setPendingMarketInstallWarning,
    setPendingConfigDeleteId,
    setPendingMarketPluginKey,
    setPendingPersonaDeleteId,
    setPendingPlatformDelete,
    setPendingPluginDeleteName,
    setPendingProviderDelete,
    setPersonas,
    setPlatformEditCursor,
    setPlatformEditValue,
    setPlatformPane,
    setPlatformRegistration,
    setPlatformStats,
    setPlatforms,
    setPluginConfigChoiceDialog,
    setPluginConfigEditCursor,
    setPluginConfigEditValue,
    setPluginConfigTemplateListDialog,
    setPluginConfigs,
    setPluginDetails,
    setPluginFileDialog,
    setPluginObjectEditor,
    setPluginPane,
    setPluginTab,
    setPluginTemplateFieldEdit,
    setPlugins,
    setProviderConfigEditCursor,
    setProviderConfigEditValue,
    setProviderPane,
    setProviderSourceEditCursor,
    setProviderSourceEditValue,
    setProviderSourceModels,
    setProviderStats,
    setProviderStatuses,
    setProviderTemplate,
    setProviderType,
    setSelectedAgentAction,
    setSelectedAbconfIndex,
    setSelectedAgentEntryIndex,
    setSelectedAgentFieldIndex,
    setSelectedConfigFileAction,
    setSelectedConfigSettingIndex,
    setSelectedCommandIndex,
    setSelectedMarketPluginIndex,
    setSelectedPersonaIndex,
    setSelectedPlatformAction,
    setSelectedPlatformIndex,
    setSelectedPlatformSettingIndex,
    setSelectedPlatformTemplateIndex,
    setSelectedPluginAction,
    setSelectedPluginComponentIndex,
    setSelectedPluginConfigSettingIndex,
    setSelectedPluginDetailAction,
    setSelectedPluginIndex,
    setSelectedProviderConfigSettingIndex,
    setSelectedProviderIndex,
    setSelectedProviderModelAction,
    setSelectedProviderSourceAction,
    setSelectedProviderSourceIndex,
    setSelectedProviderSourceSettingIndex,
    setSelectedProviderSourceTemplateIndex,
    setSelectedProviderTemplateIndex,
    setSelectedSessionId,
    setSelectedSidebarAction,
    setSelectedToolIndex,
    setSessionFilter,
    setSessions,
    setStats,
    setStatsHistory,
    setStatusScrollOffset,
    setTestingProviderId,
    setTokenRange,
    setTools,
    setVersion,
    setWorkingMarketPluginName,
    setWorkingPersonaId,
    setWorkingPluginName,
    savingConfig,
    startPlatformLogin,
    stats,
    statsHistory,
    statusScrollOffset,
    testingProviderId,
    toggleSelectedCommand,
    toggleSelectedTool,
    tokenRange,
    tools,
    version,
    workingMarketPluginName,
    workingPersonaId,
    workingPluginName,
  };
  useTerminalInput((value, key) => handleInput(value, key, inputCtx));
  return {
    abortRef,
    addSelectedAvailableProviderModel,
    agentFields,
    agentEntries,
    allMessageRows,
    applyAgentFieldValue,
    applyPluginConfigSettingValue,
    applyPluginFileDialogSelection,
    applyPluginObjectEditorValue,
    applyPluginTemplateListValue,
    applyStats,
    beginCreatePersona,
    beginCreatePlatform,
    beginCreateProvider,
    beginCreateProviderSource,
    beginEditAgentField,
    beginEditPlatformSetting,
    beginEditPluginConfigSetting,
    beginEditProviderConfig,
    beginEditProviderConfigSetting,
    beginEditProviderSourceSetting,
    beginEditSelectedPersona,
    cancelCreatePlatform,
    cancelCreateProvider,
    cancelCreateProviderSource,
    cancelEditAgentField,
    cancelEditPlatformSetting,
    cancelEditPluginConfigSetting,
    cancelEditProviderConfig,
    cancelEditProviderConfigSetting,
    cancelEditProviderSourceSetting,
    cancelPersonaEdit,
    chatMeta,
    commandMeta,
    commandWindowStart,
    commandsViewportHeight,
    componentSummary,
    confirmPendingMarketInstallWarning,
    consoleLines,
    consoleMeta,
    consoleViewportHeight,
    createSession,
    abconfWindowStart,
    configFileViewportHeight,
    configSettingViewportHeight,
    configSettingWindowStart,
    currentSessionTitle,
    defaultProviderListAction,
    defaultProviderModelAction,
    deleteSelectedPersona,
    deleteSelectedPlatform,
    deleteSelectedProvider,
    deleteSelectedProviderSource,
    executePluginFileDialogAction,
    executeConfigFileActionDialog,
    executePersonaFolderDialog,
    executePluginObjectEditorAction,
    executePluginTemplateListDialog,
    executeSelectedAgentAction,
    executeSelectedConfigFileAction,
    executeSelectedMarketPluginAction,
    executeSelectedPlatformAction,
    executeSelectedPluginAction,
    executeSelectedPluginDetailAction,
    executeSelectedProviderModelAction,
    executeSelectedProviderSourceAction,
    fetchSelectedPluginConfig,
    fetchSelectedPluginDetail,
    fetchSelectedProviderSourceModels,
    filteredMarketPlugins,
    filteredSessions,
    headerMeta,
    isEditingPersona,
    layout,
    loadPluginConfigSpecialChoices,
    loadConfigList,
    loadNormalConfig,
    loadSystemConfig,
    loadPluginTemplateSpecialChoices,
    loadSessionMessages,
    loadSessions,
    marketDetailViewportHeight,
    marketPluginViewportHeight,
    marketPluginWindowStart,
    maxConsoleScrollOffset,
    maxMessageScrollOffset,
    maxStatusScrollOffset,
    messageViewportHeight,
    openPluginConfigChoices,
    openPluginFileDialog,
    openPluginObjectEditor,
    openPluginTemplateField,
    openPluginTemplateList,
    personaViewportHeight,
    personaWindowStart,
    currentPersonaFolderName,
    currentPersonaFolderPath,
    platformTemplates,
    platformViewportHeight,
    platformWindowStart,
    pluginComponentViewportHeight,
    pluginComponentWindowStart,
    pluginConfigPreviewHeight,
    pluginConfigViewportHeight,
    pluginConfigWindowStart,
    pluginDetailFixedRows,
    pluginDetailListBudget,
    pluginPanelHeight,
    pluginViewportHeight,
    pluginWindowStart,
    providerConfigSettings,
    providerListViewportHeight,
    providerRows,
    providerSourceSettings,
    providerSourceTemplates,
    providerSourceViewportHeight,
    providerSourceWindowStart,
    providerSources,
    providerTemplates,
    providerUsesSourceLayout,
    providerWindowStart,
    refreshAll,
    refreshStats,
    reloadCommands,
    reloadConfigs,
    reloadPersonas,
    reloadPlatformStats,
    reloadPlatforms,
    reloadPluginMarket,
    reloadPlugins,
    reloadProviders,
    reloadSelectedPlugin,
    reloadTools,
    saveAgentField,
    saveConfigSetting,
    savePersonaDraft,
    savePlatformCreate,
    savePlatformSetting,
    savePluginConfigSetting,
    savePluginObjectEditorField,
    savePluginTemplateField,
    savePluginTemplateFieldEdit,
    saveProviderConfigField,
    saveProviderConfigValue,
    saveProviderCreate,
    saveProviderSourceCreate,
    saveProviderSourceSetting,
    selectedAgentActions,
    selectedAgentEntry,
    selectedAbconf,
    selectedAgentField,
    selectedAvailableProviderModels,
    selectedCommand,
    selectedConfigFileAction,
    selectedConfigGroupIndex,
    selectedConfigGroups,
    selectedConfigGroupSettings,
    selectedConfigPayload,
    selectedConfigSetting,
    selectedConfigSettings,
    selectedConfigVisibleSettingIndex,
    selectedFilteredIndex,
    selectedMarketPlugin,
    selectedPersona,
    selectedPlatform,
    selectedPlatformActions,
    selectedPlatformSetting,
    selectedPlatformSettings,
    selectedPlugin,
    selectedPluginComponents,
    selectedPluginConfig,
    selectedPluginConfigSetting,
    selectedPluginConfigSettings,
    selectedPluginDetail,
    selectedProviderConfigSetting,
    selectedProviderEntries,
    selectedProviderEntry,
    selectedProviderRows,
    selectedProviderSource,
    selectedProviderSourceSetting,
    selectedSession,
    selectedTool,
    sendMessage,
    sessionTitleText,
    sessionViewportHeight,
    sessionWindowStart,
    showChatSidebar,
    sourceProviderRows,
    startPlatformLogin,
    statusLines,
    statusViewportHeight,
    testSelectedProvider,
    toggleSelectedCommand,
    toggleSelectedPlatform,
    toggleSelectedPlugin,
    toggleSelectedProvider,
    toggleSelectedProviderSource,
    toggleSelectedTool,
    toolSummary,
    toolWindowStart,
    uninstallSelectedPlugin,
    updatePluginTemplateListDialogValue,
    updateSelectedPlugin,
    visibleCommands,
    visibleAbconfs,
    visibleConfigSettings,
    visibleConsoleLines,
    visibleMarketPlugins,
    visibleMessageRows,
    visibleAgentEntries,
    visiblePlatforms,
    visiblePluginComponents,
    visiblePluginConfigSettings,
    visiblePlugins,
    visibleProviderEntries,
    visibleProviderSources,
    visibleSessions,
    visibleStatusLines,
    visibleTools,
  };
}

function findPersonaFolderInTree(
  folders: PersonaFolder[],
  folderId: string | null,
): PersonaFolder | null {
  if (!folderId) {
    return null;
  }
  for (const folder of folders) {
    if (folder.folder_id === folderId) {
      return folder;
    }
    const child = findPersonaFolderInTree(folder.children || [], folderId);
    if (child) {
      return child;
    }
  }
  return null;
}

function personaFolderPath(
  folders: PersonaFolder[],
  folderId: string | null,
): PersonaFolder[] {
  if (!folderId) {
    return [];
  }
  for (const folder of folders) {
    if (folder.folder_id === folderId) {
      return [folder];
    }
    const childPath = personaFolderPath(folder.children || [], folderId);
    if (childPath.length) {
      return [folder, ...childPath];
    }
  }
  return [];
}
