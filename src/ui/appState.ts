import { useState } from "react";
import type {
  ChatRecord,
  ChatSession,
  CommandItem,
  AbconfInfo,
  LiveLogPayload,
  AstrBotConfigPayload,
  PersonaFolder,
  PersonaItem,
  PlatformConfig,
  PlatformRuntimeStat,
  PluginConfigPayload,
  PluginDetail,
  PluginItem,
  PluginMarketItem,
  ProviderCheckResult,
  ProviderConfig,
  ProviderTokenStats,
  ProviderTemplatePayload,
  RuntimeStats,
  TokenRange,
  ToolItem,
  VersionPayload,
} from "../api/types.js";
import type { AgentAction, AgentField, AgentPane } from "./AgentsView.js";
import type { SidebarAction } from "./ChatView.js";
import type { ComponentsView } from "./CommandsView.js";
import type { PlatformAction, PlatformPane } from "./PlatformsView.js";
import type {
  PluginAction,
  PluginDetailAction,
  PluginPane,
  PluginTab,
} from "./PluginsView.js";
import type {
  AvailableProviderModel,
  ProviderModelAction,
  ProviderPane,
  ProviderSourceAction,
  ProviderType,
} from "./ProvidersView.js";
import type { StatSample } from "./StatusView.js";
import type {
  PendingMarketInstallWarning,
  PendingPlatformDelete,
  PendingProviderDelete,
  PlatformRegistrationFlow,
  ConfigFileActionDialogState,
  ConfigPane,
  ConfigTab,
  PluginConfigChoiceDialogState,
  PluginConfigTemplateListDialogState,
  PluginFileDialogState,
  PluginObjectEditorState,
  PluginTemplateFieldEditState,
} from "./App.types.js";

export function useChatState() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState("");
  const [messageScrollOffset, setMessageScrollOffset] = useState(0);
  const [messages, setMessages] = useState<ChatRecord[]>([]);
  const [selectedSidebarAction, setSelectedSidebarAction] = useState<SidebarAction>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  return {
    sessions,
    setSessions,
    selectedSessionId,
    setSelectedSessionId,
    sessionFilter,
    setSessionFilter,
    messageScrollOffset,
    setMessageScrollOffset,
    messages,
    setMessages,
    selectedSidebarAction,
    setSelectedSidebarAction,
    input,
    setInput,
    isSending,
    setIsSending,
  };
}

export function useStatusState() {
  const [logs, setLogs] = useState<LiveLogPayload[]>([]);
  const [stats, setStats] = useState<RuntimeStats | null>(null);
  const [statsHistory, setStatsHistory] = useState<StatSample[]>([]);
  const [providerStats, setProviderStats] = useState<ProviderTokenStats | null>(null);
  const [tokenRange, setTokenRange] = useState<TokenRange>(1);
  const [lastStatsUpdatedAt, setLastStatsUpdatedAt] = useState<Date | null>(null);
  const [version, setVersion] = useState<VersionPayload | null>(null);
  const [consoleScrollOffset, setConsoleScrollOffset] = useState(0);
  const [statusScrollOffset, setStatusScrollOffset] = useState(0);
  return {
    logs,
    setLogs,
    stats,
    setStats,
    statsHistory,
    setStatsHistory,
    providerStats,
    setProviderStats,
    tokenRange,
    setTokenRange,
    lastStatsUpdatedAt,
    setLastStatsUpdatedAt,
    version,
    setVersion,
    consoleScrollOffset,
    setConsoleScrollOffset,
    statusScrollOffset,
    setStatusScrollOffset,
  };
}

export function useCommandsState() {
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [commandSummary, setCommandSummary] = useState<string>("");
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const [componentsView, setComponentsView] = useState<ComponentsView>("commands");
  const [isTogglingCommand, setIsTogglingCommand] = useState(false);
  return {
    commands,
    setCommands,
    commandSummary,
    setCommandSummary,
    selectedCommandIndex,
    setSelectedCommandIndex,
    tools,
    setTools,
    selectedToolIndex,
    setSelectedToolIndex,
    componentsView,
    setComponentsView,
    isTogglingCommand,
    setIsTogglingCommand,
  };
}

