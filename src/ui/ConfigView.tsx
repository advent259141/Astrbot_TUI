import React from "react";
import { Box, Text } from "ink";
import type { AbconfInfo, AstrBotConfigPayload } from "../api/types.js";
import type { I18n } from "../i18n/index.js";
import type { AstrBotConfigSetting, ConfigPane, ConfigTab } from "./App.types.js";
import {
  padRightCells,
  terminalWidth,
  truncateCells,
} from "./terminal.js";

type TextColor = "cyan" | "green" | "yellow" | "red" | "magenta" | "blue" | "gray" | "white";

export interface ConfigViewProps {
  i18n: I18n;
  width: number;
  height: number;
  configTab: ConfigTab;
  configPane: ConfigPane;
  abconfs: AbconfInfo[];
  visibleAbconfs: AbconfInfo[];
  abconfWindowStart: number;
  selectedAbconfIndex: number;
  selectedConfigFileAction: ConfigFileAction;
  payload: AstrBotConfigPayload | null;
  groups: AstrBotConfigSetting[];
  selectedGroupIndex: number;
  visibleSettings: AstrBotConfigSetting[];
  settingWindowStart: number;
  settingCount: number;
  selectedConfigSettingIndex: number;
  selectedSetting: AstrBotConfigSetting | null;
  editingConfigSettingKey: string | null;
  loading: boolean;
  saving: boolean;
  pendingConfigDeleteId: string | null;
}

export type ConfigFileAction = "new" | "copy" | "rename" | "delete";

const FILE_ACTIONS: ConfigFileAction[] = ["new", "copy", "rename", "delete"];
const FILE_ACTION_WIDTH = 9;

export function ConfigView({
  i18n,
  width,
  height,
  configTab,
  configPane,
  abconfs,
  visibleAbconfs,
  abconfWindowStart,
  selectedAbconfIndex,
  selectedConfigFileAction,
  payload,
  groups,
  selectedGroupIndex,
  visibleSettings,
  settingWindowStart,
  settingCount,
  selectedConfigSettingIndex,
  selectedSetting,
  editingConfigSettingKey,
  loading,
  saving,
  pendingConfigDeleteId,
}: ConfigViewProps) {
  const bodyWidth = Math.max(34, width);
  const groupWidth = groups.length > 1
    ? Math.max(18, Math.min(28, Math.floor(bodyWidth * 0.22)))
    : 0;
  const detailWidth = Math.max(34, bodyWidth - groupWidth - (groupWidth ? 2 : 0));
  const panelHeight = Math.max(1, height - 3);
  const fileManagerActive =
    configPane === "fileButton" || configPane === "fileDialog" || configPane === "fileActions";
  const selectedConfig = abconfs[selectedAbconfIndex] || null;
  const meta = configTab === "system"
    ? i18n.t("tui.config.meta.system", "System config")
    : i18n.t("tui.config.meta.normal", "{count} configs  {position}", {
        count: abconfs.length,
        position: abconfs.length
          ? `${Math.min(selectedAbconfIndex + 1, abconfs.length)}/${abconfs.length}`
          : "0/0",
      });

  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{i18n.t("core.navigation.config", "Config")}</Text>
        <Text dimColor>{meta}</Text>
      </Box>
      <ConfigTabs
        i18n={i18n}
        width={width}
        configTab={configTab}
        configPane={configPane}
        loading={loading}
        saving={saving}
        abconfs={abconfs}
        selectedAbconfIndex={selectedAbconfIndex}
      />
      {fileManagerActive ? (
        <Box
          width={bodyWidth}
          height={panelHeight}
          flexDirection="column"
          borderStyle="single"
          borderColor="cyan"
          paddingX={1}
        >
          <ConfigFileManagerPanel
            i18n={i18n}
            width={bodyWidth - 4}
            height={panelHeight - 2}
            abconfs={abconfs}
            visibleAbconfs={visibleAbconfs}
            abconfWindowStart={abconfWindowStart}
            selectedAbconfIndex={selectedAbconfIndex}
            selectedAction={selectedConfigFileAction}
            focusedPane={configPane}
            pendingConfigDeleteId={pendingConfigDeleteId}
            saving={saving}
          />
        </Box>
      ) : (
        <Box>
          {groupWidth ? (
            <>
              <Box
                width={groupWidth}
                height={panelHeight}
                flexDirection="column"
                borderStyle="single"
                borderColor={configPane === "groups" ? "cyan" : "gray"}
                paddingX={1}
              >
                <ConfigGroupList
                  i18n={i18n}
                  width={groupWidth - 4}
                  groups={groups}
                  selectedGroupIndex={selectedGroupIndex}
                  focused={configPane === "groups"}
                />
              </Box>
              <Box width={2}>
                <Text> </Text>
              </Box>
            </>
          ) : null}
          <Box
            width={detailWidth}
            height={panelHeight}
            flexDirection="column"
            borderStyle="single"
            borderColor={configPane === "settings" ? "cyan" : "gray"}
            paddingX={1}
          >
            <ConfigSettingsPanel
              i18n={i18n}
              width={detailWidth - 4}
              configTab={configTab}
              selectedConfig={selectedConfig}
              selectedGroup={groups[selectedGroupIndex] || null}
              payload={payload}
              visibleSettings={visibleSettings}
              settingWindowStart={settingWindowStart}
              settingCount={settingCount}
              selectedConfigSettingIndex={selectedConfigSettingIndex}
              selectedSetting={selectedSetting}
              editingConfigSettingKey={editingConfigSettingKey}
              loading={loading}
            />
          </Box>
        </Box>
      )}
      <Text dimColor>
        {truncateCells(
          configFooterLine({
            i18n,
            configTab,
            configPane,
            selectedConfig,
            selectedConfigFileAction,
            selectedSetting,
            loading,
            saving,
          }),
          width,
        )}
      </Text>
    </>
  );
}

