import type { Dispatch, SetStateAction } from "react";
import type { Key } from "ink";
import {
  AVAILABLE_PROVIDER_MODEL_ACTIONS,
  PLUGIN_ACTIONS,
  PROVIDER_MODEL_ACTIONS,
  PROVIDER_SOURCE_ROW_ACTIONS,
  TOKEN_RANGES,
  type AstrBotConfigSetting,
  type MainView,
} from "./App.types.js";
import { PROVIDER_TYPES } from "./ProvidersView.js";
import {
  clampScrollOffset,
  nextMainView,
  nextPluginObjectValueType,
  pluginConfigDialogChoices,
  pluginFileDialogItemCount,
  pluginObjectEditorItemCount,
  pluginTemplateDialogItemCount,
  pluginTemplateEntries,
  togglePluginChoiceValue,
} from "./appHelpers.js";
import { insertAtCursor, removeAtCursor } from "./dialogControls.js";
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

export interface InputContext
  extends ChatState,
    StatusState,
    CommandsState,
    PluginsState,
    AgentsState,
    ConfigState,
    PlatformsState,
    ProvidersState {
  activeView: MainView;
  setActiveView: Dispatch<SetStateAction<MainView>>;
  setNotice: Dispatch<SetStateAction<string>>;
  [key: string]: any;
}