export function usePluginsState() {
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [marketPlugins, setMarketPlugins] = useState<PluginMarketItem[]>([]);
  const [pluginDetails, setPluginDetails] = useState<Record<string, PluginDetail>>({});
  const [pluginConfigs, setPluginConfigs] = useState<Record<string, PluginConfigPayload>>({});
  const [pluginTab, setPluginTab] = useState<PluginTab>("installed");
  const [pluginPane, setPluginPane] = useState<PluginPane>("list");
  const [selectedPluginIndex, setSelectedPluginIndex] = useState(0);
  const [selectedPluginAction, setSelectedPluginAction] =
    useState<PluginAction>("switch");
  const [selectedPluginDetailAction, setSelectedPluginDetailAction] =
    useState<PluginDetailAction>("reload");
  const [selectedPluginComponentIndex, setSelectedPluginComponentIndex] = useState(0);
  const [selectedPluginConfigSettingIndex, setSelectedPluginConfigSettingIndex] = useState(0);
  const [loadingPluginDetailName, setLoadingPluginDetailName] = useState<string | null>(null);
  const [loadingPluginConfigName, setLoadingPluginConfigName] = useState<string | null>(null);
  const [workingPluginName, setWorkingPluginName] = useState<string | null>(null);
  const [workingMarketPluginName, setWorkingMarketPluginName] = useState<string | null>(null);
  const [pendingPluginDeleteName, setPendingPluginDeleteName] = useState<string | null>(null);
  const [pendingMarketPluginKey, setPendingMarketPluginKey] = useState<string | null>(null);
  const [pendingMarketInstallWarning, setPendingMarketInstallWarning] =
    useState<PendingMarketInstallWarning | null>(null);
  const [editingPluginConfigSettingKey, setEditingPluginConfigSettingKey] = useState<string | null>(null);
  const [pluginConfigEditValue, setPluginConfigEditValue] = useState("");
  const [pluginConfigEditCursor, setPluginConfigEditCursor] = useState(0);
  const [pluginConfigChoiceDialog, setPluginConfigChoiceDialog] =
    useState<PluginConfigChoiceDialogState | null>(null);
  const [pluginConfigTemplateListDialog, setPluginConfigTemplateListDialog] =
    useState<PluginConfigTemplateListDialogState | null>(null);
  const [pluginTemplateFieldEdit, setPluginTemplateFieldEdit] =
    useState<PluginTemplateFieldEditState | null>(null);
  const [pluginObjectEditor, setPluginObjectEditor] =
    useState<PluginObjectEditorState | null>(null);
  const [pluginFileDialog, setPluginFileDialog] =
    useState<PluginFileDialogState | null>(null);
  const [selectedMarketPluginIndex, setSelectedMarketPluginIndex] = useState(0);
  const [marketDetailScrollOffset, setMarketDetailScrollOffset] = useState(0);
  const [marketFilter, setMarketFilter] = useState("");
  const [marketFilterCursor, setMarketFilterCursor] = useState(0);
  const [isEditingMarketFilter, setIsEditingMarketFilter] = useState(false);
  return {
    plugins,
    setPlugins,
    marketPlugins,
    setMarketPlugins,
    pluginDetails,
    setPluginDetails,
    pluginConfigs,
    setPluginConfigs,
    pluginTab,
    setPluginTab,
    pluginPane,
    setPluginPane,
    selectedPluginIndex,
    setSelectedPluginIndex,
    selectedPluginAction,
    setSelectedPluginAction,
    selectedPluginDetailAction,
    setSelectedPluginDetailAction,
    selectedPluginComponentIndex,
    setSelectedPluginComponentIndex,
    selectedPluginConfigSettingIndex,
    setSelectedPluginConfigSettingIndex,
    loadingPluginDetailName,
    setLoadingPluginDetailName,
    loadingPluginConfigName,
    setLoadingPluginConfigName,
    workingPluginName,
    setWorkingPluginName,
    workingMarketPluginName,
    setWorkingMarketPluginName,
    pendingPluginDeleteName,
    setPendingPluginDeleteName,
    pendingMarketPluginKey,
    setPendingMarketPluginKey,
    pendingMarketInstallWarning,
    setPendingMarketInstallWarning,
    editingPluginConfigSettingKey,
    setEditingPluginConfigSettingKey,
    pluginConfigEditValue,
    setPluginConfigEditValue,
    pluginConfigEditCursor,
    setPluginConfigEditCursor,
    pluginConfigChoiceDialog,
    setPluginConfigChoiceDialog,
    pluginConfigTemplateListDialog,
    setPluginConfigTemplateListDialog,
    pluginTemplateFieldEdit,
    setPluginTemplateFieldEdit,
    pluginObjectEditor,
    setPluginObjectEditor,
    pluginFileDialog,
    setPluginFileDialog,
    selectedMarketPluginIndex,
    setSelectedMarketPluginIndex,
    marketDetailScrollOffset,
    setMarketDetailScrollOffset,
    marketFilter,
    setMarketFilter,
    marketFilterCursor,
    setMarketFilterCursor,
    isEditingMarketFilter,
    setIsEditingMarketFilter,
  };
}