function ConfigTabs({
  i18n,
  width,
  configTab,
  configPane,
  loading,
  saving,
  abconfs,
  selectedAbconfIndex,
}: {
  i18n: I18n;
  width: number;
  configTab: ConfigTab;
  configPane: ConfigPane;
  loading: boolean;
  saving: boolean;
  abconfs: AbconfInfo[];
  selectedAbconfIndex: number;
}) {
  const tabFocused = configPane === "tabs";
  const fileButtonFocused = configPane === "fileButton";
  const fileManagerActive =
    configPane === "fileButton" || configPane === "fileDialog" || configPane === "fileActions";
  const selectedConfig = abconfs[selectedAbconfIndex] || null;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : loading
      ? i18n.t("core.status.loading", "loading")
      : "";
  return (
    <Box width={width} justifyContent="space-between">
      <Box>
        <Text
          color={configTab === "normal" && !fileManagerActive ? "cyan" : undefined}
          inverse={tabFocused && configTab === "normal"}
        >
          {` ${i18n.t("features.config.configSelection.normalConfig", "Normal Config")} `}
        </Text>
        <Text> </Text>
        <Text
          color={configTab === "system" && !fileManagerActive ? "cyan" : undefined}
          inverse={tabFocused && configTab === "system"}
        >
          {` ${i18n.t("features.config.configSelection.systemConfig", "System Config")} `}
        </Text>
        <Text> </Text>
        <Text
          color={fileButtonFocused || fileManagerActive ? "cyan" : "yellow"}
          inverse={fileButtonFocused}
        >
          {` ${i18n.t("features.config.configManagement.title", "Config")} `}
        </Text>
        <Text dimColor>
          {` ${selectedConfig?.name || selectedConfig?.id || "-"} `}
        </Text>
      </Box>
      <Text dimColor>{truncateCells(status, Math.max(1, Math.floor(width * 0.35)))}</Text>
    </Box>
  );
}

function ConfigFileManagerPanel({
  i18n,
  width,
  height,
  abconfs,
  visibleAbconfs,
  abconfWindowStart,
  selectedAbconfIndex,
  selectedAction,
  focusedPane,
  pendingConfigDeleteId,
  saving,
}: {
  i18n: I18n;
  width: number;
  height: number;
  abconfs: AbconfInfo[];
  visibleAbconfs: AbconfInfo[];
  abconfWindowStart: number;
  selectedAbconfIndex: number;
  selectedAction: ConfigFileAction;
  focusedPane: ConfigPane;
  pendingConfigDeleteId: string | null;
  saving: boolean;
}) {
  const contentWidth = Math.max(24, width);
  const fillerHeight = Math.max(0, height - visibleAbconfs.length - 5);
  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{i18n.t("features.config.configManagement.title", "Config")}</Text>
        <Text dimColor>
          {saving ? i18n.t("tui.common.saving", "saving") : abconfs.length}
        </Text>
      </Box>
      <ConfigFileActions
        i18n={i18n}
        width={contentWidth}
        selectedAction={selectedAction}
        focused={focusedPane === "fileActions"}
      />
      <Text dimColor>{configFileHeader(contentWidth, i18n)}</Text>
      {visibleAbconfs.length ? (
        visibleAbconfs.map((config, index) => {
          const configIndex = abconfWindowStart + index;
          return (
            <ConfigFileRow
              key={config.id || `${configIndex}`}
              i18n={i18n}
              width={contentWidth}
              config={config}
              isSelected={focusedPane === "fileDialog" && configIndex === selectedAbconfIndex}
              isCurrent={configIndex === selectedAbconfIndex}
              pendingDelete={pendingConfigDeleteId === config.id}
            />
          );
        })
      ) : (
        <Text dimColor>{i18n.t("tui.config.noFiles", "No config files.")}</Text>
      )}
      {Array.from({ length: fillerHeight }).map((_, index) => (
        <Text key={`config-file-filler-${index}`}> </Text>
      ))}
      <Text dimColor>
        {truncateCells(i18n.t("tui.keys.enterEsc", "Enter/Esc"), contentWidth)}
      </Text>
    </>
  );
}