export function handleInput(value: string, key: Key, ctx: InputContext) {
  const {
    activeView,
    agentEditCursor,
    agentEditValue,
    agentEntries,
    agentFields,
    agentPane,
    applyPluginConfigSettingValue,
    beginCreatePlatform,
    beginCreateProvider,
    beginCreateProviderSource,
    beginEditAgentField,
    beginEditPlatformSetting,
    beginEditPluginConfigSetting,
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
    commands,
    componentsView,
    confirmPendingMarketInstallWarning,
    createSession,
    defaultProviderModelAction,
    editingAgentFieldKey,
    editingPlatformSettingKey,
    editingPluginConfigSettingKey,
    editingProviderConfig,
    editingProviderConfigSettingKey,
    editingProviderSourceSettingKey,
    executePluginFileDialogAction,
    executePluginObjectEditorAction,
    executePluginTemplateListDialog,
    executePersonaFolderDialog,
    executeSelectedAgentAction,
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
    isCreatingPlatform,
    isCreatingProvider,
    isCreatingProviderSource,
    isEditingMarketFilter,
    isEditingPersona,
    loadNormalConfig,
    layout,
    marketFilter,
    marketFilterCursor,
    maxConsoleScrollOffset,
    maxMessageScrollOffset,
    maxStatusScrollOffset,
    pendingMarketInstallWarning,
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
    platformTemplates,
    platforms,
    pluginConfigChoiceDialog,
    pluginConfigEditCursor,
    pluginConfigEditValue,
    pluginConfigTemplateListDialog,
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
    providerSourceSettings,
    providerSourceTemplates,
    providerSources,
    providerTemplates,
    providerUsesSourceLayout,
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
    selectedAgentEntryIndex,
    selectedAgentFieldIndex,
    selectedFilteredIndex,
    selectedMarketPluginIndex,
    selectedPersonaIndex,
    selectedPlatformAction,
    selectedPlatformActions,
    selectedPlatformIndex,
    selectedPlatformSettingIndex,
    selectedPlatformSettings,
    selectedPluginAction,
    selectedPluginComponentIndex,
    selectedPluginComponents,
    selectedPluginConfigSettingIndex,
    selectedPluginConfigSettings,
    selectedPluginDetailAction,
    selectedPluginIndex,
    selectedProviderEntries,
    selectedProviderEntry,
    selectedProviderIndex,
    selectedProviderModelAction,
    selectedProviderSourceAction,
    selectedProviderSourceIndex,
    selectedProviderSourceSettingIndex,
    selectedSidebarAction,
    sendMessage,
    setActiveView,
    setAgentEditCursor,
    setAgentEditValue,
    setAgentPane,
    setComponentsView,
    setConsoleScrollOffset,
    setInput,
    setIsEditingMarketFilter,
    setMarketDetailScrollOffset,
    setMarketFilter,
    setMarketFilterCursor,
    setMessageScrollOffset,
    setNotice,
    setPendingMarketInstallWarning,
    setPendingMarketPluginKey,
    setPendingPersonaDeleteId,
    setPendingPlatformDelete,
    setPendingPluginDeleteName,
    setPendingProviderDelete,
    setPlatformEditCursor,
    setPlatformEditValue,
    setPlatformPane,
    setPlatformRegistration,
    setPluginConfigChoiceDialog,
    setPluginConfigEditCursor,
    setPluginConfigEditValue,
    setPluginConfigTemplateListDialog,
    setPluginFileDialog,
    setPluginObjectEditor,
    setPluginPane,
    setPluginTab,
    setPluginTemplateFieldEdit,
    setProviderConfigEditCursor,
    setProviderConfigEditValue,
    setProviderPane,
    setProviderSourceEditCursor,
    setProviderSourceEditValue,
    setProviderType,
    setSelectedAgentAction,
    setSelectedAgentEntryIndex,
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
    setStatusScrollOffset,
    setTokenRange,
    startPlatformLogin,
    toggleSelectedCommand,
    toggleSelectedTool,
    tools,
  } = ctx;
  const {
    abconfs,
    beginEditConfigSetting,
    cancelEditConfigSetting,
    configEditCursor,
    configEditValue,
    configFileActionDialog,
    configPane,
    configTab,
    editingConfigSettingKey,
    executeConfigFileActionDialog,
    executeSelectedConfigFileAction,
    loadingConfig,
    pendingConfigDeleteId,
    saveConfigSetting,
    savingConfig,
    selectedAbconfIndex,
    selectedConfigFileAction,
    selectedConfigGroupIndex,
    selectedConfigGroups,
    selectedConfigSettingIndex,
    selectedConfigSettings,
    setConfigEditCursor,
    setConfigEditValue,
    setConfigFileActionDialog,
    setConfigPane,
    setConfigTab,
    setEditingConfigSettingKey,
    setPendingConfigDeleteId,
    setSelectedAbconfIndex,
    setSelectedConfigFileAction,
    setSelectedConfigGroupIndex,
    setSelectedConfigSettingIndex,
  } = ctx;
  const currentConfigGroupSettings = () => {
    const group = selectedConfigGroups[
      Math.min(selectedConfigGroupIndex, Math.max(0, selectedConfigGroups.length - 1))
    ];
    if (!group?.groupKey) {
      return selectedConfigSettings
        .map((setting: AstrBotConfigSetting, index: number) => ({ setting, index }))
        .filter(({ setting }: { setting: AstrBotConfigSetting; index: number }) =>
          !setting.isGroup && !setting.isSection)
        .map(({ index }: { setting: AstrBotConfigSetting; index: number }) => index);
    }
    return selectedConfigSettings
      .map((setting: AstrBotConfigSetting, index: number) => ({ setting, index }))
      .filter(({ setting }: { setting: AstrBotConfigSetting; index: number }) =>
        setting.groupKey === group.groupKey && !setting.isGroup && !setting.isSection)
      .map(({ index }: { setting: AstrBotConfigSetting; index: number }) => index);
  };
  const selectConfigGroupFirstSetting = (groupIndex: number) => {
    const group = selectedConfigGroups[
      Math.min(Math.max(0, groupIndex), Math.max(0, selectedConfigGroups.length - 1))
    ];
    const firstIndex = selectedConfigSettings.findIndex(
      (setting: AstrBotConfigSetting) =>
        setting.groupKey === group?.groupKey && !setting.isGroup && !setting.isSection,
    );
    setSelectedConfigSettingIndex(firstIndex >= 0 ? firstIndex : 0);
  };
  const configDetailPane = () => selectedConfigGroups.length > 1 ? "groups" : "settings";
  const configBackPane = () =>
    selectedConfigGroups.length > 1 ? "groups" : "tabs";
    if (key.ctrl && value === "c") {
      exit();
      return;
    }
    if (pendingMarketInstallWarning) {
      if (key.escape) {
        setPendingMarketInstallWarning(null);
        setNotice(i18n.t("tui.plugins.installCanceled", "Install canceled."));
        return;
      }
      if (key.return) {
        void confirmPendingMarketInstallWarning();
        return;
      }
      return;
    }
    if (configFileActionDialog || ctx.creatingPersonaFolder) {
      const dialog = configFileActionDialog || ctx.creatingPersonaFolder;
      const setDialog = configFileActionDialog
        ? setConfigFileActionDialog
        : ctx.setCreatingPersonaFolder;
      const executeDialog = configFileActionDialog
        ? executeConfigFileActionDialog
        : executePersonaFolderDialog;
      if (key.escape) {
        setDialog(null);
        setNotice(i18n.t("tui.config.fileActionCanceled", "Action canceled."));
        return;
      }
      if (key.return) {
        void executeDialog();
        return;
      }
      if (key.leftArrow) {
        setDialog((current: typeof dialog | null) =>
          current ? { ...current, cursor: Math.max(0, current.cursor - 1) } : current,
        );
        return;
      }
      if (key.rightArrow) {
        setDialog((current: typeof dialog | null) =>
          current
            ? {
                ...current,
                cursor: Math.min(Array.from(current.name).length, current.cursor + 1),
              }
            : current,
        );
        return;
      }
      if (key.backspace) {
        setDialog((current: typeof dialog | null) =>
          current
            ? {
                ...current,
                name: removeAtCursor(current.name, current.cursor, "backward"),
                cursor: Math.max(0, current.cursor - 1),
              }
            : current,
        );
        return;
      }
      if (key.delete) {
        setDialog((current: typeof dialog | null) =>
          current
            ? {
                ...current,
                name: removeAtCursor(current.name, current.cursor, "forward"),
              }
            : current,
        );
        return;
      }
      if (!key.ctrl && value) {
        setDialog((current: typeof dialog | null) =>
          current
            ? {
                ...current,
                name: insertAtCursor(current.name, current.cursor, value),
                cursor: current.cursor + Array.from(value).length,
              }
            : current,
        );
      }
      return;
    }
    if (pluginConfigChoiceDialog) {
      const dialogChoiceCount =
        pluginConfigChoiceDialog.choices.length + (pluginConfigChoiceDialog.multi ? 2 : 0);
      if (key.escape) {
        setPluginConfigChoiceDialog(null);
        setNotice(i18n.t("tui.plugins.selectionCanceled", "Selection canceled."));
        return;
      }
      if (key.upArrow) {
        setPluginConfigChoiceDialog((current) =>
          current
            ? {
                ...current,
                selectedIndex: Math.max(0, current.selectedIndex - 1),
              }
            : current,
        );
        return;
      }
      if (key.downArrow) {
        setPluginConfigChoiceDialog((current) =>
          current
            ? {
                ...current,
                selectedIndex: Math.min(
                  Math.max(0, dialogChoiceCount - 1),
                  current.selectedIndex + 1,
                ),
              }
            : current,
        );
        return;
      }
      if (key.pageUp) {
        setPluginConfigChoiceDialog((current) =>
          current
            ? {
                ...current,
                selectedIndex: Math.max(
                  0,
                  current.selectedIndex - Math.max(1, layout.bodyHeight - 8),
                ),
              }
            : current,
        );
        return;
      }
      if (key.pageDown) {
        setPluginConfigChoiceDialog((current) =>
          current
            ? {
                ...current,
                selectedIndex: Math.min(
                  Math.max(0, dialogChoiceCount - 1),
                  current.selectedIndex + Math.max(1, layout.bodyHeight - 8),
                ),
              }
            : current,
        );
        return;
      }
      if (key.return) {
        const dialog = pluginConfigChoiceDialog;
        if (dialog.loading) {
          return;
        }
        const choice = pluginConfigDialogChoices(dialog, i18n)[dialog.selectedIndex];
        if (!choice) {
          return;
        }
        if (dialog.multi) {
          if (choice.value === "__save__") {
            void (dialog.applyValue
              ? dialog.applyValue(dialog.selectedValues)
              : applyPluginConfigSettingValue(dialog.setting, dialog.selectedValues));
            setPluginConfigChoiceDialog(null);
            return;
          }
          if (choice.value === "__clear__") {
            setPluginConfigChoiceDialog((current) =>
              current ? { ...current, selectedValues: [] } : current,
            );
            return;
          }
          setPluginConfigChoiceDialog((current) =>
            current
              ? {
                  ...current,
                  selectedValues: togglePluginChoiceValue(
                    current.selectedValues,
                    choice.value,
                  ),
                }
              : current,
          );
          return;
        }
        void (dialog.applyValue
          ? dialog.applyValue(choice.value)
          : applyPluginConfigSettingValue(dialog.setting, choice.value));
        setPluginConfigChoiceDialog(null);
        return;
      }
      return;
    }
    if (pluginFileDialog) {
      if (key.escape) {
        setPluginFileDialog(null);
        setNotice(i18n.t("tui.pluginConfig.fileManagerClosed", "File manager closed."));
        return;
      }
      if (key.upArrow || key.downArrow || key.pageUp || key.pageDown) {
        const direction = key.upArrow || key.pageUp ? -1 : 1;
        const jump = key.pageUp || key.pageDown ? Math.max(1, layout.bodyHeight - 8) : 1;
        const count = pluginFileDialogItemCount(pluginFileDialog);
        setPluginFileDialog((current) =>
          current
            ? {
                ...current,
                selectedIndex: Math.max(
                  0,
                  Math.min(Math.max(0, count - 1), current.selectedIndex + direction * jump),
                ),
              }
            : current,
        );
        return;
      }
      if (key.return) {
        void executePluginFileDialogAction();
        return;
      }
      return;
    }
    if (pluginObjectEditor) {
      if (key.escape) {
        if (pluginObjectEditor.editingKey) {
          setPluginObjectEditor((current) =>
            current ? { ...current, editingKey: null } : current,
          );
        } else {
          setPluginObjectEditor(null);
          setNotice(i18n.t("tui.pluginConfig.objectEditorClosed", "Object editor closed."));
        }
        return;
      }
      if (pluginObjectEditor.editingKey) {
        if (key.return) {
          void savePluginObjectEditorField();
          return;
        }
        const targetKey =
          pluginObjectEditor.editingKey === "__new__" ||
          pluginObjectEditor.editingKey === "__key__";
        if (key.leftArrow) {
          setPluginObjectEditor((current) =>
            current
              ? targetKey
                ? { ...current, keyCursor: Math.max(0, current.keyCursor - 1) }
                : { ...current, valueCursor: Math.max(0, current.valueCursor - 1) }
              : current,
          );
          return;
        }
        if (key.rightArrow) {
          setPluginObjectEditor((current) =>
            current
              ? targetKey
                ? {
                    ...current,
                    keyCursor: Math.min(Array.from(current.keyValue).length, current.keyCursor + 1),
                  }
                : {
                    ...current,
                    valueCursor: Math.min(Array.from(current.valueValue).length, current.valueCursor + 1),
                  }
              : current,
          );
          return;
        }
        if (key.tab) {
          setPluginObjectEditor((current) =>
            current
              ? {
                  ...current,
                  editingKey: targetKey ? "__value__" : "__key__",
                }
              : current,
          );
          return;
        }
        if (key.backspace || key.delete) {
          setPluginObjectEditor((current) => {
            if (!current) {
              return current;
            }
            if (targetKey) {
              const next = removeAtCursor(
                current.keyValue,
                current.keyCursor,
                key.backspace ? "backward" : "forward",
              );
              return {
                ...current,
                keyValue: next,
                keyCursor: key.backspace
                  ? Math.max(0, current.keyCursor - 1)
                  : current.keyCursor,
              };
            }
            const next = removeAtCursor(
              current.valueValue,
              current.valueCursor,
              key.backspace ? "backward" : "forward",
            );
            return {
              ...current,
              valueValue: next,
              valueCursor: key.backspace
                ? Math.max(0, current.valueCursor - 1)
                : current.valueCursor,
            };
          });
          return;
        }
        if (!key.ctrl && value) {
          setPluginObjectEditor((current) => {
            if (!current) {
              return current;
            }
            if (targetKey) {
              return {
                ...current,
                keyValue: insertAtCursor(current.keyValue, current.keyCursor, value),
                keyCursor: current.keyCursor + Array.from(value).length,
              };
            }
            return {
              ...current,
              valueValue: insertAtCursor(current.valueValue, current.valueCursor, value),
              valueCursor: current.valueCursor + Array.from(value).length,
            };
          });
        }
        return;
      }
      if (key.upArrow || key.downArrow || key.pageUp || key.pageDown) {
        const direction = key.upArrow || key.pageUp ? -1 : 1;
        const jump = key.pageUp || key.pageDown ? Math.max(1, layout.bodyHeight - 8) : 1;
        const count = pluginObjectEditorItemCount(pluginObjectEditor);
        setPluginObjectEditor((current) =>
          current
            ? {
                ...current,
                selectedIndex: Math.max(
                  0,
                  Math.min(Math.max(0, count - 1), current.selectedIndex + direction * jump),
                ),
              }
            : current,
        );
        return;
      }
      if (key.leftArrow || key.rightArrow) {
        setPluginObjectEditor((current) =>
          current
            ? {
                ...current,
                newValueType: nextPluginObjectValueType(current.newValueType, key.rightArrow ? 1 : -1),
              }
            : current,
        );
        return;
      }
      if (key.return) {
        executePluginObjectEditorAction();
        return;
      }
      return;
    }
    if (pluginTemplateFieldEdit) {
      if (key.escape) {
        setPluginTemplateFieldEdit(null);
        setNotice(i18n.t("tui.pluginConfig.editCanceled", "Edit canceled."));
        return;
      }
      if (key.return) {
        void savePluginTemplateFieldEdit();
        return;
      }
      if (key.leftArrow) {
        setPluginTemplateFieldEdit((current) =>
          current
            ? { ...current, cursor: Math.max(0, current.cursor - 1) }
            : current,
        );
        return;
      }
      if (key.rightArrow) {
        setPluginTemplateFieldEdit((current) =>
          current
            ? {
                ...current,
                cursor: Math.min(Array.from(current.value).length, current.cursor + 1),
              }
            : current,
        );
        return;
      }
      if (key.backspace) {
        setPluginTemplateFieldEdit((current) =>
          current
            ? {
                ...current,
                value: removeAtCursor(current.value, current.cursor, "backward"),
                cursor: Math.max(0, current.cursor - 1),
              }
            : current,
        );
        return;
      }
      if (key.delete) {
        setPluginTemplateFieldEdit((current) =>
          current
            ? {
                ...current,
                value: removeAtCursor(current.value, current.cursor, "forward"),
              }
            : current,
        );
        return;
      }
      if (!key.ctrl && value) {
        setPluginTemplateFieldEdit((current) =>
          current
            ? {
                ...current,
                value: insertAtCursor(current.value, current.cursor, value),
                cursor: current.cursor + Array.from(value).length,
              }
            : current,
        );
      }
      return;
    }
    if (pluginConfigTemplateListDialog) {
      if (key.escape) {
        setPluginConfigTemplateListDialog(null);
        setNotice(i18n.t("tui.pluginConfig.templateListClosed", "Template list closed."));
        return;
      }
      if (key.leftArrow) {
        if (pluginConfigTemplateListDialog.mode === "fields") {
          setPluginConfigTemplateListDialog((current) =>
            current ? { ...current, mode: "entries", selectedIndex: current.entryIndex } : current,
          );
        } else if (pluginConfigTemplateListDialog.mode === "templates") {
          setPluginConfigTemplateListDialog((current) =>
            current ? { ...current, mode: "entries", selectedIndex: 0 } : current,
          );
        }
        return;
      }
      if (key.rightArrow) {
        if (pluginConfigTemplateListDialog.mode === "entries") {
          const entries = pluginTemplateEntries(pluginConfigTemplateListDialog.setting.value);
          const selected = pluginConfigTemplateListDialog.selectedIndex;
          if (selected === 0) {
            setPluginConfigTemplateListDialog((current) =>
              current ? { ...current, mode: "templates", selectedIndex: 0 } : current,
            );
          } else if (entries[selected - 1]) {
            setPluginConfigTemplateListDialog((current) =>
              current
                ? {
                    ...current,
                    mode: "fields",
                    entryIndex: selected - 1,
                    selectedIndex: 0,
                  }
                : current,
            );
          }
        }
        return;
      }
      if (key.upArrow || key.downArrow || key.pageUp || key.pageDown) {
        const direction = key.upArrow || key.pageUp ? -1 : 1;
        const jump = key.pageUp || key.pageDown
          ? Math.max(1, layout.bodyHeight - 8)
          : 1;
        const count = pluginTemplateDialogItemCount(pluginConfigTemplateListDialog);
        setPluginConfigTemplateListDialog((current) =>
          current
            ? {
                ...current,
                selectedIndex: Math.max(
                  0,
                  Math.min(Math.max(0, count - 1), current.selectedIndex + direction * jump),
                ),
              }
            : current,
        );
        return;
      }
      if (key.return) {
        void executePluginTemplateListDialog();
        return;
      }
      return;
    }
    if (isEditingMarketFilter) {
      if (key.escape || key.return) {
        setIsEditingMarketFilter(false);
        setPluginPane("marketSearch");
        return;
      }
      if (key.leftArrow) {
        setMarketFilterCursor((current) => Math.max(0, current - 1));
        return;
      }
      if (key.rightArrow) {
        setMarketFilterCursor((current) =>
          Math.min(Array.from(marketFilter).length, current + 1),
        );
        return;
      }
      if (key.backspace) {
        setMarketFilter((current) => {
          const next = removeAtCursor(current, marketFilterCursor, "backward");
          setMarketFilterCursor((cursor) => Math.max(0, cursor - 1));
          return next;
        });
        setSelectedMarketPluginIndex(0);
        return;
      }
      if (key.delete) {
        setMarketFilter((current) =>
          removeAtCursor(current, marketFilterCursor, "forward"),
        );
        setSelectedMarketPluginIndex(0);
        return;
      }
      if (!key.ctrl && value) {
        setMarketFilter((current) =>
          insertAtCursor(current, marketFilterCursor, value),
        );
        setMarketFilterCursor((current) => current + Array.from(value).length);
        setSelectedMarketPluginIndex(0);
      }
      return;
    }
    if (platformRegistration && key.escape) {
      setPlatformRegistration(null);
      setNotice(i18n.t("tui.platforms.scanClosed", "Scan login closed."));
      return;
    }
    if (isCreatingPlatform) {
      if (key.escape) {
        cancelCreatePlatform();
        return;
      }
      if (key.return) {
        void savePlatformCreate();
        return;
      }
      if (key.upArrow) {
        setSelectedPlatformTemplateIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedPlatformTemplateIndex((current) =>
          Math.min(Math.max(0, platformTemplates.length - 1), current + 1),
        );
        return;
      }
      if (key.pageUp) {
        setSelectedPlatformTemplateIndex((current) =>
          Math.max(0, current - Math.max(1, layout.bodyHeight - 6)),
        );
        return;
      }
      if (key.pageDown) {
        setSelectedPlatformTemplateIndex((current) =>
          Math.min(
            Math.max(0, platformTemplates.length - 1),
            current + Math.max(1, layout.bodyHeight - 6),
          ),
        );
      }
      return;
    }
    if (isCreatingProviderSource) {
      if (key.escape) {
        cancelCreateProviderSource();
        return;
      }
      if (key.return) {
        void saveProviderSourceCreate();
        return;
      }
      if (key.upArrow) {
        setSelectedProviderSourceTemplateIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedProviderSourceTemplateIndex((current) =>
          Math.min(Math.max(0, providerSourceTemplates.length - 1), current + 1),
        );
        return;
      }
      if (key.pageUp) {
        setSelectedProviderSourceTemplateIndex((current) =>
          Math.max(0, current - Math.max(1, layout.bodyHeight - 6)),
        );
        return;
      }
      if (key.pageDown) {
        setSelectedProviderSourceTemplateIndex((current) =>
          Math.min(
            Math.max(0, providerSourceTemplates.length - 1),
            current + Math.max(1, layout.bodyHeight - 6),
          ),
        );
      }
      return;
    }
    if (isCreatingProvider) {
      if (key.escape) {
        cancelCreateProvider();
        return;
      }
      if (key.return) {
        void saveProviderCreate();
        return;
      }
      if (key.upArrow) {
        setSelectedProviderTemplateIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedProviderTemplateIndex((current) =>
          Math.min(Math.max(0, providerTemplates.length - 1), current + 1),
        );
        return;
      }
      if (key.pageUp) {
        setSelectedProviderTemplateIndex((current) =>
          Math.max(0, current - Math.max(1, layout.bodyHeight - 6)),
        );
        return;
      }
      if (key.pageDown) {
        setSelectedProviderTemplateIndex((current) =>
          Math.min(
            Math.max(0, providerTemplates.length - 1),
            current + Math.max(1, layout.bodyHeight - 6),
          ),
        );
      }
      return;
    }
    if (editingAgentFieldKey) {
      if (key.escape) {
        cancelEditAgentField();
        return;
      }
      if (key.return) {
        saveAgentField();
        return;
      }
      if (key.leftArrow) {
        setAgentEditCursor((current) => Math.max(0, current - 1));
        return;
      }
      if (key.rightArrow) {
        setAgentEditCursor((current) =>
          Math.min(Array.from(agentEditValue).length, current + 1),
        );
        return;
      }
      if (key.backspace) {
        setAgentEditValue((current) => {
          const next = removeAtCursor(current, agentEditCursor, "backward");
          setAgentEditCursor((cursor) => Math.max(0, cursor - 1));
          return next;
        });
        return;
      }
      if (key.delete) {
        setAgentEditValue((current) =>
          removeAtCursor(current, agentEditCursor, "forward"),
        );
        return;
      }
      if (!key.ctrl && value) {
        setAgentEditValue((current) =>
          insertAtCursor(current, agentEditCursor, value),
        );
        setAgentEditCursor((current) => current + Array.from(value).length);
      }
      return;
    }
    if (editingConfigSettingKey) {
      if (key.escape) {
        cancelEditConfigSetting();
        return;
      }
      if (key.return) {
        void saveConfigSetting();
        return;
      }
      if (key.leftArrow) {
        setConfigEditCursor((current: number) => Math.max(0, current - 1));
        return;
      }
      if (key.rightArrow) {
        setConfigEditCursor((current: number) =>
          Math.min(Array.from(configEditValue).length, current + 1),
        );
        return;
      }
      if (key.backspace) {
        setConfigEditValue((current: string) => {
          const next = removeAtCursor(current, configEditCursor, "backward");
          setConfigEditCursor((cursor: number) => Math.max(0, cursor - 1));
          return next;
        });
        return;
      }
      if (key.delete) {
        setConfigEditValue((current: string) =>
          removeAtCursor(current, configEditCursor, "forward"),
        );
        return;
      }
      if (!key.ctrl && value) {
        setConfigEditValue((current: string) =>
          insertAtCursor(current, configEditCursor, value),
        );
        setConfigEditCursor((current: number) => current + Array.from(value).length);
      }
      return;
    }
    if (editingProviderConfig) {
      if (editingProviderConfigSettingKey) {
        if (key.escape) {
          cancelEditProviderConfigSetting();
          return;
        }
        if (key.return) {
          void saveProviderConfigField();
          return;
        }
        if (key.leftArrow) {
          setProviderConfigEditCursor((current) => Math.max(0, current - 1));
          return;
        }
        if (key.rightArrow) {
          setProviderConfigEditCursor((current) =>
            Math.min(Array.from(providerConfigEditValue).length, current + 1),
          );
          return;
        }
        if (key.backspace) {
          setProviderConfigEditValue((current) => {
            const next = removeAtCursor(current, providerConfigEditCursor, "backward");
            setProviderConfigEditCursor((cursor) => Math.max(0, cursor - 1));
            return next;
          });
          return;
        }
        if (key.delete) {
          setProviderConfigEditValue((current) =>
            removeAtCursor(current, providerConfigEditCursor, "forward"),
          );
          return;
        }
        if (!key.ctrl && value) {
          setProviderConfigEditValue((current) =>
            insertAtCursor(current, providerConfigEditCursor, value),
          );
          setProviderConfigEditCursor((current) => current + Array.from(value).length);
        }
        return;
      }
      if (key.escape) {
        cancelEditProviderConfig();
        return;
      }
      if (key.return) {
        beginEditProviderConfigSetting();
        return;
      }
      if (key.upArrow) {
        setSelectedProviderConfigSettingIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedProviderConfigSettingIndex((current) =>
          Math.min(Math.max(0, providerConfigSettings.length - 1), current + 1),
        );
        return;
      }
      if (key.pageUp) {
        setSelectedProviderConfigSettingIndex((current) =>
          Math.max(0, current - Math.max(1, layout.bodyHeight - 6)),
        );
        return;
      }
      if (key.pageDown) {
        setSelectedProviderConfigSettingIndex((current) =>
          Math.min(
            Math.max(0, providerConfigSettings.length - 1),
            current + Math.max(1, layout.bodyHeight - 6),
          ),
        );
        return;
      }
      return;
    }
    if (editingPlatformSettingKey) {
      if (key.escape) {
        cancelEditPlatformSetting();
        return;
      }
      if (key.return) {
        void savePlatformSetting();
        return;
      }
      if (key.leftArrow) {
        setPlatformEditCursor((current) => Math.max(0, current - 1));
        return;
      }
      if (key.rightArrow) {
        setPlatformEditCursor((current) =>
          Math.min(Array.from(platformEditValue).length, current + 1),
        );
        return;
      }
      if (key.backspace) {
        setPlatformEditValue((current) => {
          const next = removeAtCursor(current, platformEditCursor, "backward");
          setPlatformEditCursor((cursor) => Math.max(0, cursor - 1));
          return next;
        });
        return;
      }
      if (key.delete) {
        setPlatformEditValue((current) =>
          removeAtCursor(current, platformEditCursor, "forward"),
        );
        return;
      }
      if (!key.ctrl && value) {
        setPlatformEditValue((current) =>
          insertAtCursor(current, platformEditCursor, value),
        );
        setPlatformEditCursor((current) => current + Array.from(value).length);
      }
      return;
    }
    if (editingPluginConfigSettingKey) {
      if (key.escape) {
        cancelEditPluginConfigSetting();
        return;
      }
      if (key.return) {
        void savePluginConfigSetting();
        return;
      }
      if (key.leftArrow) {
        setPluginConfigEditCursor((current) => Math.max(0, current - 1));
        return;
      }
      if (key.rightArrow) {
        setPluginConfigEditCursor((current) =>
          Math.min(Array.from(pluginConfigEditValue).length, current + 1),
        );
        return;
      }
      if (key.backspace) {
        setPluginConfigEditValue((current) => {
          const next = removeAtCursor(current, pluginConfigEditCursor, "backward");
          setPluginConfigEditCursor((cursor) => Math.max(0, cursor - 1));
          return next;
        });
        return;
      }
      if (key.delete) {
        setPluginConfigEditValue((current) =>
          removeAtCursor(current, pluginConfigEditCursor, "forward"),
        );
        return;
      }
      if (!key.ctrl && value) {
        setPluginConfigEditValue((current) =>
          insertAtCursor(current, pluginConfigEditCursor, value),
        );
        setPluginConfigEditCursor((current) => current + Array.from(value).length);
      }
      return;
    }
    if (editingProviderSourceSettingKey) {
      if (key.escape) {
        cancelEditProviderSourceSetting();
        return;
      }
      if (key.return) {
        void saveProviderSourceSetting();
        return;
      }
      if (key.leftArrow) {
        setProviderSourceEditCursor((current) => Math.max(0, current - 1));
        return;
      }
      if (key.rightArrow) {
        setProviderSourceEditCursor((current) =>
          Math.min(Array.from(providerSourceEditValue).length, current + 1),
        );
        return;
      }
      if (key.backspace) {
        setProviderSourceEditValue((current) => {
          const next = removeAtCursor(current, providerSourceEditCursor, "backward");
          setProviderSourceEditCursor((cursor) => Math.max(0, cursor - 1));
          return next;
        });
        return;
      }
      if (key.delete) {
        setProviderSourceEditValue((current) =>
          removeAtCursor(current, providerSourceEditCursor, "forward"),
        );
        return;
      }
      if (!key.ctrl && value) {
        setProviderSourceEditValue((current) =>
          insertAtCursor(current, providerSourceEditCursor, value),
        );
        setProviderSourceEditCursor((current) => current + Array.from(value).length);
      }
      return;
    }
    if (key.escape && activeView === "agents") {
      if (isEditingPersona) {
        cancelPersonaEdit();
        return;
      }
      if (agentPane === "fields") {
        setAgentPane("list");
        setSelectedAgentAction("delete");
        return;
      }
    }
      if (key.escape && activeView === "config") {
        if (configPane === "settings") {
        setConfigPane(configBackPane());
        return;
      }
      if (configPane === "groups") {
        setConfigPane("tabs");
        return;
      }
      if (configPane === "fileActions") {
        setConfigPane("fileDialog");
        return;
      }
      if (configPane === "fileDialog") {
        setConfigPane("fileButton");
        setConfigTab("normal");
        return;
      }
      if (configPane === "fileButton") {
        setConfigPane("tabs");
        return;
      }
    }
    if (key.tab) {
      setActiveView((current) => nextMainView(current));
      return;
    }
    if (key.upArrow) {
      if (activeView === "providers" && pendingProviderDelete) {
        setPendingProviderDelete(null);
      }
      if (activeView === "platforms" && pendingPlatformDelete) {
        setPendingPlatformDelete(null);
      }
      if (activeView === "plugins" && pendingPluginDeleteName) {
        setPendingPluginDeleteName(null);
      }
      if (activeView === "plugins" && pendingMarketPluginKey) {
        setPendingMarketPluginKey(null);
      }
      if (activeView === "agents" && pendingPersonaDeleteId) {
        setPendingPersonaDeleteId(null);
      }
      if (activeView === "config" && pendingConfigDeleteId) {
        setPendingConfigDeleteId(null);
      }
      if (activeView === "console") {
        setConsoleScrollOffset((current) =>
          clampScrollOffset(current + 3, maxConsoleScrollOffset),
        );
        return;
      }
      if (activeView === "config") {
        if (loadingConfig || savingConfig) {
          return;
        }
        if (configPane === "tabs") {
          return;
        }
        if (configPane === "fileButton") {
          setConfigPane("tabs");
          return;
        }
        if (configPane === "settings") {
          const groupSettings = currentConfigGroupSettings();
          const groupIndex = Math.max(0, groupSettings.indexOf(selectedConfigSettingIndex));
          if (groupIndex <= 0) {
            setConfigPane(configBackPane());
            return;
          }
          setSelectedConfigSettingIndex(groupSettings[groupIndex - 1] ?? selectedConfigSettingIndex);
          return;
        }
        if (configPane === "groups") {
          if (selectedConfigGroupIndex <= 0) {
            setConfigPane("tabs");
            return;
          }
          setSelectedConfigGroupIndex((current: number) => {
            const next = Math.max(0, current - 1);
            selectConfigGroupFirstSetting(next);
            return next;
          });
          return;
        }
        if (configPane === "fileActions") {
          setConfigPane("fileDialog");
          return;
        }
        if (configPane === "fileDialog") {
          if (selectedAbconfIndex <= 0) {
            setConfigPane("fileActions");
            return;
          }
          setSelectedAbconfIndex((current: number) => Math.max(0, current - 1));
          selectConfigGroupFirstSetting(0);
          return;
        }
        if (selectedAbconfIndex <= 0) {
          setConfigPane("tabs");
          return;
        }
        setSelectedAbconfIndex((current: number) => Math.max(0, current - 1));
        selectConfigGroupFirstSetting(0);
        return;
      }
      if (activeView === "plugins") {
          if (pluginPane === "tabs") {
            return;
          }
        if (pluginTab === "market") {
          if (pluginPane === "marketSearch") {
            setPluginPane("tabs");
            return;
          }
          if (pluginPane === "marketActions") {
            setMarketDetailScrollOffset((current) => Math.max(0, current - 1));
            return;
          }
          if (selectedMarketPluginIndex <= 0) {
            setPluginPane("tabs");
            return;
          }
          setSelectedMarketPluginIndex((current) => Math.max(0, current - 1));
          return;
        }
        if (pluginPane === "components") {
          if (selectedPluginComponentIndex <= 0) {
            setPluginPane("actions");
            return;
          }
          setSelectedPluginComponentIndex((current) => Math.max(0, current - 1));
          return;
        }
        if (pluginPane === "config") {
          if (selectedPluginConfigSettingIndex <= 0) {
            setPluginPane("components");
            return;
          }
          setSelectedPluginConfigSettingIndex((current) => Math.max(0, current - 1));
          return;
        }
        if (pluginPane === "actions") {
          setPluginPane("list");
          setSelectedPluginAction("delete");
          return;
        }
        if (selectedPluginIndex <= 0) {
          setPluginPane("tabs");
          return;
        }
        setSelectedPluginIndex((current) => Math.max(0, current - 1));
        setSelectedPluginComponentIndex(0);
        setSelectedPluginAction("switch");
        return;
      }
      if (activeView === "agents") {
        if (isEditingPersona && agentPane !== "fields") {
          setSelectedAgentAction("save");
          return;
        }
        if (agentPane === "fields") {
          if (selectedAgentFieldIndex <= 0) {
            setAgentPane("list");
            setSelectedAgentAction(isEditingPersona ? "save" : "delete");
            return;
          }
          setSelectedAgentFieldIndex((current) => Math.max(0, current - 1));
          return;
        }
        if (selectedAgentAction === "newFolder") {
          setSelectedAgentAction("new");
          return;
        }
        if (selectedAgentAction === "new") {
          return;
        }
        if (selectedAgentEntryIndex <= 0) {
          setSelectedAgentAction("new");
          return;
        }
        setSelectedAgentEntryIndex((current) => Math.max(0, current - 1));
        setSelectedAgentAction(isEditingPersona ? "save" : "delete");
        setSelectedAgentFieldIndex(0);
        return;
      }
      if (activeView === "providers") {
        if (providerPane === "tabs") {
          return;
        }
        if (!providerUsesSourceLayout && providerPane === "models") {
          if (selectedProviderModelAction === "new") {
            setProviderPane("tabs");
            return;
          }
          if (selectedProviderIndex <= 0) {
            setSelectedProviderModelAction("new");
            return;
          }
        }
        if (providerUsesSourceLayout && providerPane === "sources") {
          if (selectedProviderSourceAction === "new") {
            setProviderPane("tabs");
            return;
          }
          if (selectedProviderSourceIndex <= 0) {
            setSelectedProviderSourceAction("new");
            return;
          }
          setSelectedProviderSourceIndex((current) => Math.max(0, current - 1));
          setSelectedProviderIndex(0);
          setSelectedProviderSourceSettingIndex(0);
          setSelectedProviderSourceAction("switch");
        } else if (providerUsesSourceLayout && providerPane === "settings") {
          if (selectedProviderSourceSettingIndex <= 0) {
            setProviderPane("sources");
            return;
          }
          setSelectedProviderSourceSettingIndex((current) => Math.max(0, current - 1));
        } else if (selectedProviderIndex <= 0) {
          setProviderPane(providerUsesSourceLayout ? "settings" : "tabs");
        } else {
          const nextIndex = Math.max(0, selectedProviderIndex - 1);
          setSelectedProviderIndex(nextIndex);
          setSelectedProviderModelAction(defaultProviderModelAction(selectedProviderEntries[nextIndex]));
        }
        return;
      }
      if (activeView === "platforms") {
        if (platformPane === "platforms") {
          if (selectedPlatformAction === "new") {
            return;
          }
          if (selectedPlatformIndex <= 0) {
            setSelectedPlatformAction("new");
            return;
          }
          setSelectedPlatformIndex((current) => Math.max(0, current - 1));
          setSelectedPlatformSettingIndex(0);
          setSelectedPlatformAction("switch");
        } else if (platformPane === "login") {
          setPlatformPane("platforms");
          setSelectedPlatformAction("switch");
        } else if (selectedPlatformSettingIndex <= 0) {
          setPlatformPane("platforms");
          setSelectedPlatformAction("delete");
        } else {
          setSelectedPlatformSettingIndex((current) => Math.max(0, current - 1));
        }
        return;
      }
      if (
        activeView === "chat" &&
        selectedSidebarAction === null &&
        selectedFilteredIndex <= 0
      ) {
        setSelectedSidebarAction("new");
        return;
      }
      if (activeView === "commands") {
        if (componentsView === "tools") {
          setSelectedToolIndex((current) => Math.max(0, current - 1));
          return;
        }
        setSelectedCommandIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (activeView !== "chat") {
        return;
      }
      if (!filteredSessions.length) {
        return;
      }
      const currentIndex = selectedFilteredIndex >= 0 ? selectedFilteredIndex : 0;
      const nextSession = filteredSessions[Math.max(0, currentIndex - 1)];
      if (nextSession) {
        setSelectedSessionId(nextSession.session_id);
        setSelectedSidebarAction(null);
        setActiveView("chat");
        setMessageScrollOffset(0);
      }
      return;
    }
    if (key.downArrow) {
      if (activeView === "providers" && pendingProviderDelete) {
        setPendingProviderDelete(null);
      }
      if (activeView === "platforms" && pendingPlatformDelete) {
        setPendingPlatformDelete(null);
      }
      if (activeView === "plugins" && pendingPluginDeleteName) {
        setPendingPluginDeleteName(null);
      }
      if (activeView === "plugins" && pendingMarketPluginKey) {
        setPendingMarketPluginKey(null);
      }
      if (activeView === "agents" && pendingPersonaDeleteId) {
        setPendingPersonaDeleteId(null);
      }
      if (activeView === "config" && pendingConfigDeleteId) {
        setPendingConfigDeleteId(null);
      }
      if (activeView === "console") {
        setConsoleScrollOffset((current) =>
          clampScrollOffset(current - 3, maxConsoleScrollOffset),
        );
        return;
      }
      if (activeView === "config") {
        if (loadingConfig || savingConfig) {
          return;
        }
        if (configPane === "tabs") {
          setConfigPane(configDetailPane());
          setSelectedConfigGroupIndex(0);
          selectConfigGroupFirstSetting(0);
          return;
        }
        if (configPane === "fileButton") {
          setConfigPane("fileDialog");
          return;
        }
        if (configPane === "fileActions") {
          setConfigPane("fileDialog");
          return;
        }
        if (configPane === "settings") {
          const groupSettings = currentConfigGroupSettings();
          const groupIndex = Math.max(0, groupSettings.indexOf(selectedConfigSettingIndex));
          setSelectedConfigSettingIndex(
            groupSettings[Math.min(Math.max(0, groupSettings.length - 1), groupIndex + 1)] ??
              selectedConfigSettingIndex,
          );
          return;
        }
        if (configPane === "groups") {
          setSelectedConfigGroupIndex((current: number) => {
            const next = Math.min(Math.max(0, selectedConfigGroups.length - 1), current + 1);
            selectConfigGroupFirstSetting(next);
            return next;
          });
          return;
        }
        if (configPane === "fileDialog") {
          setSelectedAbconfIndex((current: number) =>
            Math.min(Math.max(0, abconfs.length - 1), current + 1),
          );
          selectConfigGroupFirstSetting(0);
        }
        return;
      }
      if (activeView === "plugins") {
        if (pluginPane === "tabs") {
          setPluginPane(pluginTab === "market" ? "market" : "list");
          return;
        }
        if (pluginTab === "market") {
          if (pluginPane === "marketSearch") {
            setPluginPane("market");
            return;
          }
          if (pluginPane === "marketActions") {
            setMarketDetailScrollOffset((current) => current + 1);
            return;
          }
          setSelectedMarketPluginIndex((current) =>
            Math.min(Math.max(0, filteredMarketPlugins.length - 1), current + 1),
          );
          return;
        }
        if (pluginPane === "actions") {
          if (selectedPluginComponents.length) {
            setPluginPane("components");
            setSelectedPluginComponentIndex(0);
          } else if (selectedPluginConfigSettings.length) {
            setPluginPane("config");
            setSelectedPluginConfigSettingIndex(0);
          }
          return;
        }
        if (pluginPane === "components") {
          if (
            selectedPluginComponentIndex >= Math.max(0, selectedPluginComponents.length - 1) &&
            selectedPluginConfigSettings.length
          ) {
            setPluginPane("config");
            setSelectedPluginConfigSettingIndex(0);
          } else {
            setSelectedPluginComponentIndex((current) =>
              Math.min(Math.max(0, selectedPluginComponents.length - 1), current + 1),
            );
          }
          return;
        }
        if (pluginPane === "config") {
          setSelectedPluginConfigSettingIndex((current) =>
            Math.min(Math.max(0, selectedPluginConfigSettings.length - 1), current + 1),
          );
          return;
        }
        setSelectedPluginIndex((current) =>
          Math.min(Math.max(0, plugins.length - 1), current + 1),
        );
        setSelectedPluginComponentIndex(0);
        setSelectedPluginAction("switch");
        return;
      }
      if (activeView === "agents") {
        if (isEditingPersona && agentPane !== "fields") {
          setSelectedAgentAction("save");
          return;
        }
        if (agentPane === "fields") {
          setSelectedAgentFieldIndex((current) =>
            Math.min(Math.max(0, agentFields.length - 1), current + 1),
          );
          return;
        }
        if (selectedAgentAction === "new") {
          setSelectedAgentAction("newFolder");
          return;
        }
        if (selectedAgentAction === "newFolder") {
          if (!agentEntries.length) {
            return;
          }
          setSelectedAgentAction(isEditingPersona ? "save" : "delete");
          return;
        }
        setSelectedAgentEntryIndex((current) =>
          Math.min(Math.max(0, agentEntries.length - 1), current + 1),
        );
        setSelectedAgentAction(isEditingPersona ? "save" : "delete");
        setSelectedAgentFieldIndex(0);
        return;
      }
      if (activeView === "providers") {
        if (providerPane === "tabs") {
          setProviderPane(providerUsesSourceLayout ? "sources" : "models");
          if (providerUsesSourceLayout) {
            setSelectedProviderSourceAction("new");
          } else {
            setSelectedProviderModelAction("new");
          }
          return;
        }
        if (!providerUsesSourceLayout && providerPane === "models") {
          if (selectedProviderModelAction === "new") {
            if (selectedProviderEntries.length === 0) {
              return;
            }
            setSelectedProviderModelAction(defaultProviderModelAction(selectedProviderEntry));
            return;
          }
        }
        if (providerUsesSourceLayout && providerPane === "sources") {
          if (selectedProviderSourceAction === "new") {
            setSelectedProviderSourceAction("switch");
            return;
          }
          setSelectedProviderSourceIndex((current) =>
            Math.min(Math.max(0, providerSources.length - 1), current + 1),
          );
          setSelectedProviderIndex(0);
          setSelectedProviderSourceSettingIndex(0);
          setSelectedProviderSourceAction("switch");
        } else if (providerUsesSourceLayout && providerPane === "settings") {
          if (
            selectedProviderSourceSettingIndex >=
            Math.max(0, providerSourceSettings.length - 1)
          ) {
            setProviderPane("models");
            setSelectedProviderModelAction(
              defaultProviderModelAction(selectedProviderEntries[selectedProviderIndex]),
            );
            return;
          }
          setSelectedProviderSourceSettingIndex((current) =>
            Math.min(Math.max(0, providerSourceSettings.length - 1), current + 1),
          );
        } else {
          const nextIndex = Math.min(
            Math.max(0, selectedProviderEntries.length - 1),
            selectedProviderIndex + 1,
          );
          setSelectedProviderIndex(nextIndex);
          setSelectedProviderModelAction(defaultProviderModelAction(selectedProviderEntries[nextIndex]));
        }
        return;
      }
      if (activeView === "platforms") {
        if (platformPane === "platforms") {
          if (selectedPlatformAction === "new") {
            setSelectedPlatformAction("switch");
            return;
          }
          setSelectedPlatformIndex((current) =>
            Math.min(Math.max(0, platforms.length - 1), current + 1),
          );
          setSelectedPlatformSettingIndex(0);
          setSelectedPlatformAction("switch");
        } else if (platformPane === "login") {
          setPlatformPane("settings");
          setSelectedPlatformSettingIndex(0);
        } else {
          setSelectedPlatformSettingIndex((current) =>
            Math.min(Math.max(0, selectedPlatformSettings.length - 1), current + 1),
          );
        }
        return;
      }
      if (activeView === "chat" && selectedSidebarAction === "new") {
        const nextSession = filteredSessions[0];
        if (nextSession) {
          setSelectedSessionId(nextSession.session_id);
          setSelectedSidebarAction(null);
          setMessageScrollOffset(0);
        }
        return;
      }
      if (activeView === "commands") {
        if (componentsView === "tools") {
          setSelectedToolIndex((current) =>
            Math.min(Math.max(0, tools.length - 1), current + 1),
          );
          return;
        }
        setSelectedCommandIndex((current) =>
          Math.min(Math.max(0, commands.length - 1), current + 1),
        );
        return;
      }
      if (activeView !== "chat") {
        return;
      }
      if (!filteredSessions.length) {
        return;
      }
      const currentIndex = selectedFilteredIndex >= 0 ? selectedFilteredIndex : 0;
      const nextSession =
        filteredSessions[Math.min(filteredSessions.length - 1, currentIndex + 1)];
      if (nextSession) {
        setSelectedSessionId(nextSession.session_id);
        setSelectedSidebarAction(null);
        setActiveView("chat");
        setMessageScrollOffset(0);
      }
      return;
    }
    if (key.leftArrow || key.rightArrow) {
      if (activeView === "providers" && pendingProviderDelete) {
        setPendingProviderDelete(null);
      }
      if (activeView === "platforms" && pendingPlatformDelete) {
        setPendingPlatformDelete(null);
      }
      if (activeView === "plugins" && pendingPluginDeleteName) {
        setPendingPluginDeleteName(null);
      }
      if (activeView === "plugins" && pendingMarketPluginKey) {
        setPendingMarketPluginKey(null);
      }
      if (activeView === "agents" && pendingPersonaDeleteId) {
        setPendingPersonaDeleteId(null);
      }
      if (activeView === "config" && pendingConfigDeleteId) {
        setPendingConfigDeleteId(null);
      }
      if (activeView === "commands") {
        setComponentsView((current) =>
          current === "commands" ? "tools" : "commands",
        );
      } else if (activeView === "config") {
        if (loadingConfig || savingConfig) {
          return;
        }
        if (configPane === "tabs") {
          if (key.leftArrow && configTab === "normal") {
            return;
          }
          if (key.rightArrow && configTab === "normal") {
            setConfigTab("system");
            setSelectedConfigGroupIndex(0);
            selectConfigGroupFirstSetting(0);
          } else if (key.rightArrow && configTab === "system") {
            setConfigPane("fileButton");
            setConfigTab("normal");
          } else if (key.leftArrow && configTab === "system") {
            setConfigTab("normal");
            setSelectedConfigGroupIndex(0);
            selectConfigGroupFirstSetting(0);
          } else {
            setConfigPane("tabs");
          }
        } else if (configPane === "fileButton") {
          if (key.leftArrow) {
            setConfigPane("tabs");
            setConfigTab("system");
          } else {
            return;
          }
        } else if (configPane === "fileActions") {
          const actions = ["new", "copy", "rename", "delete"] as const;
          setSelectedConfigFileAction((current: typeof actions[number]) => {
            const index = Math.max(0, actions.indexOf(current));
            const nextIndex = key.leftArrow
              ? Math.max(0, index - 1)
              : Math.min(actions.length - 1, index + 1);
            return actions[nextIndex];
          });
        } else if (configPane === "fileDialog") {
          if (key.leftArrow) {
            setConfigPane("fileButton");
            setConfigTab("normal");
          } else {
            setConfigPane(configDetailPane());
            setSelectedConfigGroupIndex(0);
            selectConfigGroupFirstSetting(0);
          }
        } else if (configPane === "groups") {
          if (key.leftArrow) {
            setConfigPane("tabs");
          } else {
            setConfigPane("settings");
          }
        } else if (configPane === "settings") {
          setConfigPane(configBackPane());
        }
      } else if (activeView === "plugins") {
        if (pluginPane === "tabs") {
          if (pluginTab === "market" && key.rightArrow) {
            setPluginPane("marketSearch");
          } else {
            setPluginTab((current) => (current === "installed" ? "market" : "installed"));
            setPluginPane("tabs");
          }
        } else if (pluginTab === "market") {
          if (pluginPane === "marketSearch") {
            if (key.leftArrow) {
              setPluginPane("tabs");
            }
          } else if (pluginPane === "marketActions") {
            if (key.leftArrow) {
              setPluginPane("market");
            }
          } else if (key.rightArrow) {
            setPluginPane("marketActions");
            setMarketDetailScrollOffset(0);
          } else {
            setPluginPane("tabs");
          }
        } else if (pluginPane === "actions") {
          if (key.leftArrow) {
            if (selectedPluginDetailAction === "reload") {
              setPluginPane("list");
              setSelectedPluginAction("delete");
            } else {
              setSelectedPluginDetailAction("reload");
            }
          } else {
            if (selectedPluginDetailAction === "update") {
              setPluginPane("components");
              setSelectedPluginComponentIndex(0);
            } else {
              setSelectedPluginDetailAction("update");
            }
          }
        } else if (pluginPane === "components") {
          if (key.leftArrow) {
            setPluginPane("list");
            setSelectedPluginAction("delete");
          }
        } else if (pluginPane === "config") {
          if (key.leftArrow) {
            setPluginPane("list");
            setSelectedPluginAction("delete");
          }
        } else if (key.rightArrow && selectedPluginAction === "delete") {
          setPluginPane("actions");
        } else {
          setSelectedPluginAction((current) => {
            const index = Math.max(0, PLUGIN_ACTIONS.indexOf(current));
            const nextIndex = key.leftArrow
              ? Math.max(0, index - 1)
              : Math.min(PLUGIN_ACTIONS.length - 1, index + 1);
            return PLUGIN_ACTIONS[nextIndex];
          });
        }
      } else if (activeView === "agents") {
        if (agentPane === "fields") {
          if (key.leftArrow) {
            setAgentPane("list");
            setSelectedAgentAction(isEditingPersona ? "save" : "delete");
          }
        } else if (selectedAgentAction === "new") {
          if (key.rightArrow) {
            setSelectedAgentAction("newFolder");
          }
        } else if (selectedAgentAction === "newFolder") {
          if (key.leftArrow) {
            setSelectedAgentAction("new");
          } else if (agentEntries.length) {
            setSelectedAgentAction(isEditingPersona ? "save" : "delete");
          }
        } else if (
          key.rightArrow &&
          !isEditingPersona &&
          selectedAgentEntry?.type === "persona"
        ) {
          void beginEditSelectedPersona();
        } else if (
          key.rightArrow &&
          selectedAgentEntry?.type === "persona" &&
          selectedAgentAction === selectedAgentActions[selectedAgentActions.length - 1]
        ) {
          setAgentPane("fields");
          setSelectedAgentFieldIndex(0);
        } else {
          setSelectedAgentAction((current) => {
            const actions = selectedAgentActions;
            const index = Math.max(0, actions.indexOf(current));
            const nextIndex = key.leftArrow
              ? Math.max(0, index - 1)
              : Math.min(actions.length - 1, index + 1);
            return actions[nextIndex] || current;
          });
        }
      } else if (activeView === "providers") {
        if (providerPane === "tabs") {
          setProviderType((current) => {
            const currentIndex = PROVIDER_TYPES.indexOf(current);
            const direction = key.leftArrow ? -1 : 1;
            const nextIndex =
              (currentIndex + direction + PROVIDER_TYPES.length) % PROVIDER_TYPES.length;
            return PROVIDER_TYPES[nextIndex];
          });
          setSelectedProviderSourceIndex(0);
          setSelectedProviderSourceSettingIndex(0);
          setSelectedProviderIndex(0);
        } else if (providerUsesSourceLayout && providerPane === "sources") {
          if (selectedProviderSourceAction === "new") {
            if (key.rightArrow) {
              setSelectedProviderSourceAction("switch");
            }
            return;
          }
          if (key.leftArrow) {
            setSelectedProviderSourceAction((current) => {
              const index = PROVIDER_SOURCE_ROW_ACTIONS.indexOf(current);
              return PROVIDER_SOURCE_ROW_ACTIONS[Math.max(0, index - 1)];
            });
          } else if (selectedProviderSourceAction === "delete") {
            setProviderPane("settings");
          } else {
            setSelectedProviderSourceAction((current) => {
              const index = PROVIDER_SOURCE_ROW_ACTIONS.indexOf(current);
              return PROVIDER_SOURCE_ROW_ACTIONS[Math.min(PROVIDER_SOURCE_ROW_ACTIONS.length - 1, index + 1)];
            });
          }
        } else if (providerUsesSourceLayout && providerPane === "settings") {
          if (key.leftArrow) {
            setProviderPane("sources");
            setSelectedProviderSourceAction("delete");
          } else {
            setProviderPane("models");
            setSelectedProviderModelAction(
              defaultProviderModelAction(selectedProviderEntries[selectedProviderIndex]),
            );
          }
        } else if (activeView === "providers") {
          if (!providerUsesSourceLayout && selectedProviderModelAction === "new") {
            if (selectedProviderEntries.length === 0) {
              return;
            }
            if (key.rightArrow) {
              setSelectedProviderModelAction(defaultProviderModelAction(selectedProviderEntry));
            }
            return;
          }
          if (
            key.leftArrow &&
            providerUsesSourceLayout &&
            (selectedProviderModelAction === "switch" ||
              selectedProviderEntry?.type === "available")
          ) {
            setProviderPane("sources");
            setSelectedProviderSourceAction("delete");
          } else {
            const modelActions =
              selectedProviderEntry?.type === "available"
                ? AVAILABLE_PROVIDER_MODEL_ACTIONS
                : PROVIDER_MODEL_ACTIONS;
            setSelectedProviderModelAction((current) => {
              const index = Math.max(0, modelActions.indexOf(current));
              const nextIndex = key.leftArrow
                ? Math.max(0, index - 1)
                : Math.min(modelActions.length - 1, index + 1);
              return modelActions[nextIndex];
            });
          }
        }
      } else if (activeView === "platforms") {
        if (platformPane === "settings") {
          if (key.leftArrow) {
            setPlatformPane("platforms");
            setSelectedPlatformAction("delete");
          }
        } else if (platformPane === "login") {
          if (key.leftArrow) {
            setPlatformPane("platforms");
            setSelectedPlatformAction("delete");
          } else {
            setPlatformPane("settings");
            setSelectedPlatformSettingIndex(0);
          }
        } else if (selectedPlatformAction === "new") {
          if (key.rightArrow) {
            setSelectedPlatformAction("switch");
          }
        } else if (key.rightArrow && selectedPlatformAction === "delete") {
          if (selectedPlatformActions.includes("login")) {
            setSelectedPlatformAction("login");
          } else {
            setPlatformPane("settings");
            setSelectedPlatformSettingIndex(0);
          }
        } else if (key.rightArrow && selectedPlatformAction === "login") {
          setPlatformPane("login");
        } else {
          setSelectedPlatformAction((current) => {
            const actions = selectedPlatformActions;
            const index = Math.max(0, actions.indexOf(current));
            const nextIndex = key.leftArrow
              ? Math.max(0, index - 1)
              : Math.min(actions.length - 1, index + 1);
            return actions[nextIndex];
          });
        }
      } else if (activeView === "status") {
        setTokenRange((current) => {
          const currentIndex = TOKEN_RANGES.indexOf(current);
          const direction = key.leftArrow ? -1 : 1;
          const nextIndex =
            (currentIndex + direction + TOKEN_RANGES.length) % TOKEN_RANGES.length;
          return TOKEN_RANGES[nextIndex];
        });
      }
      return;
    }
    if (key.pageUp) {
      if (activeView === "chat") {
        setMessageScrollOffset((current) =>
          clampScrollOffset(
            current + Math.max(1, layout.bodyHeight - 3),
            maxMessageScrollOffset,
          ),
        );
      } else if (activeView === "status") {
        setStatusScrollOffset((current) =>
          clampScrollOffset(
            current - Math.max(1, layout.bodyHeight - 3),
            maxStatusScrollOffset,
          ),
        );
      } else if (activeView === "console") {
        setConsoleScrollOffset((current) =>
          clampScrollOffset(
            current + Math.max(1, layout.bodyHeight - 3),
            maxConsoleScrollOffset,
          ),
        );
      } else if (activeView === "commands") {
        if (componentsView === "tools") {
          setSelectedToolIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 4)),
          );
        } else {
          setSelectedCommandIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 4)),
          );
        }
      } else if (activeView === "config") {
        const jump = Math.max(1, layout.bodyHeight - 7);
        if (configPane === "settings") {
          const groupSettings = currentConfigGroupSettings();
          const groupIndex = Math.max(0, groupSettings.indexOf(selectedConfigSettingIndex));
          setSelectedConfigSettingIndex(groupSettings[Math.max(0, groupIndex - jump)] ?? selectedConfigSettingIndex);
        } else if (configPane === "groups") {
          const next = Math.max(0, selectedConfigGroupIndex - jump);
          setSelectedConfigGroupIndex(next);
          selectConfigGroupFirstSetting(next);
        } else if (configPane === "fileDialog") {
          setSelectedAbconfIndex((current: number) =>
            Math.max(0, current - jump),
          );
          selectConfigGroupFirstSetting(0);
        }
      } else if (activeView === "plugins") {
        if (pluginPane === "tabs") {
          return;
        }
        if (pluginTab === "market") {
          if (pluginPane === "marketSearch") {
            return;
          }
          if (pluginPane === "marketActions") {
            setMarketDetailScrollOffset((current) =>
              Math.max(0, current - Math.max(1, layout.bodyHeight - 5)),
            );
            return;
          }
          setSelectedMarketPluginIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 5)),
          );
        } else if (pluginPane === "actions") {
          return;
        }
        if (pluginPane === "components") {
          const jump = Math.max(1, layout.bodyHeight - 8);
          if (selectedPluginComponentIndex <= jump && pluginPane === "components") {
            setSelectedPluginComponentIndex(0);
          } else {
            setSelectedPluginComponentIndex((current) =>
              Math.max(0, current - jump),
            );
          }
        } else if (pluginPane === "config") {
          const jump = Math.max(1, layout.bodyHeight - 8);
          if (selectedPluginConfigSettingIndex <= jump) {
            setPluginPane("components");
            return;
          }
          setSelectedPluginConfigSettingIndex((current) =>
            Math.max(0, current - jump),
          );
        } else {
          setSelectedPluginIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 5)),
          );
          setSelectedPluginComponentIndex(0);
          setSelectedPluginAction("switch");
        }
      } else if (activeView === "agents") {
        if (agentPane === "fields") {
          setSelectedAgentFieldIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 5)),
          );
        } else if (selectedAgentAction === "newFolder") {
          setSelectedAgentAction("new");
        } else if (selectedAgentAction === "new") {
          return;
        } else {
          setSelectedAgentEntryIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 5)),
          );
          setSelectedAgentAction(isEditingPersona ? "save" : "delete");
          setSelectedAgentFieldIndex(0);
        }
      } else if (activeView === "providers") {
        if (providerPane === "tabs") {
          return;
        }
        if (providerUsesSourceLayout && providerPane === "sources") {
          if (selectedProviderSourceAction === "new") {
            return;
          }
          setSelectedProviderSourceIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 5)),
          );
          setSelectedProviderIndex(0);
          setSelectedProviderSourceSettingIndex(0);
          setSelectedProviderSourceAction("switch");
        } else if (providerUsesSourceLayout && providerPane === "settings") {
          setSelectedProviderSourceSettingIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 5)),
          );
        } else {
          const nextIndex = Math.max(
            0,
            selectedProviderIndex - Math.max(1, layout.bodyHeight - 5),
          );
          setSelectedProviderIndex(nextIndex);
          setSelectedProviderModelAction(defaultProviderModelAction(selectedProviderEntries[nextIndex]));
        }
      } else if (activeView === "platforms") {
        if (platformPane === "platforms") {
          if (selectedPlatformAction === "new") {
            return;
          }
          setSelectedPlatformIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 5)),
          );
          setSelectedPlatformSettingIndex(0);
          setSelectedPlatformAction("switch");
        } else if (platformPane === "settings") {
          setSelectedPlatformSettingIndex((current) =>
            Math.max(0, current - Math.max(1, layout.bodyHeight - 5)),
          );
        }
      }
      return;
    }
    if (key.pageDown) {
      if (activeView === "chat") {
        setMessageScrollOffset((current) =>
          clampScrollOffset(
            current - Math.max(1, layout.bodyHeight - 3),
            maxMessageScrollOffset,
          ),
        );
      } else if (activeView === "status") {
        setStatusScrollOffset((current) =>
          clampScrollOffset(
            current + Math.max(1, layout.bodyHeight - 3),
            maxStatusScrollOffset,
          ),
        );
      } else if (activeView === "console") {
        setConsoleScrollOffset((current) =>
          clampScrollOffset(
            current - Math.max(1, layout.bodyHeight - 3),
            maxConsoleScrollOffset,
          ),
        );
      } else if (activeView === "commands") {
        if (componentsView === "tools") {
          setSelectedToolIndex((current) =>
            Math.min(
              Math.max(0, tools.length - 1),
              current + Math.max(1, layout.bodyHeight - 4),
            ),
          );
        } else {
          setSelectedCommandIndex((current) =>
            Math.min(
              Math.max(0, commands.length - 1),
              current + Math.max(1, layout.bodyHeight - 4),
            ),
          );
        }
      } else if (activeView === "config") {
        const jump = Math.max(1, layout.bodyHeight - 7);
        if (configPane === "tabs") {
          setConfigPane(configDetailPane());
          setSelectedConfigGroupIndex(0);
          selectConfigGroupFirstSetting(0);
        } else if (configPane === "settings") {
          const groupSettings = currentConfigGroupSettings();
          const groupIndex = Math.max(0, groupSettings.indexOf(selectedConfigSettingIndex));
          setSelectedConfigSettingIndex(
            groupSettings[Math.min(Math.max(0, groupSettings.length - 1), groupIndex + jump)] ??
              selectedConfigSettingIndex,
          );
        } else if (configPane === "groups") {
          const next = Math.min(Math.max(0, selectedConfigGroups.length - 1), selectedConfigGroupIndex + jump);
          setSelectedConfigGroupIndex(next);
          selectConfigGroupFirstSetting(next);
        } else if (configPane === "fileActions") {
          setConfigPane("fileDialog");
        } else if (configPane === "fileDialog") {
          setSelectedAbconfIndex((current: number) =>
            Math.min(Math.max(0, abconfs.length - 1), current + jump),
          );
          selectConfigGroupFirstSetting(0);
        } else if (configPane === "fileButton") {
          setConfigPane("fileDialog");
        }
      } else if (activeView === "plugins") {
        if (pluginPane === "tabs") {
          setPluginPane(pluginTab === "market" ? "market" : "list");
        } else if (pluginTab === "market") {
          if (pluginPane === "marketSearch") {
            setPluginPane("market");
            return;
          }
          if (pluginPane === "marketActions") {
            setMarketDetailScrollOffset((current) =>
              current + Math.max(1, layout.bodyHeight - 5),
            );
            return;
          }
          setSelectedMarketPluginIndex((current) =>
            Math.min(
              Math.max(0, filteredMarketPlugins.length - 1),
              current + Math.max(1, layout.bodyHeight - 5),
            ),
          );
        } else if (pluginPane === "actions") {
          if (selectedPluginComponents.length) {
            setPluginPane("components");
            setSelectedPluginComponentIndex(0);
          } else if (selectedPluginConfigSettings.length) {
            setPluginPane("config");
            setSelectedPluginConfigSettingIndex(0);
          }
        } else if (pluginPane === "components") {
          if (
            selectedPluginComponentIndex >= Math.max(0, selectedPluginComponents.length - 1) &&
            selectedPluginConfigSettings.length
          ) {
            setPluginPane("config");
            setSelectedPluginConfigSettingIndex(0);
          } else {
            setSelectedPluginComponentIndex((current) =>
              Math.min(
                Math.max(0, selectedPluginComponents.length - 1),
                current + Math.max(1, layout.bodyHeight - 8),
              ),
            );
          }
        } else if (pluginPane === "config") {
          setSelectedPluginConfigSettingIndex((current) =>
            Math.min(
              Math.max(0, selectedPluginConfigSettings.length - 1),
              current + Math.max(1, layout.bodyHeight - 8),
            ),
          );
          return;
        } else {
          setSelectedPluginIndex((current) =>
            Math.min(
              Math.max(0, plugins.length - 1),
              current + Math.max(1, layout.bodyHeight - 5),
            ),
          );
          setSelectedPluginComponentIndex(0);
          setSelectedPluginAction("switch");
        }
      } else if (activeView === "agents") {
        if (agentPane === "fields") {
          setSelectedAgentFieldIndex((current) =>
            Math.min(
              Math.max(0, agentFields.length - 1),
              current + Math.max(1, layout.bodyHeight - 5),
            ),
          );
        } else if (selectedAgentAction === "new") {
          setSelectedAgentAction("newFolder");
        } else if (selectedAgentAction === "newFolder") {
          setSelectedAgentAction(isEditingPersona ? "save" : "delete");
        } else {
          setSelectedAgentEntryIndex((current) =>
            Math.min(
              Math.max(0, agentEntries.length - 1),
              current + Math.max(1, layout.bodyHeight - 5),
            ),
          );
          setSelectedAgentAction(isEditingPersona ? "save" : "delete");
          setSelectedAgentFieldIndex(0);
        }
      } else if (activeView === "providers") {
        if (providerPane === "tabs") {
          return;
        }
        if (providerUsesSourceLayout && providerPane === "sources") {
          if (selectedProviderSourceAction === "new") {
            setSelectedProviderSourceAction("switch");
            return;
          }
          setSelectedProviderSourceIndex((current) =>
            Math.min(
              Math.max(0, providerSources.length - 1),
              current + Math.max(1, layout.bodyHeight - 5),
            ),
          );
          setSelectedProviderIndex(0);
          setSelectedProviderSourceSettingIndex(0);
          setSelectedProviderSourceAction("switch");
        } else if (providerUsesSourceLayout && providerPane === "settings") {
          setSelectedProviderSourceSettingIndex((current) =>
            Math.min(
              Math.max(0, providerSourceSettings.length - 1),
              current + Math.max(1, layout.bodyHeight - 5),
            ),
          );
        } else {
          const nextIndex = Math.min(
            Math.max(0, selectedProviderEntries.length - 1),
            selectedProviderIndex + Math.max(1, layout.bodyHeight - 5),
          );
          setSelectedProviderIndex(nextIndex);
          setSelectedProviderModelAction(defaultProviderModelAction(selectedProviderEntries[nextIndex]));
        }
      } else if (activeView === "platforms") {
        if (platformPane === "platforms") {
          if (selectedPlatformAction === "new") {
            setSelectedPlatformAction("switch");
            return;
          }
          setSelectedPlatformIndex((current) =>
            Math.min(
              Math.max(0, platforms.length - 1),
              current + Math.max(1, layout.bodyHeight - 5),
            ),
          );
          setSelectedPlatformSettingIndex(0);
          setSelectedPlatformAction("switch");
        } else if (platformPane === "settings") {
          setSelectedPlatformSettingIndex((current) =>
            Math.min(
              Math.max(0, selectedPlatformSettings.length - 1),
              current + Math.max(1, layout.bodyHeight - 5),
            ),
          );
        }
      }
      return;
    }
    if (key.return) {
      if (activeView !== "chat") {
        if (activeView === "commands") {
          if (componentsView === "tools") {
            void toggleSelectedTool();
          } else {
            void toggleSelectedCommand();
          }
        }
        if (activeView === "plugins") {
          if (pluginPane === "tabs") {
            setPluginPane(pluginTab === "market" ? "market" : "list");
          } else if (pluginTab === "market") {
          if (pluginPane === "marketSearch") {
              setMarketFilterCursor(Array.from(marketFilter).length);
              setIsEditingMarketFilter(true);
          } else if (pluginPane === "marketActions") {
            void executeSelectedMarketPluginAction();
          } else {
            setPluginPane("marketActions");
          }
        } else if (pluginPane === "actions") {
            void executeSelectedPluginDetailAction();
          } else if (pluginPane === "components") {
            setPluginPane("actions");
          } else if (pluginPane === "config") {
            beginEditPluginConfigSetting();
          } else {
            void executeSelectedPluginAction();
          }
        }
        if (activeView === "agents") {
          if (agentPane === "fields") {
            beginEditAgentField();
          } else {
            void executeSelectedAgentAction();
          }
        }
        if (activeView === "config") {
          if (loadingConfig || savingConfig) {
            return;
          }
          if (configPane === "tabs") {
            setConfigPane(configDetailPane());
            setSelectedConfigGroupIndex(0);
            selectConfigGroupFirstSetting(0);
          } else if (configPane === "fileActions") {
            void executeSelectedConfigFileAction();
          } else if (configPane === "fileDialog") {
            void loadNormalConfig(abconfs[selectedAbconfIndex] || null);
            setConfigPane(configDetailPane());
            setSelectedConfigGroupIndex(0);
            selectConfigGroupFirstSetting(0);
          } else if (configPane === "fileButton") {
            setConfigPane("fileDialog");
          } else if (configPane === "groups") {
            setConfigPane("settings");
          } else {
            beginEditConfigSetting();
          }
        }
        if (activeView === "providers") {
          if (providerPane === "sources") {
            if (selectedProviderSourceAction === "new") {
              beginCreateProviderSource();
            } else {
              void executeSelectedProviderSourceAction();
            }
          } else if (providerPane === "settings") {
            beginEditProviderSourceSetting();
          } else if (providerPane === "models") {
            if (!providerUsesSourceLayout && selectedProviderModelAction === "new") {
              beginCreateProvider();
            } else {
              void executeSelectedProviderModelAction();
            }
          }
        }
        if (activeView === "platforms") {
          if (platformPane === "platforms") {
            if (selectedPlatformAction === "new") {
              beginCreatePlatform();
            } else {
              void executeSelectedPlatformAction();
            }
          } else if (platformPane === "login") {
            void startPlatformLogin();
          } else {
            beginEditPlatformSetting();
          }
        }
        return;
      }
      const submitted = input.trim();
      setInput("");
      if (!submitted) {
        if (selectedSidebarAction === "new") {
          void createSession();
          return;
        }
        return;
      }
      void sendMessage(submitted);
      return;
    }
    if (activeView !== "chat") {
      return;
    }
    if (key.backspace || key.delete) {
      setInput((current) => current.slice(0, -1));
      return;
    }
    if (!key.ctrl && value) {
      setInput((current) => `${current}${value}`);
    }
}