export function useAgentsState() {
  const [personaFolders, setPersonaFolders] = useState<PersonaFolder[]>([]);
  const [personaFolderTree, setPersonaFolderTree] = useState<PersonaFolder[]>([]);
  const [currentPersonaFolderId, setCurrentPersonaFolderId] = useState<string | null>(null);
  const [selectedAgentEntryIndex, setSelectedAgentEntryIndex] = useState(0);
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [selectedPersonaIndex, setSelectedPersonaIndex] = useState(0);
  const [agentPane, setAgentPane] = useState<AgentPane>("list");
  const [selectedAgentAction, setSelectedAgentAction] =
    useState<AgentAction>("new");
  const [selectedAgentFieldIndex, setSelectedAgentFieldIndex] = useState(0);
  const [editingPersonaDraft, setEditingPersonaDraft] = useState<PersonaItem | null>(null);
  const [editingPersonaOriginal, setEditingPersonaOriginal] = useState<PersonaItem | null>(null);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [workingPersonaId, setWorkingPersonaId] = useState<string | null>(null);
  const [pendingPersonaDeleteId, setPendingPersonaDeleteId] = useState<string | null>(null);
  const [editingAgentFieldKey, setEditingAgentFieldKey] = useState<AgentField["key"] | null>(null);
  const [agentEditValue, setAgentEditValue] = useState("");
  const [agentEditCursor, setAgentEditCursor] = useState(0);
  const [creatingPersonaFolder, setCreatingPersonaFolder] = useState<ConfigFileActionDialogState | null>(null);
  return {
    personaFolders,
    setPersonaFolders,
    personaFolderTree,
    setPersonaFolderTree,
    currentPersonaFolderId,
    setCurrentPersonaFolderId,
    selectedAgentEntryIndex,
    setSelectedAgentEntryIndex,
    personas,
    setPersonas,
    selectedPersonaIndex,
    setSelectedPersonaIndex,
    agentPane,
    setAgentPane,
    selectedAgentAction,
    setSelectedAgentAction,
    selectedAgentFieldIndex,
    setSelectedAgentFieldIndex,
    editingPersonaDraft,
    setEditingPersonaDraft,
    editingPersonaOriginal,
    setEditingPersonaOriginal,
    isCreatingPersona,
    setIsCreatingPersona,
    workingPersonaId,
    setWorkingPersonaId,
    pendingPersonaDeleteId,
    setPendingPersonaDeleteId,
    editingAgentFieldKey,
    setEditingAgentFieldKey,
    agentEditValue,
    setAgentEditValue,
    agentEditCursor,
    setAgentEditCursor,
    creatingPersonaFolder,
    setCreatingPersonaFolder,
  };
}