function ConfigFileActions({
  i18n,
  width,
  selectedAction,
  focused,
}: {
  i18n: I18n;
  width: number;
  selectedAction: ConfigFileAction;
  focused: boolean;
}) {
  const labels = {
    new: i18n.t("tui.common.new", "new"),
    copy: i18n.t("core.actions.copy", "Copy"),
    rename: i18n.t("core.actions.rename", "Rename"),
    delete: i18n.t("core.actions.delete", "Delete"),
  } satisfies Record<ConfigFileAction, string>;
  const titleWidth = Math.max(
    1,
    width -
      FILE_ACTIONS.reduce((sum, action) => sum + terminalWidth(labels[action]) + 3, 0),
  );
  return (
    <Box width={width}>
      <Text color="gray">{padRightCells(i18n.t("features.extension.buttons.actions", "Actions"), titleWidth)}</Text>
      {FILE_ACTIONS.map((action) => (
        <React.Fragment key={action}>
          <Text
            color={action === "delete" ? "red" : action === "new" ? "green" : "yellow"}
            inverse={focused && selectedAction === action}
          >
            {` ${labels[action]} `}
          </Text>
          <Text> </Text>
        </React.Fragment>
      ))}
    </Box>
  );
}

function ConfigFileRow({
  i18n,
  width,
  config,
  isSelected,
  isCurrent,
  pendingDelete,
}: {
  i18n: I18n;
  width: number;
  config: AbconfInfo;
  isSelected: boolean;
  isCurrent: boolean;
  pendingDelete: boolean;
}) {
  const marker = `${isSelected ? ">" : " "} `;
  const idWidth = Math.max(10, Math.min(20, Math.floor(width * 0.36)));
  const nameWidth = Math.max(
    1,
    width - terminalWidth(marker) - idWidth - FILE_ACTION_WIDTH,
  );
  const isDefault = config.id === "default";
  return (
    <Box width={width}>
      <Text color={isSelected ? "cyan" : isCurrent ? "green" : undefined}>{marker}</Text>
      <Text color={isDefault ? "green" : "gray"}>
        {padRightCells(truncateCells(config.id || "-", idWidth), idWidth)}
      </Text>
      <Text color={isSelected ? "cyan" : undefined}>
        {padRightCells(truncateCells(config.name || config.id || "-", nameWidth), nameWidth)}
      </Text>
      <Text color={pendingDelete ? "yellow" : "gray"}>
        {padRightCells(pendingDelete ? i18n.t("tui.common.confirm", "confirm") : "", FILE_ACTION_WIDTH)}
      </Text>
    </Box>
  );
}

function ConfigGroupList({
  i18n,
  width,
  groups,
  selectedGroupIndex,
  focused,
}: {
  i18n: I18n;
  width: number;
  groups: AstrBotConfigSetting[];
  selectedGroupIndex: number;
  focused: boolean;
}) {
  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{i18n.t("tui.config.groups", "Groups")}</Text>
        <Text dimColor>{groups.length}</Text>
      </Box>
      {groups.map((group, index) => {
        const selected = index === selectedGroupIndex;
        const marker = selected ? ">" : " ";
        return (
          <Box key={group.id} width={width}>
            <Text color={focused && selected ? "cyan" : selected ? "green" : "gray"}>
              {marker}{" "}
            </Text>
            <Text color={selected ? "cyan" : undefined} inverse={focused && selected}>
              {padRightCells(truncateCells(group.label || group.key, Math.max(1, width - 2)), Math.max(1, width - 2))}
            </Text>
          </Box>
        );
      })}
    </>
  );
}

