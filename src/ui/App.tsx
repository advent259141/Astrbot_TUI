import {
  useMemo,
  useState,
} from "react";
import {
  Box,
  Text,
  useApp,
} from "ink";
import type { DashboardClient } from "../api/client.js";
import { createI18n } from "../i18n/index.js";
import {
  appendPlainPart,
  appendThinkPart,
  appendTypedPart,
  normalizeChatRecord,
  payloadText,
  textFromParts,
} from "../api/messages.js";
import type {
  ChatRecord,
  ChatSession,
  CommandItem,
  AstrBotConfigPayload,
  LiveLogPayload,
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
import { truncate } from "./format.js";
import { AgentsView } from "./AgentsView.js";
import {
  ChatSidebar,
  ChatView,
} from "./ChatView.js";
import { CommandsView } from "./CommandsView.js";
import { ConfigView } from "./ConfigView.js";
import { ConsoleView } from "./ConsoleView.js";
import { PlatformsView } from "./PlatformsView.js";
import { PluginsView } from "./PluginsView.js";
import { ProvidersView } from "./ProvidersView.js";
import { SplashView } from "./SplashView.js";
import { StatusView } from "./StatusView.js";
import { ManagementView } from "./ManagementView.js";
import {
  padRightCells,
  terminalWidth,
  truncateCells,
  textCells,
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
import {
  handleInput,
  type InputContext,
} from "./inputHandler.js";
import {
  useAppController,
  type ControllerCtx,
} from "./appController.js";
import {
  MAIN_VIEWS,
  type MainView,
} from "./App.types.js";
import {
  canLoginPlatform,
  isPlatformLoggedIn,
  useTerminalSize,
  viewLabel,
  visibleMainViews,
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
  ConfigFileActionDialog,
} from "./dialogs.js";

interface AppProps {
  client: DashboardClient;
  serverUrl: string;
  username?: string;
  tokenStoreKind: string;
  locale?: string;
}

export function App({ client, serverUrl, username, tokenStoreKind, locale }: AppProps) {
  const { exit } = useApp();
  const i18n = useMemo(() => createI18n(locale), [locale]);
  const [columns, rows] = useTerminalSize();
  const {
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
  } = useChatState();
  const {
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
  } = useStatusState();
  const {
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
  } = useCommandsState();
  const {
    plugins,
    setPlugins,
    marketPlugins,
    setMarketPlugins,
    marketStatus,
    setMarketStatus,
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
  } = usePluginsState();
  const {
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
    personaFolders,
    setPersonaFolders,
    personaFolderTree,
    setPersonaFolderTree,
    currentPersonaFolderId,
    setCurrentPersonaFolderId,
    selectedAgentEntryIndex,
    setSelectedAgentEntryIndex,
    creatingPersonaFolder,
    setCreatingPersonaFolder,
  } = useAgentsState();
  const {
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
  } = useConfigState();
  const {
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
  } = usePlatformsState();
  const {
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
  } = useProvidersState();
  const [astrBotConfig, setAstrBotConfig] = useState<AstrBotConfigPayload | null>(null);
  const [activeView, setActiveView] = useState<MainView>("chat");
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [bootStatus, setBootStatus] = useState(() =>
    i18n.t("tui.boot.connecting", "Connecting to AstrBot Dashboard..."),
  );
  const [notice, setNotice] = useState(() =>
    i18n.t("tui.boot.loadingData", "Loading AstrBot Dashboard data..."),
  );
  const ctx: ControllerCtx = {
    isBootLoading,
    abconfs,
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
    configEditCursor,
    configEditValue,
    configFileActionDialog,
    configPane,
    configTab,
    consoleScrollOffset,
    currentPersonaFolderId,
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
    loadingConfig,
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
    pendingConfigDeleteId,
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
    selectedAbconfIndex,
    selectedAgentEntryIndex,
    selectedAgentFieldIndex,
    selectedConfigFileAction,
    selectedConfigGroupIndex,
    selectedConfigSettingIndex,
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
    setAbconfs,
    setConfigEditCursor,
    setConfigEditValue,
    setConfigFileActionDialog,
    setConfigPane,
    setConfigTab,
    setSelectedConfigGroupIndex,
    setConsoleScrollOffset,
    setCurrentPersonaFolderId,
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
    setLoadingConfig,
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
    setPendingConfigDeleteId,
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
    setSavingConfig,
    normalConfigPayload,
    setNormalConfigPayload,
    systemConfigPayload,
    setSystemConfigPayload,
    creatingPersonaFolder,
    setCreatingPersonaFolder,
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
  };
  const {
    agentFields,
    agentEntries,
    abconfWindowStart,
    chatMeta,
    commandMeta,
    commandWindowStart,
    componentSummary,
    configFileViewportHeight,
    configSettingViewportHeight,
    configSettingWindowStart,
    consoleMeta,
    currentSessionTitle,
    filteredMarketPlugins,
    filteredSessions,
    headerMeta,
    isEditingPersona,
    layout,
    marketDetailViewportHeight,
    marketPluginWindowStart,
    maxStatusScrollOffset,
    personaWindowStart,
    currentPersonaFolderName,
    currentPersonaFolderPath,
    platformTemplates,
    platformWindowStart,
    pluginComponentWindowStart,
    pluginConfigWindowStart,
    pluginWindowStart,
    providerConfigSettings,
    providerRows,
    providerSourceTemplates,
    providerSourceWindowStart,
    providerSources,
    providerTemplates,
    providerWindowStart,
    selectedAgentField,
    selectedAbconf,
    selectedCommand,
    selectedConfigPayload,
    selectedConfigSetting,
    selectedConfigGroups,
    selectedConfigGroupIndex: clampedConfigGroupIndex,
    selectedConfigGroupSettings,
    selectedConfigSettings,
    selectedConfigVisibleSettingIndex,
    selectedMarketPlugin,
    selectedPersona,
    selectedPlatform,
    selectedPlatformSetting,
    selectedPlatformSettings,
    selectedPlugin,
    selectedPluginConfigSetting,
    selectedPluginConfigSettings,
    selectedPluginDetail,
    selectedProviderEntries,
    selectedProviderRows,
    selectedProviderSource,
    selectedProviderSourceSetting,
    selectedTool,
    sessionTitleText,
    showChatSidebar,
    toolWindowStart,
    visibleAbconfs,
    visibleCommands,
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
  } = useAppController(ctx);
  if (isBootLoading) {
    return (
      <SplashView
        columns={columns}
        rows={rows}
        bootStatus={bootStatus}
        username={username}
        serverUrl={serverUrl}
        i18n={i18n}
      />
    );
  }
  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box height={2} flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold color="cyan">AstrBot</Text>
          <Text dimColor>{truncate(headerMeta, Math.max(10, columns - 10))}</Text>
        </Box>
        <Box>
          {visibleMainViews(activeView, Math.max(12, columns - 23), i18n).map((view) => (
            <Text key={view} color={activeView === view ? "cyan" : undefined} inverse={activeView === view}>
              {`  ${viewLabel(view, i18n)}  `}
            </Text>
          ))}
          <Text dimColor>{` ${MAIN_VIEWS.indexOf(activeView) + 1}/${MAIN_VIEWS.length}  ${i18n.t("tui.keys.tabSwitch", "Tab switch")}`}</Text>
        </Box>
      </Box>

      <Box height={layout.bodyHeight}>
        {showChatSidebar ? (
          <ChatSidebar
            width={layout.sidebarWidth}
            height={layout.bodyHeight}
            sessionTitleText={sessionTitleText}
            sessionFilter={sessionFilter}
            sessions={sessions}
            filteredSessions={filteredSessions}
            visibleSessions={visibleSessions}
            selectedSessionId={selectedSessionId}
            selectedSidebarAction={selectedSidebarAction}
            i18n={i18n}
          />
        ) : null}

        <Box width={layout.mainWidth} height={layout.bodyHeight} flexDirection="column" paddingX={2}>
          <ManagementView client={client} width={layout.contentWidth} height={layout.bodyHeight} i18n={i18n} active={activeView === "management"} />
          {activeView === "chat" ? (
            <ChatView
              title={currentSessionTitle}
              meta={chatMeta.length ? chatMeta.join("  ") : i18n.t("tui.chat.pageUpHistory", "PageUp history")}
              rows={visibleMessageRows}
              width={layout.contentWidth}
              height={layout.bodyHeight}
              i18n={i18n}
            />
          ) : null}

          {activeView === "status" ? (
            <StatusView
              lines={visibleStatusLines}
              scrollOffset={statusScrollOffset}
              maxScrollOffset={maxStatusScrollOffset}
              width={layout.contentWidth}
              i18n={i18n}
            />
          ) : null}

          {activeView === "console" ? (
            <ConsoleView
              meta={consoleMeta}
              lines={visibleConsoleLines}
              width={layout.contentWidth}
              i18n={i18n}
            />
          ) : null}

          {activeView === "commands" ? (
            <CommandsView
              width={layout.contentWidth}
              componentSummary={componentSummary}
              commandMeta={commandMeta}
              componentsView={componentsView}
              visibleCommands={visibleCommands}
              visibleTools={visibleTools}
              commandWindowStart={commandWindowStart}
              toolWindowStart={toolWindowStart}
              selectedCommandIndex={selectedCommandIndex}
              selectedToolIndex={selectedToolIndex}
              selectedCommand={selectedCommand}
              selectedTool={selectedTool}
              i18n={i18n}
            />
          ) : null}

          {activeView === "plugins" ? (
            <PluginsView
              width={layout.contentWidth}
              height={layout.bodyHeight}
              pluginTab={pluginTab}
              plugins={plugins}
              visiblePlugins={visiblePlugins}
              pluginWindowStart={pluginWindowStart}
              selectedPluginIndex={selectedPluginIndex}
              selectedPluginAction={selectedPluginAction}
              selectedPluginDetailAction={selectedPluginDetailAction}
              pluginPane={pluginPane}
              selectedPlugin={selectedPlugin}
              selectedPluginDetail={selectedPluginDetail}
              selectedPluginComponentIndex={selectedPluginComponentIndex}
              visiblePluginComponents={visiblePluginComponents}
              pluginComponentWindowStart={pluginComponentWindowStart}
              selectedPluginConfigSettingIndex={selectedPluginConfigSettingIndex}
              visiblePluginConfigSettings={visiblePluginConfigSettings}
              pluginConfigWindowStart={pluginConfigWindowStart}
              pluginConfigSettingCount={selectedPluginConfigSettings.length}
              loadingPluginConfigName={loadingPluginConfigName}
              editingPluginConfigSettingKey={editingPluginConfigSettingKey}
              marketPlugins={filteredMarketPlugins}
              marketStatus={marketStatus}
              marketTotalCount={marketPlugins.length}
              marketFilter={marketFilter}
              isEditingMarketFilter={isEditingMarketFilter}
              visibleMarketPlugins={visibleMarketPlugins}
              marketPluginWindowStart={marketPluginWindowStart}
              selectedMarketPluginIndex={selectedMarketPluginIndex}
              selectedMarketPlugin={selectedMarketPlugin}
              marketDetailScrollOffset={marketDetailScrollOffset}
              marketDetailViewportHeight={marketDetailViewportHeight}
              loadingPluginDetailName={loadingPluginDetailName}
              pendingPluginDeleteName={pendingPluginDeleteName}
              workingPluginName={workingPluginName}
              workingMarketPluginName={workingMarketPluginName}
              i18n={i18n}
            />
          ) : null}

          {activeView === "agents" ? (
            <AgentsView
              width={layout.contentWidth}
              personas={personas}
              folders={personaFolders}
              currentFolderName={currentPersonaFolderName}
              currentFolderPath={currentPersonaFolderPath}
              entries={agentEntries}
              visibleEntries={visibleAgentEntries}
              entryWindowStart={personaWindowStart}
              selectedEntryIndex={selectedAgentEntryIndex}
              selectedAgentAction={selectedAgentAction}
              selectedAgentFieldIndex={selectedAgentFieldIndex}
              agentPane={agentPane}
              selectedPersona={selectedPersona}
              agentFields={agentFields}
              isEditingAgent={isEditingPersona && !isCreatingPersona}
              isCreatingAgent={isCreatingPersona}
              editingAgentFieldKey={editingAgentFieldKey}
              workingPersonaId={workingPersonaId}
              i18n={i18n}
            />
          ) : null}

          {activeView === "config" ? (
            <ConfigView
              i18n={i18n}
              width={layout.contentWidth}
              height={layout.bodyHeight}
              configTab={configTab}
              configPane={configPane}
              abconfs={abconfs}
              visibleAbconfs={visibleAbconfs}
              abconfWindowStart={abconfWindowStart}
              selectedAbconfIndex={selectedAbconfIndex}
              selectedConfigFileAction={selectedConfigFileAction}
              payload={selectedConfigPayload}
              groups={selectedConfigGroups}
              selectedGroupIndex={clampedConfigGroupIndex}
              visibleSettings={visibleConfigSettings}
              settingWindowStart={configSettingWindowStart}
              settingCount={selectedConfigGroupSettings.length}
              selectedConfigSettingIndex={selectedConfigVisibleSettingIndex}
              selectedSetting={selectedConfigSetting}
              editingConfigSettingKey={editingConfigSettingKey}
              loading={loadingConfig}
              saving={savingConfig}
              pendingConfigDeleteId={pendingConfigDeleteId}
            />
          ) : null}

          {activeView === "providers" ? (
            <ProvidersView
              width={layout.contentWidth}
              providerTemplate={providerTemplate}
              providerType={providerType}
              providerPane={providerPane}
              providerRows={providerRows}
              providerSources={providerSources}
              selectedProviderRows={selectedProviderRows}
              selectedProviderEntries={selectedProviderEntries}
              selectedProviderSource={selectedProviderSource}
              selectedProviderSourceIndex={selectedProviderSourceIndex}
              selectedProviderSourceSettingIndex={selectedProviderSourceSettingIndex}
              selectedProviderIndex={selectedProviderIndex}
              selectedProviderSourceAction={selectedProviderSourceAction}
              selectedProviderModelAction={selectedProviderModelAction}
              visibleProviderSources={visibleProviderSources}
              visibleProviderEntries={visibleProviderEntries}
              providerSourceWindowStart={providerSourceWindowStart}
              providerWindowStart={providerWindowStart}
              providerStatuses={providerStatuses}
              testingProviderId={testingProviderId}
              providerSourceModels={providerSourceModels}
              loadingProviderSourceModelsId={loadingProviderSourceModelsId}
              editingProviderSourceSettingKey={editingProviderSourceSettingKey}
              i18n={i18n}
            />
          ) : null}

          {activeView === "platforms" ? (
            <PlatformsView
              width={layout.contentWidth}
              platforms={platforms}
              platformStats={platformStats}
              visiblePlatforms={visiblePlatforms}
              platformWindowStart={platformWindowStart}
              selectedPlatformIndex={selectedPlatformIndex}
              selectedPlatformAction={selectedPlatformAction}
              selectedPlatformSettingIndex={selectedPlatformSettingIndex}
              platformPane={platformPane}
              selectedPlatform={selectedPlatform}
              selectedPlatformSettings={selectedPlatformSettings}
              editingPlatformSettingKey={editingPlatformSettingKey}
              templates={platformTemplates}
              canLoginPlatform={canLoginPlatform}
              isPlatformLoggedIn={isPlatformLoggedIn}
              i18n={i18n}
            />
          ) : null}
        </Box>
      </Box>

      <Box height={1}>
        <Text color="gray">{truncate(notice, columns - 1)}</Text>
      </Box>

      {showChatSidebar ? (
        <Box height={3}>
          <Box width={layout.sidebarWidth} paddingX={1}>
            <Text dimColor>{truncate(i18n.t("tui.chat.helpHint", "/help for chat actions"), layout.sidebarWidth - 2)}</Text>
          </Box>

          <Box
            width={layout.mainWidth}
            borderStyle="single"
            borderColor={isSending ? "green" : "gray"}
            paddingX={1}
          >
            <Text color="green">{"> "}</Text>
            <Text>{(() => {
              const cells = textCells(input.replace(/[\r\n\t]/g, " "));
              let used = 0;
              let start = cells.length;
              while (start > 0 && used + cells[start - 1].width <= Math.max(1, layout.mainWidth - 8)) {
                used += cells[--start].width;
              }
              return cells.slice(start).map((cell) => cell.segment).join("");
            })()}</Text>
            <Text inverse> </Text>
          </Box>
        </Box>
      ) : null}

      {editingProviderSourceSettingKey && selectedProviderSourceSetting ? (
        <ProviderSourceSettingDialog
          columns={columns}
          rows={rows}
          setting={selectedProviderSourceSetting}
          value={providerSourceEditValue}
          cursor={providerSourceEditCursor}
          saving={isTogglingProvider}
          i18n={i18n}
        />
      ) : null}
      {editingAgentFieldKey && selectedAgentField ? (
        <AgentFieldDialog
          columns={columns}
          rows={rows}
          field={selectedAgentField}
          value={agentEditValue}
          cursor={agentEditCursor}
          saving={Boolean(workingPersonaId)}
          i18n={i18n}
        />
      ) : null}
      {editingConfigSettingKey && selectedConfigSetting ? (
        <PluginConfigSettingDialog
          columns={columns}
          rows={rows}
          setting={selectedConfigSetting}
          i18n={i18n}
          value={configEditValue}
          cursor={configEditCursor}
          saving={savingConfig}
          title={i18n.t("tui.config.editConfig", "Edit Config")}
        />
      ) : null}
      {configFileActionDialog ? (
        <ConfigFileActionDialog
          columns={columns}
          rows={rows}
          dialog={configFileActionDialog}
          saving={savingConfig}
          i18n={i18n}
        />
      ) : null}
      {creatingPersonaFolder ? (
        <ConfigFileActionDialog
          columns={columns}
          rows={rows}
          dialog={creatingPersonaFolder}
          saving={workingPersonaId === "__folder__"}
          i18n={i18n}
        />
      ) : null}
      {editingPlatformSettingKey && selectedPlatformSetting ? (
        <PlatformSettingDialog
          columns={columns}
          rows={rows}
          setting={selectedPlatformSetting}
          value={platformEditValue}
          cursor={platformEditCursor}
          saving={isTogglingPlatform}
          i18n={i18n}
        />
      ) : null}
      {editingProviderConfig ? (
        <ProviderConfigDialog
          columns={columns}
          rows={rows}
          provider={editingProviderConfig}
          settings={providerConfigSettings}
          selectedIndex={selectedProviderConfigSettingIndex}
          editingKey={editingProviderConfigSettingKey}
          editValue={providerConfigEditValue}
          editCursor={providerConfigEditCursor}
          saving={isTogglingProvider}
          i18n={i18n}
        />
      ) : null}
      {isCreatingProviderSource ? (
        <ProviderSourceCreateDialog
          columns={columns}
          rows={rows}
          templates={providerSourceTemplates}
          selectedIndex={selectedProviderSourceTemplateIndex}
          saving={isTogglingProvider}
          i18n={i18n}
        />
      ) : null}
      {isCreatingProvider ? (
        <ProviderCreateDialog
          columns={columns}
          rows={rows}
          templates={providerTemplates}
          selectedIndex={selectedProviderTemplateIndex}
          saving={isTogglingProvider}
          i18n={i18n}
        />
      ) : null}
      {isCreatingPlatform ? (
        <PlatformTemplateDialog
          columns={columns}
          rows={rows}
          templates={platformTemplates}
          selectedIndex={selectedPlatformTemplateIndex}
          saving={isTogglingPlatform}
          i18n={i18n}
        />
      ) : null}
      {platformRegistration ? (
        <PlatformLoginDialog
          columns={columns}
          rows={rows}
          registration={platformRegistration}
          saving={isTogglingPlatform}
          i18n={i18n}
        />
      ) : null}
      {pendingMarketInstallWarning ? (
        <PluginInstallWarningDialog
          columns={columns}
          rows={rows}
          warning={pendingMarketInstallWarning}
          saving={Boolean(workingMarketPluginName)}
          i18n={i18n}
        />
      ) : null}
      {pluginConfigChoiceDialog ? (
        <PluginConfigChoiceDialog
          columns={columns}
          rows={rows}
          dialog={pluginConfigChoiceDialog}
          i18n={i18n}
          saving={Boolean(workingPluginName) || isTogglingProvider}
        />
      ) : null}
      {pluginConfigTemplateListDialog ? (
        <PluginTemplateListDialog
          columns={columns}
          rows={rows}
          dialog={pluginConfigTemplateListDialog}
          saving={Boolean(workingPluginName)}
          i18n={i18n}
        />
      ) : null}
      {pluginObjectEditor ? (
        <PluginObjectEditorDialog
          columns={columns}
          rows={rows}
          editor={pluginObjectEditor}
          i18n={i18n}
          saving={Boolean(workingPluginName) || isTogglingProvider}
        />
      ) : null}
      {pluginFileDialog ? (
        <PluginFileDialog
          columns={columns}
          rows={rows}
          dialog={pluginFileDialog}
          saving={Boolean(workingPluginName)}
          i18n={i18n}
        />
      ) : null}
      {pluginTemplateFieldEdit ? (
        <PluginTemplateFieldEditDialog
          columns={columns}
          rows={rows}
          edit={pluginTemplateFieldEdit}
          saving={Boolean(workingPluginName)}
          i18n={i18n}
        />
      ) : null}
      {editingPluginConfigSettingKey && selectedPluginConfigSetting ? (
        <PluginConfigSettingDialog
          columns={columns}
          rows={rows}
          setting={selectedPluginConfigSetting}
          i18n={i18n}
          value={pluginConfigEditValue}
          cursor={pluginConfigEditCursor}
          saving={Boolean(workingPluginName)}
        />
      ) : null}
      {isEditingMarketFilter ? (
        <MarketSearchDialog
          columns={columns}
          rows={rows}
          value={marketFilter}
          cursor={marketFilterCursor}
          resultCount={filteredMarketPlugins.length}
          totalCount={marketPlugins.length}
          i18n={i18n}
        />
      ) : null}
    </Box>
  );
}