export function useConfigState() {
  const [configTab, setConfigTab] = useState<ConfigTab>("normal");
  const [configPane, setConfigPane] = useState<ConfigPane>("tabs");
  const [abconfs, setAbconfs] = useState<AbconfInfo[]>([]);
  const [selectedAbconfIndex, setSelectedAbconfIndex] = useState(0);
  const [selectedConfigFileAction, setSelectedConfigFileAction] =
    useState<"new" | "copy" | "rename" | "delete">("new");
  const [normalConfigPayload, setNormalConfigPayload] = useState<AstrBotConfigPayload | null>(null);
  const [systemConfigPayload, setSystemConfigPayload] = useState<AstrBotConfigPayload | null>(null);
  const [selectedConfigGroupIndex, setSelectedConfigGroupIndex] = useState(0);
  const [selectedConfigSettingIndex, setSelectedConfigSettingIndex] = useState(0);
  const [editingConfigSettingKey, setEditingConfigSettingKey] = useState<string | null>(null);
  const [configEditValue, setConfigEditValue] = useState("");
  const [configEditCursor, setConfigEditCursor] = useState(0);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configFileActionDialog, setConfigFileActionDialog] =
    useState<ConfigFileActionDialogState | null>(null);
  const [pendingConfigDeleteId, setPendingConfigDeleteId] = useState<string | null>(null);
  return {
    configTab,
    setConfigTab,
    configPane,
    setConfigPane,
    abconfs,
    setAbconfs,
    selectedAbconfIndex,
    setSelectedAbconfIndex,
    selectedConfigFileAction,
    setSelectedConfigFileAction,
    normalConfigPayload,
    setNormalConfigPayload,
    systemConfigPayload,
    setSystemConfigPayload,
    selectedConfigGroupIndex,
    setSelectedConfigGroupIndex,
    selectedConfigSettingIndex,
    setSelectedConfigSettingIndex,
    editingConfigSettingKey,
    setEditingConfigSettingKey,
    configEditValue,
    setConfigEditValue,
    configEditCursor,
    setConfigEditCursor,
    loadingConfig,
    setLoadingConfig,
    savingConfig,
    setSavingConfig,
    configFileActionDialog,
    setConfigFileActionDialog,
    pendingConfigDeleteId,
    setPendingConfigDeleteId,
  };
}

export function usePlatformsState() {
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [platformStats, setPlatformStats] = useState<Record<string, PlatformRuntimeStat>>({});
  const [platformPane, setPlatformPane] = useState<PlatformPane>("platforms");
  const [selectedPlatformIndex, setSelectedPlatformIndex] = useState(0);
  const [selectedPlatformAction, setSelectedPlatformAction] =
    useState<PlatformAction>("switch");
  const [selectedPlatformSettingIndex, setSelectedPlatformSettingIndex] = useState(0);
  const [pendingPlatformDelete, setPendingPlatformDelete] =
    useState<PendingPlatformDelete>(null);
  const [editingPlatformSettingKey, setEditingPlatformSettingKey] = useState<string | null>(null);
  const [platformEditValue, setPlatformEditValue] = useState("");
  const [platformEditCursor, setPlatformEditCursor] = useState(0);
  const [isCreatingPlatform, setIsCreatingPlatform] = useState(false);
  const [selectedPlatformTemplateIndex, setSelectedPlatformTemplateIndex] = useState(0);
  const [platformRegistration, setPlatformRegistration] =
    useState<PlatformRegistrationFlow | null>(null);
  const [isTogglingPlatform, setIsTogglingPlatform] = useState(false);
  return {
    platforms,
    setPlatforms,
    platformStats,
    setPlatformStats,
    platformPane,
    setPlatformPane,
    selectedPlatformIndex,
    setSelectedPlatformIndex,
    selectedPlatformAction,
    setSelectedPlatformAction,
    selectedPlatformSettingIndex,
    setSelectedPlatformSettingIndex,
    pendingPlatformDelete,
    setPendingPlatformDelete,
    editingPlatformSettingKey,
    setEditingPlatformSettingKey,
    platformEditValue,
    setPlatformEditValue,
    platformEditCursor,
    setPlatformEditCursor,
    isCreatingPlatform,
    setIsCreatingPlatform,
    selectedPlatformTemplateIndex,
    setSelectedPlatformTemplateIndex,
    platformRegistration,
    setPlatformRegistration,
    isTogglingPlatform,
    setIsTogglingPlatform,
  };
}