function ConfigSettingsPanel({
  i18n,
  width,
  configTab,
  selectedConfig,
  selectedGroup,
  payload,
  visibleSettings,
  settingWindowStart,
  settingCount,
  selectedConfigSettingIndex,
  selectedSetting,
  editingConfigSettingKey,
  loading,
}: {
  i18n: I18n;
  width: number;
  configTab: ConfigTab;
  selectedConfig: AbconfInfo | null;
  selectedGroup: AstrBotConfigSetting | null;
  payload: AstrBotConfigPayload | null;
  visibleSettings: AstrBotConfigSetting[];
  settingWindowStart: number;
  settingCount: number;
  selectedConfigSettingIndex: number;
  selectedSetting: AstrBotConfigSetting | null;
  editingConfigSettingKey: string | null;
  loading: boolean;
}) {
  const configTitle = configTab === "system"
    ? i18n.t("features.config.configSelection.systemConfig", "System Config")
    : selectedConfig?.name || selectedConfig?.id || i18n.t("features.config.configSelection.normalConfig", "Normal Config");
  const title = selectedGroup?.label || configTitle;
  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{truncateCells(title, Math.max(1, width - 14))}</Text>
        <Text dimColor>
          {loading
            ? i18n.t("core.status.loading", "loading")
            : `${settingCount ? selectedConfigSettingIndex + 1 : 0}/${settingCount}`}
        </Text>
      </Box>
      <Text dimColor>{configSettingHeader(width, i18n)}</Text>
      {payload && visibleSettings.length ? (
        visibleSettings.map((setting, index) => {
          const settingIndex = settingWindowStart + index;
          return (
            <ConfigSettingLine
              key={setting.id}
              i18n={i18n}
              setting={setting}
              width={width}
              isSelected={setting.id === selectedSetting?.id}
              isEditing={editingConfigSettingKey === setting.id}
            />
          );
        })
      ) : (
        <Text dimColor>
          {loading
            ? i18n.t("core.status.loading", "loading")
            : i18n.t("tui.config.noSettings", "No config settings.")}
        </Text>
      )}
      {selectedSetting ? (
        <ConfigSettingDetail i18n={i18n} setting={selectedSetting} width={width} />
      ) : null}
    </>
  );
}

function ConfigSettingLine({
  i18n,
  setting,
  width,
  isSelected,
  isEditing,
}: {
  i18n: I18n;
  setting: AstrBotConfigSetting;
  width: number;
  isSelected: boolean;
  isEditing: boolean;
}) {
  const marker = `${isSelected ? ">" : " "} `;
  const active = isSelected || isEditing;
  const gap = "  ";
  const typeWidth = 8;
  const keyWidth = Math.min(34, Math.max(14, Math.floor(width * 0.42)));
  const valueWidth = Math.max(
    1,
    width - terminalWidth(marker) - typeWidth - keyWidth - terminalWidth(gap) * 2,
  );
  const name = `${"  ".repeat(Math.max(0, setting.depth - 1))}${setting.label || setting.key}`;
  const type = configTypeLabel(setting, i18n);
  const value = configValueLabel(setting, i18n);
  return (
    <Box width={width}>
      <Text color={active ? "cyan" : undefined}>{marker}</Text>
      <Text color={active ? "cyan" : setting.isGroup ? "blue" : setting.isSection ? "magenta" : "gray"} inverse={active}>
        {padRightCells(truncateCells(type, typeWidth), typeWidth)}
      </Text>
      <Text inverse={active}>{gap}</Text>
      <Text color={active ? "cyan" : setting.isGroup || setting.isSection ? "white" : undefined} inverse={active}>
        {padRightCells(truncateCells(name, keyWidth), keyWidth)}
      </Text>
      <Text inverse={active}>{gap}</Text>
      <Text color={active ? "white" : setting.editable ? "yellow" : "gray"} inverse={active}>
        {padRightCells(truncateCells(value, valueWidth), valueWidth)}
      </Text>
    </Box>
  );
}

function ConfigSettingDetail({
  i18n,
  setting,
  width,
}: {
  i18n: I18n;
  setting: AstrBotConfigSetting;
  width: number;
}) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <PreviewLine
        label={i18n.t("tui.config.detail.description", "Description")}
        value={setting.label || setting.key}
        width={width}
        color="cyan"
        maxLines={2}
      />
      {setting.hint ? (
        <PreviewLine
          label={i18n.t("tui.config.detail.hint", "Hint")}
          value={setting.hint}
          width={width}
          color="gray"
          maxLines={2}
        />
      ) : null}
      <PreviewLine
        label={i18n.t("tui.config.detail.key", "Key")}
        value={setting.path.join(".") || setting.key}
        width={width}
        color="gray"
        maxLines={1}
      />
      <PreviewLine
        label={i18n.t("tui.config.detail.value", "Value")}
        value={configValueLabel(setting, i18n)}
        width={width}
        color={setting.editable ? "yellow" : "gray"}
        maxLines={2}
      />
    </Box>
  );
}

function PreviewLine({
  label,
  value,
  width,
  color,
  maxLines,
}: {
  label: string;
  value: string;
  width: number;
  color: TextColor;
  maxLines: number;
}) {
  const labelWidth = Math.min(12, Math.max(5, terminalWidth(label)));
  const gap = "  ";
  const contentWidth = Math.max(1, width - labelWidth - terminalWidth(gap));
  const lines = wrapCells(value || "-", contentWidth, maxLines);
  return (
    <>
      {lines.map((line, index) => (
        <Box key={`${label}-${index}`} width={width}>
          <Text color="gray">{padRightCells(index === 0 ? label : "", labelWidth)}</Text>
          <Text>{gap}</Text>
          <Text color={color}>{padRightCells(truncateCells(line, contentWidth), contentWidth)}</Text>
        </Box>
      ))}
    </>
  );
}

function configFileHeader(width: number, i18n: I18n): string {
  const markerWidth = 2;
  const idWidth = Math.max(10, Math.min(20, Math.floor(width * 0.36)));
  const nameWidth = Math.max(1, width - markerWidth - idWidth - FILE_ACTION_WIDTH);
  return truncateCells(
    `${padRightCells("", markerWidth)}${padRightCells("id", idWidth)}${padRightCells(i18n.t("core.common.name", "Name"), nameWidth)}${padRightCells("", FILE_ACTION_WIDTH)}`,
    width,
  );
}

function configSettingHeader(width: number, i18n: I18n): string {
  const markerWidth = 2;
  const gap = "  ";
  const typeWidth = 8;
  const keyWidth = Math.min(34, Math.max(14, Math.floor(width * 0.42)));
  const valueWidth = Math.max(
    1,
    width - markerWidth - typeWidth - keyWidth - terminalWidth(gap) * 2,
  );
  return truncateCells(
    `${padRightCells("", markerWidth)}${padRightCells(i18n.t("tui.config.table.type", "Type"), typeWidth)}${gap}${padRightCells(i18n.t("tui.config.table.field", "Field"), keyWidth)}${gap}${padRightCells(i18n.t("tui.config.table.value", "Value"), valueWidth)}`,
    width,
  );
}

function configFooterLine({
  i18n,
  configTab,
  configPane,
  selectedConfig,
  selectedConfigFileAction,
  selectedSetting,
  loading,
  saving,
}: {
  i18n: I18n;
  configTab: ConfigTab;
  configPane: ConfigPane;
  selectedConfig: AbconfInfo | null;
  selectedConfigFileAction: ConfigFileAction;
  selectedSetting: AstrBotConfigSetting | null;
  loading: boolean;
  saving: boolean;
}): string {
  if (saving) {
    return i18n.t("tui.common.saving", "saving");
  }
  if (loading) {
    return i18n.t("core.status.loading", "loading");
  }
  if (configPane === "tabs") {
    return i18n.t("tui.config.footer.tabs", "Left/Right switches Normal/System/Config. Enter opens.");
  }
  if (configPane === "fileButton") {
    return i18n.t("tui.config.footer.fileButton", "Enter opens config file manager. Left returns to System.");
  }
  if (configPane === "fileActions") {
    return i18n.t("tui.config.footer.fileActions", "{action}  Enter runs action. Down returns to files. Esc closes.", {
      action: selectedConfigFileAction,
    });
  }
  if (configPane === "fileDialog") {
    return selectedConfig
      ? i18n.t("tui.config.footer.files", "{name}  Enter loads. Right edits settings. Up opens actions. Esc closes.", {
          name: selectedConfig.name || selectedConfig.id,
        })
      : i18n.t("tui.config.noFiles", "No config files.");
  }
  if (configTab === "system" && !selectedSetting) {
    return i18n.t("tui.config.noSettings", "No config settings.");
  }
  if (!selectedSetting) {
    return i18n.t("tui.config.footer.settings", "Enter edits the selected config setting. Left returns.");
  }
  if (!selectedSetting.editable) {
    return i18n.t("tui.pluginConfig.isConfigGroup", "{name} is a config group.", {
      name: selectedSetting.label || selectedSetting.key,
    });
  }
  return i18n.t("tui.config.footer.setting", "{name}  Enter edits and saves.", {
    name: selectedSetting.label || selectedSetting.key,
  });
}