export function useProvidersState() {
  const [providerTemplate, setProviderTemplate] = useState<ProviderTemplatePayload | null>(null);
  const [providerType, setProviderType] = useState<ProviderType>("chat_completion");
  const [providerPane, setProviderPane] = useState<ProviderPane>("sources");
  const [selectedProviderSourceAction, setSelectedProviderSourceAction] =
    useState<ProviderSourceAction>("switch");
  const [selectedProviderModelAction, setSelectedProviderModelAction] =
    useState<ProviderModelAction>("switch");
  const [selectedProviderSourceIndex, setSelectedProviderSourceIndex] = useState(0);
  const [selectedProviderSourceSettingIndex, setSelectedProviderSourceSettingIndex] = useState(0);
  const [selectedProviderIndex, setSelectedProviderIndex] = useState(0);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderCheckResult>>({});
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [isTogglingProvider, setIsTogglingProvider] = useState(false);
  const [pendingProviderDelete, setPendingProviderDelete] =
    useState<PendingProviderDelete>(null);
  const [providerSourceModels, setProviderSourceModels] =
    useState<Record<string, AvailableProviderModel[]>>({});
  const [loadingProviderSourceModelsId, setLoadingProviderSourceModelsId] =
    useState<string | null>(null);
  const [editingProviderSourceSettingKey, setEditingProviderSourceSettingKey] =
    useState<string | null>(null);
  const [providerSourceEditValue, setProviderSourceEditValue] = useState("");
  const [providerSourceEditCursor, setProviderSourceEditCursor] = useState(0);
  const [editingProviderConfig, setEditingProviderConfig] = useState<ProviderConfig | null>(null);
  const [editingProviderOriginalId, setEditingProviderOriginalId] = useState("");
  const [selectedProviderConfigSettingIndex, setSelectedProviderConfigSettingIndex] = useState(0);
  const [editingProviderConfigSettingKey, setEditingProviderConfigSettingKey] =
    useState<string | null>(null);
  const [providerConfigEditValue, setProviderConfigEditValue] = useState("");
  const [providerConfigEditCursor, setProviderConfigEditCursor] = useState(0);
  const [isCreatingProviderSource, setIsCreatingProviderSource] = useState(false);
  const [selectedProviderSourceTemplateIndex, setSelectedProviderSourceTemplateIndex] = useState(0);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);
  const [selectedProviderTemplateIndex, setSelectedProviderTemplateIndex] = useState(0);
  return {
    providerTemplate,
    setProviderTemplate,
    providerType,
    setProviderType,
    providerPane,
    setProviderPane,
    selectedProviderSourceAction,
    setSelectedProviderSourceAction,
    selectedProviderModelAction,
    setSelectedProviderModelAction,
    selectedProviderSourceIndex,
    setSelectedProviderSourceIndex,
    selectedProviderSourceSettingIndex,
    setSelectedProviderSourceSettingIndex,
    selectedProviderIndex,
    setSelectedProviderIndex,
    providerStatuses,
    setProviderStatuses,
    testingProviderId,
    setTestingProviderId,
    isTogglingProvider,
    setIsTogglingProvider,
    pendingProviderDelete,
    setPendingProviderDelete,
    providerSourceModels,
    setProviderSourceModels,
    loadingProviderSourceModelsId,
    setLoadingProviderSourceModelsId,
    editingProviderSourceSettingKey,
    setEditingProviderSourceSettingKey,
    providerSourceEditValue,
    setProviderSourceEditValue,
    providerSourceEditCursor,
    setProviderSourceEditCursor,
    editingProviderConfig,
    setEditingProviderConfig,
    editingProviderOriginalId,
    setEditingProviderOriginalId,
    selectedProviderConfigSettingIndex,
    setSelectedProviderConfigSettingIndex,
    editingProviderConfigSettingKey,
    setEditingProviderConfigSettingKey,
    providerConfigEditValue,
    setProviderConfigEditValue,
    providerConfigEditCursor,
    setProviderConfigEditCursor,
    isCreatingProviderSource,
    setIsCreatingProviderSource,
    selectedProviderSourceTemplateIndex,
    setSelectedProviderSourceTemplateIndex,
    isCreatingProvider,
    setIsCreatingProvider,
    selectedProviderTemplateIndex,
    setSelectedProviderTemplateIndex,
  };
}

export type ChatState = ReturnType<typeof useChatState>;
export type StatusState = ReturnType<typeof useStatusState>;
export type CommandsState = ReturnType<typeof useCommandsState>;
export type PluginsState = ReturnType<typeof usePluginsState>;
export type AgentsState = ReturnType<typeof useAgentsState>;
export type ConfigState = ReturnType<typeof useConfigState>;
export type PlatformsState = ReturnType<typeof usePlatformsState>;
export type ProvidersState = ReturnType<typeof useProvidersState>;