function configValueLabel(setting: AstrBotConfigSetting, i18n: I18n): string {
  const value = setting.value;
  if (setting.isGroup || setting.isSection) {
    const childCount = setting.schema?.items
      ? Object.values(setting.schema.items).filter((item) => !item.invisible).length
      : 0;
    return childCount
      ? `${childCount} ${i18n.t("tui.plugins.configValue.fields", "fields")}`
      : i18n.t("tui.plugins.configValue.section", "section");
  }
  if (setting.schema?.type === "template_list") {
    return Array.isArray(value)
      ? `${value.length} ${i18n.t("tui.plugins.configValue.entries", "entries")}`
      : `0 ${i18n.t("tui.plugins.configValue.entries", "entries")}`;
  }
  if (setting.schema?.type === "file") {
    return Array.isArray(value)
      ? `${value.length} ${i18n.t("tui.plugins.configValue.files", "files")}`
      : `0 ${i18n.t("tui.plugins.configValue.files", "files")}`;
  }
  if (setting.schema?.type === "dict" && value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length
      ? `${keys.length} ${i18n.t("tui.plugins.configValue.keys", "keys")}`
      : i18n.t("tui.plugins.configValue.empty", "empty");
  }
  if (value === null || value === undefined || value === "") {
    return i18n.t("tui.common.none", "N/A");
  }
  if (typeof value === "boolean") {
    return value ? i18n.t("tui.common.true", "true") : i18n.t("tui.common.false", "false");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function configTypeLabel(setting: AstrBotConfigSetting, i18n: I18n): string {
  if (setting.isSection) {
    return i18n.t("tui.plugins.configValue.section", "section");
  }
  if (setting.schema?._special) {
    return i18n.t("tui.plugins.configType.special", "special");
  }
  const type = String(setting.schema?.type || inferConfigType(setting.value)).toLowerCase();
  if (type === "string" || type === "text") {
    return i18n.t("tui.plugins.configType.string", "str");
  }
  if (type === "boolean" || type === "bool") {
    return i18n.t("tui.plugins.configType.bool", "bool");
  }
  if (type === "number") {
    return i18n.t("tui.plugins.configType.number", "num");
  }
  if (type === "int") {
    return i18n.t("tui.plugins.configType.int", "int");
  }
  if (type === "float") {
    return i18n.t("tui.plugins.configType.float", "float");
  }
  if (type === "list") {
    return i18n.t("tui.plugins.configType.list", "list");
  }
  if (type === "object") {
    return i18n.t("tui.plugins.configType.object", "object");
  }
  if (type === "dict") {
    return i18n.t("tui.plugins.configType.dict", "dict");
  }
  if (type === "file") {
    return i18n.t("tui.plugins.configType.file", "file");
  }
  if (type === "template_list") {
    return i18n.t("tui.plugins.configType.templateList", "tmpl");
  }
  return type || i18n.t("tui.common.value", "value");
}

function inferConfigType(value: unknown): string {
  if (Array.isArray(value)) {
    return "list";
  }
  if (value === null || value === undefined) {
    return "value";
  }
  if (typeof value === "boolean") {
    return "bool";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? "int" : "float";
  }
  if (typeof value === "object") {
    return "object";
  }
  return typeof value;
}

function wrapCells(value: string, width: number, maxLines: number): string[] {
  if (width <= 0) {
    return [""];
  }
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  const pushLine = () => {
    if (current || !lines.length) {
      lines.push(current);
    }
    current = "";
  };
  for (const word of words) {
    if (!word) {
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (terminalWidth(candidate) <= width) {
      current = candidate;
      continue;
    }
    if (current) {
      pushLine();
    }
    let segment = "";
    for (const char of word) {
      const candidateSegment = `${segment}${char}`;
      if (terminalWidth(candidateSegment) > width) {
        lines.push(segment);
        segment = char;
      } else {
        segment = candidateSegment;
      }
    }
    current = segment;
    if (lines.length >= maxLines) {
      break;
    }
  }
  if (lines.length < maxLines && current) {
    pushLine();
  }
  return lines.slice(0, Math.max(1, maxLines));
}
