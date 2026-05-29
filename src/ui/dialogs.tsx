import { Box } from "ink";
import { resolveConfigList, type I18n } from "../i18n/index.js";
import type { ProviderConfig } from "../api/types.js";
import type { AgentField } from "./AgentsView.js";
import type { PlatformSetting, PlatformTemplate } from "./PlatformsView.js";
import type { PluginConfigSetting } from "./PluginsView.js";
import {
  providerConfigValueLabel,
  type ProviderSourceSetting,
} from "./ProvidersView.js";
import { padRightCells, terminalWidth, truncateCells } from "./terminal.js";
import {
  DialogContentLine,
  DialogInputLine,
  DialogTextLine,
  DialogTextarea,
  editableTextAreaLineCount,
  wrapDialogText,
  type DialogColor,
} from "./dialogControls.js";
import {
  type PendingMarketInstallWarning,
  type ConfigFileActionDialogState,
  type PlatformRegistrationFlow,
  type PluginConfigChoiceDialogState,
  type PluginConfigTemplateListDialogState,
  type PluginFileDialogState,
  type PluginObjectEditorState,
  type PluginTemplateFieldEditState,
  type ProviderConfigSetting,
  type ProviderSourceTemplate,
  type ProviderTemplate,
} from "./App.types.js";
import {
  centerCells,
  inferPluginConfigValueType,
  pluginChoiceSelected,
  pluginChoiceValueEquals,
  pluginConfigDialogChoices,
  pluginFileDialogLines,
  pluginObjectEditorLines,
  pluginTemplateDialogLines,
  providerEditableValue,
  providerSourceTemplateMeta,
  providerTemplateMeta,
  qrTextLines,
  registrationStatusColor,
  registrationStatusLabel,
} from "./appHelpers.js";
export function MarketSearchDialog({
  columns,
  rows,
  value,
  cursor,
  resultCount,
  totalCount,
  i18n,
}: {
  columns: number;
  rows: number;
  value: string;
  cursor: number;
  resultCount: number;
  totalCount: number;
  i18n: I18n;
}) {
  const safeColumns = Math.max(8, columns);
  const maxWidth = Math.max(8, safeColumns - 2);
  const preferredWidth =
    safeColumns >= 96 ? 72 : safeColumns >= 72 ? 64 : safeColumns - 4;
  const width = Math.max(
    Math.min(28, maxWidth),
    Math.min(maxWidth, preferredWidth),
  );
  const contentWidth = Math.max(1, width - 4);
  const top = Math.max(2, Math.floor((rows - 6) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = contentWidth < 28 ? i18n.t("tui.keys.enterEsc", "Enter/Esc") : i18n.t("tui.keys.enterApplyEscClose", "Enter apply  Esc close");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(contentWidth < 24 ? i18n.t("core.actions.search", "Search") : i18n.t("tui.plugins.marketSearchTitle", "Search Market"), titleWidth)}${statusText}`;
  const resultLine = value
    ? i18n.t("tui.plugins.marketMatched", "{shown}/{total} matched", { shown: resultCount, total: totalCount })
    : i18n.t("tui.plugins.marketTotal", "{total} plugins", { total: totalCount });
  const hint = contentWidth < 36
    ? i18n.t("tui.plugins.marketSearchHintShort", "Type to filter.")
    : i18n.t("tui.plugins.marketSearchHint", "Type plugin name, author, category, tag, or repo.");

  return (
    <Box
      position="absolute"
      width={columns}
      height={6}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color="cyan" left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor="cyan"
        color="cyan"
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      <DialogContentLine
        borderColor="cyan"
        color="gray"
        left={spacer}
        right={tail}
        content={resultLine}
        width={contentWidth}
      />
      <DialogInputLine
        borderColor="cyan"
        left={spacer}
        right={tail}
        value={value}
        cursor={cursor}
        width={contentWidth}
      />
      <DialogContentLine
        borderColor="cyan"
        color="gray"
        left={spacer}
        right={tail}
        content={hint}
        width={contentWidth}
      />
      <DialogTextLine color="cyan" left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function ConfigFileActionDialog({
  columns,
  rows,
  dialog,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  dialog: ConfigFileActionDialogState;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(40, Math.min(76, columns - 8));
  const contentWidth = Math.max(20, width - 4);
  const top = Math.max(2, Math.floor((rows - 7) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.enterSaveEscCancel", "Enter save  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const title = dialog.mode === "create"
    ? i18n.t("features.config.configManagement.newConfig", "Create Config")
    : dialog.mode === "folder"
      ? i18n.t("features.persona.folder.createButton", "Create Folder")
      : dialog.mode === "copy"
      ? i18n.t("features.config.configManagement.copyConfig", "Copy Config")
      : i18n.t("features.config.configManagement.renameConfig", "Rename Config");
  const titleLine = `${padRightCells(title, titleWidth)}${statusText}`;
  const source = dialog.config
    ? `${dialog.config.name || dialog.config.id} (${dialog.config.id})`
    : i18n.t("tui.common.none", "N/A");

  return (
    <Box
      position="absolute"
      width={columns}
      height={7}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {dialog.mode === "copy" || dialog.mode === "rename" ? (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={`${i18n.t("tui.config.source", "Source")}  ${source}`}
          width={contentWidth}
        />
      ) : dialog.mode === "folder" ? (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("features.persona.folder.createDialog.title", "Create a folder in the current folder.")}
          width={contentWidth}
        />
      ) : (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("tui.config.newConfigHint", "Create from default config.")}
          width={contentWidth}
        />
      )}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={i18n.t("core.common.name", "Name")}
        width={contentWidth}
      />
      <DialogInputLine
        borderColor={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        value={dialog.name}
        cursor={dialog.cursor}
        width={contentWidth}
      />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={dialog.mode === "folder"
          ? i18n.t("features.persona.folder.form.name", "Folder name")
          : i18n.t("tui.config.nameHint", "Use a short name shown in the config list.")}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PluginInstallWarningDialog({
  columns,
  rows,
  warning,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  warning: PendingMarketInstallWarning;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(44, Math.min(86, columns - 8));
  const contentWidth = Math.max(20, width - 4);
  const top = Math.max(2, Math.floor((rows - 7) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.installing", "installing")
    : i18n.t("tui.keys.enterContinueEscCancel", "Enter continue  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.plugins.installWarningTitle", "Install Warning"), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={7}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="yellow"
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="cyan"
        left={spacer}
        right={tail}
        content={warning.pluginName}
        width={contentWidth}
      />
      {wrapDialogText(warning.message, contentWidth, 2).map((line, index) => (
        <DialogContentLine
          key={`plugin-warning-${index}`}
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={line}
          width={contentWidth}
        />
      ))}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="yellow"
        left={spacer}
        right={tail}
        content={i18n.t("tui.plugins.continueWarning", "Continue ignoring this warning?")}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PluginConfigSettingDialog({
  columns,
  rows,
  setting,
  i18n,
  value,
  cursor,
  saving,
  title,
}: {
  columns: number;
  rows: number;
  setting: PluginConfigSetting;
  i18n: I18n;
  value: string;
  cursor: number;
  saving: boolean;
  title?: string;
}) {
  const width = Math.max(36, Math.min(76, columns - 8));
  const contentWidth = Math.max(20, width - 4);
  const currentValue = providerEditableValue(setting.value);
  const options = pluginConfigOptionsLabel(setting, i18n);
  const hint = String(setting.hint || "").trim();
  const details = [
    i18n.t("tui.pluginConfig.field", "Field  {name}", {
      name: setting.path.join(".") || setting.key,
    }),
    i18n.t("tui.pluginConfig.typeLine", "Type   {type}", {
      type: pluginConfigDialogType(setting, i18n),
    }),
    options ? `${i18n.t("tui.pluginConfig.options", "Options")}  ${options}` : "",
    hint ? `${i18n.t("tui.pluginConfig.hint", "Hint")}   ${hint}` : "",
    i18n.t("tui.pluginConfig.current", "Current  {value}", {
      value: currentValue || i18n.t("tui.common.none", "N/A"),
    }),
  ].filter(Boolean);
  const height = Math.max(6, details.length + 4);
  const top = Math.max(1, Math.floor((rows - height) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.enterSaveEscCancel", "Enter save  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(title || i18n.t("tui.pluginConfig.editPluginConfig", "Edit Plugin Config"), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={height}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {details.map((line) => (
        <DialogContentLine
          key={line}
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={line}
          width={contentWidth}
        />
      ))}
      <DialogInputLine
        borderColor={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        value={value}
        cursor={cursor}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PluginConfigChoiceDialog({
  columns,
  rows,
  dialog,
  i18n,
  saving,
}: {
  columns: number;
  rows: number;
  dialog: PluginConfigChoiceDialogState;
  i18n: I18n;
  saving: boolean;
}) {
  const width = Math.max(46, Math.min(88, columns - 8));
  const contentWidth = Math.max(24, width - 4);
  const listHeight = Math.max(5, Math.min(14, rows - 7));
  const choices = pluginConfigDialogChoices(dialog, i18n);
  const selectedIndex = Math.min(dialog.selectedIndex, Math.max(0, choices.length - 1));
  const windowStart = Math.min(
    Math.max(0, choices.length - listHeight),
    Math.max(0, selectedIndex - listHeight + 1),
  );
  const visibleChoices = choices.slice(windowStart, windowStart + listHeight);
  const height = listHeight + 4;
  const top = Math.max(1, Math.floor((rows - height) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : dialog.loading
      ? i18n.t("core.status.loading", "loading")
      : dialog.multi
        ? i18n.t("tui.pluginConfig.keys.choiceMulti", "Enter toggle  Save row applies  Esc cancel")
        : i18n.t("tui.keys.enterSelectEscCancel", "Enter select  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(dialog.title, titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={height}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {dialog.loading ? (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="yellow"
          left={spacer}
          right={tail}
          content={i18n.t("tui.pluginConfig.loadingChoices", "Loading choices...")}
          width={contentWidth}
        />
      ) : visibleChoices.length ? (
        visibleChoices.map((choice, index) => {
          const choiceIndex = windowStart + index;
          const selected = choiceIndex === selectedIndex;
          const checked = dialog.multi
            ? pluginChoiceSelected(dialog.selectedValues, choice.value)
            : pluginChoiceValueEquals(choice.value, dialog.setting.value);
          const marker = selected ? "> " : "  ";
          const check = dialog.multi && !String(choice.value).startsWith("__")
            ? checked ? "[x] " : "[ ] "
            : checked ? "* " : "  ";
          const description = choice.description ? `  ${choice.description}` : "";
          const line = `${marker}${check}${choice.label}${description}`;
          return (
            <DialogContentLine
              key={`${choiceIndex}-${choice.label}`}
              borderColor={saving ? "yellow" : "cyan"}
              color={selected ? "cyan" : checked ? "green" : "gray"}
              left={spacer}
              right={tail}
              content={line}
              width={contentWidth}
              bold={selected}
            />
          );
        })
      ) : (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("tui.pluginConfig.noChoices", "No choices.")}
          width={contentWidth}
        />
      )}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={`${Math.min(selectedIndex + 1, Math.max(1, choices.length))}/${choices.length || 0}`}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PluginTemplateListDialog({
  columns,
  rows,
  dialog,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  dialog: PluginConfigTemplateListDialogState;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(52, Math.min(94, columns - 8));
  const contentWidth = Math.max(28, width - 4);
  const listHeight = Math.max(6, Math.min(16, rows - 7));
  const lines = pluginTemplateDialogLines(dialog, i18n);
  const selectedIndex = Math.min(dialog.selectedIndex, Math.max(0, lines.length - 1));
  const windowStart = Math.min(
    Math.max(0, lines.length - listHeight),
    Math.max(0, selectedIndex - listHeight + 1),
  );
  const visibleLines = lines.slice(windowStart, windowStart + listHeight);
  const height = listHeight + 4;
  const top = Math.max(1, Math.floor((rows - height) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : dialog.mode === "entries"
      ? i18n.t("tui.pluginConfig.keys.entries", "Enter open  Right open  Esc close")
      : dialog.mode === "templates"
        ? i18n.t("tui.pluginConfig.keys.templates", "Enter add  Left back  Esc close")
        : i18n.t("tui.pluginConfig.keys.fields", "Enter edit  Delete row removes  Left back");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.pluginConfig.templateList", "Template List {name}", { name: dialog.setting.label || dialog.setting.key }), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={height}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {visibleLines.length ? (
        visibleLines.map((line, index) => {
          const lineIndex = windowStart + index;
          const selected = lineIndex === selectedIndex;
          return (
            <DialogContentLine
              key={`${lineIndex}-${line.label}`}
              borderColor={saving ? "yellow" : "cyan"}
              color={selected ? "cyan" : line.color}
              left={spacer}
              right={tail}
              content={`${selected ? "> " : "  "}${line.label}${line.description ? `  ${line.description}` : ""}`}
              width={contentWidth}
              bold={selected}
            />
          );
        })
      ) : (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("tui.pluginConfig.noEntries", "No entries. Select Add entry.")}
          width={contentWidth}
        />
      )}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={`${Math.min(selectedIndex + 1, Math.max(1, lines.length))}/${lines.length || 0}`}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PluginTemplateFieldEditDialog({
  columns,
  rows,
  edit,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  edit: PluginTemplateFieldEditState;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(40, Math.min(78, columns - 8));
  const contentWidth = Math.max(22, width - 4);
  const top = Math.max(2, Math.floor((rows - 7) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.enterSaveEscCancel", "Enter save  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.pluginConfig.editTemplateField", "Edit Template Field"), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={7}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={i18n.t("tui.pluginConfig.entry", "Entry  {index}", { index: edit.entryIndex + 1 })}
        width={contentWidth}
      />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={i18n.t("tui.pluginConfig.field", "Field  {name}", { name: edit.field.path.join(".") || edit.field.key })}
        width={contentWidth}
      />
      <DialogInputLine
        borderColor={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        value={edit.value}
        cursor={edit.cursor}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PluginObjectEditorDialog({
  columns,
  rows,
  editor,
  i18n,
  saving,
}: {
  columns: number;
  rows: number;
  editor: PluginObjectEditorState;
  i18n: I18n;
  saving: boolean;
}) {
  const width = Math.max(52, Math.min(94, columns - 8));
  const contentWidth = Math.max(28, width - 4);
  const listHeight = Math.max(6, Math.min(14, rows - (editor.editingKey ? 9 : 6)));
  const lines = pluginObjectEditorLines(editor, i18n);
  const selectedIndex = Math.min(editor.selectedIndex, Math.max(0, lines.length - 1));
  const windowStart = Math.min(
    Math.max(0, lines.length - listHeight),
    Math.max(0, selectedIndex - listHeight + 1),
  );
  const visibleLines = lines.slice(windowStart, windowStart + listHeight);
  const height = listHeight + (editor.editingKey ? 7 : 4);
  const top = Math.max(1, Math.floor((rows - height) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : editor.editingKey
      ? i18n.t("tui.pluginConfig.keys.objectEdit", "Tab key/value  Enter save  Esc back")
      : i18n.t("tui.pluginConfig.keys.object", "Enter edit/add  Left/Right type  Esc close");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.pluginConfig.objectTitle", "Object {name}", {
    name: editor.setting.label || editor.setting.key,
  }), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={height}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {visibleLines.map((line, index) => {
        const lineIndex = windowStart + index;
        const selected = lineIndex === selectedIndex;
        return (
          <DialogContentLine
            key={`${lineIndex}-${line.label}`}
            borderColor={saving ? "yellow" : "cyan"}
            color={selected ? "cyan" : line.color}
            left={spacer}
            right={tail}
            content={`${selected ? "> " : "  "}${line.label}${line.description ? `  ${line.description}` : ""}`}
            width={contentWidth}
            bold={selected}
          />
        );
      })}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={`${Math.min(selectedIndex + 1, Math.max(1, lines.length))}/${lines.length || 0}`}
        width={contentWidth}
      />
      {editor.editingKey ? (
        <>
          <DialogContentLine
            borderColor={saving ? "yellow" : "cyan"}
            color="gray"
            left={spacer}
            right={tail}
            content={i18n.t("tui.pluginConfig.typeLine", "Type   {type}", {
              type: editor.newValueType,
            })}
            width={contentWidth}
          />
          <DialogInputLine
            borderColor={saving ? "yellow" : "cyan"}
            left={spacer}
            right={tail}
            value={editor.keyValue}
            cursor={editor.keyCursor}
            width={contentWidth}
          />
          <DialogInputLine
            borderColor={saving ? "yellow" : "cyan"}
            left={spacer}
            right={tail}
            value={editor.valueValue}
            cursor={editor.valueCursor}
            width={contentWidth}
          />
        </>
      ) : null}
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PluginFileDialog({
  columns,
  rows,
  dialog,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  dialog: PluginFileDialogState;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(52, Math.min(96, columns - 8));
  const contentWidth = Math.max(28, width - 4);
  const listHeight = Math.max(6, Math.min(16, rows - 7));
  const lines = pluginFileDialogLines(dialog, i18n);
  const selectedIndex = Math.min(dialog.selectedIndex, Math.max(0, lines.length - 1));
  const windowStart = Math.min(
    Math.max(0, lines.length - listHeight),
    Math.max(0, selectedIndex - listHeight + 1),
  );
  const visibleLines = lines.slice(windowStart, windowStart + listHeight);
  const height = listHeight + 4;
  const top = Math.max(1, Math.floor((rows - height) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : dialog.loading
      ? i18n.t("core.status.loading", "loading")
      : i18n.t("tui.keys.enterApplyEscClose", "Enter apply  Esc close");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.pluginConfig.filesTitle", "Files {name}", { name: dialog.setting.label || dialog.setting.key }), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={height}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {dialog.loading ? (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="yellow"
          left={spacer}
          right={tail}
          content={i18n.t("tui.pluginConfig.loadingFiles", "Loading files...")}
          width={contentWidth}
        />
      ) : visibleLines.length ? (
        visibleLines.map((line, index) => {
          const lineIndex = windowStart + index;
          const selected = lineIndex === selectedIndex;
          return (
            <DialogContentLine
              key={`${lineIndex}-${line.label}`}
              borderColor={saving ? "yellow" : "cyan"}
              color={selected ? "cyan" : line.color}
              left={spacer}
              right={tail}
              content={`${selected ? "> " : "  "}${line.label}${line.description ? `  ${line.description}` : ""}`}
              width={contentWidth}
              bold={selected}
            />
          );
        })
      ) : (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("tui.pluginConfig.noFiles", "No files.")}
          width={contentWidth}
        />
      )}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={`${Math.min(selectedIndex + 1, Math.max(1, lines.length))}/${lines.length || 0}`}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function pluginConfigDialogType(setting: PluginConfigSetting, i18n?: I18n): string {
  const baseType = String(setting.schema?.type || inferPluginConfigValueType(setting.value));
  if (setting.schema?._special) {
    return `${baseType} (${setting.schema._special})`;
  }
  if (setting.schema?.editor_mode) {
    return i18n
      ? i18n.t("tui.pluginConfig.editorType", "{type} editor", { type: baseType })
      : `${baseType} editor`;
  }
  return baseType;
}

export function pluginConfigOptionsLabel(setting: PluginConfigSetting, i18n: I18n): string {
  const options = setting.schema?.options;
  if (!Array.isArray(options) || !options.length) {
    return "";
  }
  const labels = resolveConfigList(i18n, setting.configPath || setting.path, "labels", setting.schema?.labels);
  return options
    .map((option, index) => String(labels[index] || option))
    .join(", ");
}

export function ProviderSourceCreateDialog({
  columns,
  rows,
  templates,
  selectedIndex,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  templates: ProviderSourceTemplate[];
  selectedIndex: number;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(44, Math.min(72, columns - 8));
  const contentWidth = Math.max(20, width - 4);
  const listHeight = Math.max(5, Math.min(16, rows - 8));
  const windowStart = Math.min(
    Math.max(0, templates.length - listHeight),
    Math.max(0, selectedIndex - listHeight + 1),
  );
  const visibleTemplates = templates.slice(windowStart, windowStart + listHeight);
  const top = Math.max(1, Math.floor((rows - (listHeight + 4)) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.enterSelectEscCancel", "Enter select  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.providers.selectTemplate", "Select Template"), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={listHeight + 4}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {visibleTemplates.length ? (
        visibleTemplates.map((template, index) => {
          const templateIndex = windowStart + index;
          const selected = templateIndex === selectedIndex;
          const marker = selected ? "> " : "  ";
          const meta = providerSourceTemplateMeta(template.config);
          const nameWidth = Math.max(
            1,
            contentWidth - terminalWidth(marker) - terminalWidth(meta),
          );
          return (
            <DialogContentLine
              key={`${template.name}-${templateIndex}`}
              borderColor={saving ? "yellow" : "cyan"}
              color={selected ? "cyan" : "gray"}
              left={spacer}
              right={tail}
              content={`${marker}${padRightCells(truncateCells(template.name, nameWidth), nameWidth)}${meta}`}
              width={contentWidth}
              bold={selected}
            />
          );
        })
      ) : (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("tui.providers.noTemplates", "No templates available.")}
          width={contentWidth}
        />
      )}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={`${Math.min(selectedIndex + 1, Math.max(1, templates.length))}/${templates.length || 0}`}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function ProviderCreateDialog({
  columns,
  rows,
  templates,
  selectedIndex,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  templates: ProviderTemplate[];
  selectedIndex: number;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(44, Math.min(78, columns - 8));
  const contentWidth = Math.max(20, width - 4);
  const listHeight = Math.max(5, Math.min(16, rows - 8));
  const windowStart = Math.min(
    Math.max(0, templates.length - listHeight),
    Math.max(0, selectedIndex - listHeight + 1),
  );
  const visibleTemplates = templates.slice(windowStart, windowStart + listHeight);
  const top = Math.max(1, Math.floor((rows - (listHeight + 4)) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.enterSelectEscCancel", "Enter select  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.providers.selectProvider", "Select Provider"), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={listHeight + 4}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {visibleTemplates.length ? (
        visibleTemplates.map((template, index) => {
          const templateIndex = windowStart + index;
          const selected = templateIndex === selectedIndex;
          const marker = selected ? "> " : "  ";
          const meta = providerTemplateMeta(template.config);
          const nameWidth = Math.max(
            1,
            contentWidth - terminalWidth(marker) - terminalWidth(meta),
          );
          return (
            <DialogContentLine
              key={`${template.name}-${templateIndex}`}
              borderColor={saving ? "yellow" : "cyan"}
              color={selected ? "cyan" : "gray"}
              left={spacer}
              right={tail}
              content={`${marker}${padRightCells(truncateCells(template.name, nameWidth), nameWidth)}${meta}`}
              width={contentWidth}
              bold={selected}
            />
          );
        })
      ) : (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("tui.providers.noTemplates", "No templates available.")}
          width={contentWidth}
        />
      )}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={`${Math.min(selectedIndex + 1, Math.max(1, templates.length))}/${templates.length || 0}`}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PlatformTemplateDialog({
  columns,
  rows,
  templates,
  selectedIndex,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  templates: PlatformTemplate[];
  selectedIndex: number;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(44, Math.min(72, columns - 8));
  const contentWidth = Math.max(20, width - 4);
  const listHeight = Math.max(5, Math.min(16, rows - 8));
  const windowStart = Math.min(
    Math.max(0, templates.length - listHeight),
    Math.max(0, selectedIndex - listHeight + 1),
  );
  const visibleTemplates = templates.slice(windowStart, windowStart + listHeight);
  const top = Math.max(1, Math.floor((rows - (listHeight + 4)) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.enterSelectEscCancel", "Enter select  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.platforms.selectPlatform", "Select Platform"), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={listHeight + 4}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {visibleTemplates.length ? (
        visibleTemplates.map((template, index) => {
          const templateIndex = windowStart + index;
          const selected = templateIndex === selectedIndex;
          const marker = selected ? "> " : "  ";
          const meta = truncateCells(String(template.config.type || ""), 16);
          const nameWidth = Math.max(
            1,
            contentWidth - terminalWidth(marker) - terminalWidth(meta),
          );
          return (
            <DialogContentLine
              key={`${template.name}-${templateIndex}`}
              borderColor={saving ? "yellow" : "cyan"}
              color={selected ? "cyan" : "gray"}
              left={spacer}
              right={tail}
              content={`${marker}${padRightCells(truncateCells(template.name, nameWidth), nameWidth)}${meta}`}
              width={contentWidth}
              bold={selected}
            />
          );
        })
      ) : (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("features.platform.dialog.noTemplates", "No templates available")}
          width={contentWidth}
        />
      )}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={`${Math.min(selectedIndex + 1, Math.max(1, templates.length))}/${templates.length || 0}`}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PlatformLoginDialog({
  columns,
  rows,
  registration,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  registration: PlatformRegistrationFlow;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(58, Math.min(96, columns - 8));
  const contentWidth = Math.max(20, width - 4);
  const hasCodeLine = Boolean(registration.userCode || registration.verificationUri);
  const maxDialogHeight = Math.max(8, rows - 2);
  const maxQrLines = Math.max(1, maxDialogHeight - 5 - (hasCodeLine ? 1 : 0));
  const qrLines = registration.qrValue
    ? qrTextLines(registration.qrValue, contentWidth, maxQrLines, i18n)
    : [];
  const visibleQrLines = qrLines.slice(0, maxQrLines);
  const dialogHeight = Math.min(
    maxDialogHeight,
    5 + (hasCodeLine ? 1 : 0) + Math.max(1, visibleQrLines.length),
  );
  const top = Math.max(1, Math.floor((rows - dialogHeight) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.escClose", "Esc close");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.platforms.scanLogin", "Scan Login {id}", { id: registration.platformId || registration.config.id }), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={dialogHeight}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={registrationStatusColor(registration.status)}
        left={spacer}
        right={tail}
        content={`${i18n.t("core.common.status", "Status")}  ${registrationStatusLabel(registration.status, i18n)}`}
        width={contentWidth}
      />
      {hasCodeLine ? (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={[
            registration.userCode
              ? i18n.t("tui.platforms.verificationCode", "Code {code}", { code: registration.userCode })
              : "",
            registration.verificationUri ? registration.verificationUri : "",
          ].filter(Boolean).join("  ")}
          width={contentWidth}
        />
      ) : null}
      {visibleQrLines.length ? (
        visibleQrLines.map((line, index) => (
          <DialogContentLine
            key={`qr-${index}`}
            borderColor={saving ? "yellow" : "cyan"}
            color="black"
            backgroundColor="white"
            left={spacer}
            right={tail}
            content={centerCells(line, contentWidth)}
            width={contentWidth}
          />
        ))
      ) : (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("tui.platforms.waitingQr", "Waiting for QR or login link...")}
          width={contentWidth}
        />
      )}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={registration.status === "created" ? "green" : "gray"}
        left={spacer}
        right={tail}
        content={
          registration.message ||
          (registration.status === "created"
            ? i18n.t("tui.platforms.loginCreated", "Login created. Updating adapter config...")
            : i18n.t("tui.platforms.scanWait", "Scan in the browser/app, then wait for created."))
        }
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function ProviderSourceSettingDialog({
  columns,
  rows,
  setting,
  value,
  cursor,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  setting: ProviderSourceSetting;
  value: string;
  cursor: number;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(36, Math.min(76, columns - 8));
  const contentWidth = Math.max(20, width - 4);
  const currentValue = providerEditableValue(setting.value);
  const top = Math.max(2, Math.floor((rows - 6) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.enterSaveEscCancel", "Enter save  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.providers.editSourceSetting", "Edit Source Setting"), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={6}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={i18n.t("tui.pluginConfig.field", "Field  {name}", { name: setting.key })}
        width={contentWidth}
      />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={i18n.t("tui.pluginConfig.current", "Current  {value}", { value: currentValue || i18n.t("tui.common.none", "N/A") })}
        width={contentWidth}
      />
      <DialogInputLine
        borderColor={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        value={value}
        cursor={cursor}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function PlatformSettingDialog({
  columns,
  rows,
  setting,
  value,
  cursor,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  setting: PlatformSetting;
  value: string;
  cursor: number;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(36, Math.min(76, columns - 8));
  const contentWidth = Math.max(20, width - 4);
  const currentValue = providerEditableValue(setting.value);
  const top = Math.max(2, Math.floor((rows - 6) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.enterSaveEscCancel", "Enter save  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.platforms.editPlatformSetting", "Edit Platform Setting"), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={6}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={i18n.t("tui.pluginConfig.field", "Field  {name}", { name: setting.label || setting.key })}
        width={contentWidth}
      />
      {setting.hint ? (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={`${i18n.t("tui.pluginConfig.hint", "Hint")}  ${setting.hint}`}
          width={contentWidth}
        />
      ) : null}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={i18n.t("tui.pluginConfig.current", "Current  {value}", { value: currentValue || i18n.t("tui.common.none", "N/A") })}
        width={contentWidth}
      />
      <DialogInputLine
        borderColor={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        value={value}
        cursor={cursor}
        width={contentWidth}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function AgentFieldDialog({
  columns,
  rows,
  field,
  value,
  cursor,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  field: AgentField;
  value: string;
  cursor: number;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(40, Math.min(112, columns - 4));
  const contentWidth = Math.max(20, width - 4);
  const inputTextWidth = Math.max(1, contentWidth - terminalWidth("> "));
  const wrappedInputLines = editableTextAreaLineCount(value, cursor, inputTextWidth);
  const baseHeight = 5 + (field.hint ? 1 : 0);
  const maxDialogHeight = Math.max(baseHeight + 1, rows - 2);
  const maxInputLines = Math.max(1, maxDialogHeight - baseHeight);
  const inputLineCount = Math.min(maxInputLines, Math.max(3, wrappedInputLines));
  const dialogHeight = baseHeight + inputLineCount;
  const top = Math.max(1, Math.floor((rows - dialogHeight) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : i18n.t("tui.keys.enterSaveEscCancel", "Enter save  Esc cancel");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("features.persona.dialog.edit.title", "Edit Persona"), titleWidth)}${statusText}`;

  return (
    <Box
      position="absolute"
      width={columns}
      height={dialogHeight}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={i18n.t("tui.pluginConfig.field", "Field  {name}", { name: field.label })}
        width={contentWidth}
      />
      {field.hint ? (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={`${i18n.t("tui.pluginConfig.hint", "Hint")}  ${field.hint}`}
          width={contentWidth}
        />
      ) : null}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={i18n.t("tui.common.value", "value")}
        width={contentWidth}
      />
      <DialogTextarea
        borderColor={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        value={value}
        cursor={cursor}
        width={contentWidth}
        lineCount={inputLineCount}
      />
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}

export function ProviderConfigDialog({
  columns,
  rows,
  provider,
  settings,
  selectedIndex,
  editingKey,
  editValue,
  editCursor,
  saving,
  i18n,
}: {
  columns: number;
  rows: number;
  provider: ProviderConfig;
  settings: ProviderConfigSetting[];
  selectedIndex: number;
  editingKey: string | null;
  editValue: string;
  editCursor: number;
  saving: boolean;
  i18n: I18n;
}) {
  const width = Math.max(54, Math.min(92, columns - 8));
  const contentWidth = Math.max(24, width - 4);
  const listHeight = Math.max(6, Math.min(14, rows - (editingKey ? 9 : 7)));
  const windowStart = Math.min(
    Math.max(0, settings.length - listHeight),
    Math.max(0, selectedIndex - listHeight + 1),
  );
  const visibleSettings = settings.slice(windowStart, windowStart + listHeight);
  const dialogHeight = listHeight + (editingKey ? 6 : 4);
  const top = Math.max(1, Math.floor((rows - dialogHeight) / 2));
  const leftPad = Math.max(0, Math.floor((columns - width) / 2));
  const rightPad = Math.max(0, columns - width - leftPad);
  const spacer = " ".repeat(leftPad);
  const tail = " ".repeat(rightPad);
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  const status = saving
    ? i18n.t("tui.common.saving", "saving")
    : editingKey
      ? i18n.t("tui.providers.enterSaveFieldEscBack", "Enter save field  Esc back")
      : i18n.t("tui.providers.enterEditFieldEscClose", "Enter edit field  Esc close");
  const statusText = truncateCells(status, Math.max(1, Math.floor(contentWidth / 2)));
  const titleWidth = Math.max(1, contentWidth - terminalWidth(statusText));
  const titleLine = `${padRightCells(i18n.t("tui.providers.providerConfig", "Provider Config {id}", { id: provider.id }), titleWidth)}${statusText}`;
  const keyWidth = Math.max(12, Math.min(24, Math.floor(contentWidth * 0.32)));

  return (
    <Box
      position="absolute"
      width={columns}
      height={dialogHeight}
      marginTop={top}
      flexDirection="column"
    >
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color={saving ? "yellow" : "cyan"}
        left={spacer}
        right={tail}
        content={titleLine}
        width={contentWidth}
        bold
      />
      {visibleSettings.length ? (
        visibleSettings.map((setting, index) => {
          const settingIndex = windowStart + index;
          const selected = settingIndex === selectedIndex;
          const marker = selected ? "> " : "  ";
          const label = setting.depth > 0
            ? `${"  ".repeat(setting.depth)}${setting.label || setting.key}`
            : setting.label || setting.key;
          const typeLabel = pluginConfigDialogType(setting, i18n);
          const keyText = padRightCells(truncateCells(label, keyWidth), keyWidth);
          const valueWidth = Math.max(1, contentWidth - terminalWidth(marker) - keyWidth);
          const valueText = [
            providerConfigValueLabel(setting.value),
            typeLabel ? `(${typeLabel})` : "",
          ].filter(Boolean).join(" ");
          return (
            <DialogContentLine
              key={setting.key}
              borderColor={saving ? "yellow" : "cyan"}
              color={selected ? "cyan" : setting.editable ? "gray" : "yellow"}
              left={spacer}
              right={tail}
              content={`${marker}${keyText}${truncateCells(valueText, valueWidth)}`}
              width={contentWidth}
              bold={selected}
            />
          );
        })
      ) : (
        <DialogContentLine
          borderColor={saving ? "yellow" : "cyan"}
          color="gray"
          left={spacer}
          right={tail}
          content={i18n.t("tui.providers.noEditableModelSettings", "No editable model settings.")}
          width={contentWidth}
        />
      )}
      <DialogContentLine
        borderColor={saving ? "yellow" : "cyan"}
        color="gray"
        left={spacer}
        right={tail}
        content={`${Math.min(selectedIndex + 1, Math.max(1, settings.length))}/${settings.length || 0}`}
        width={contentWidth}
      />
      {editingKey ? (
        <>
          <DialogContentLine
            borderColor={saving ? "yellow" : "cyan"}
            color="gray"
            left={spacer}
            right={tail}
            content={`${i18n.t("core.common.edit", "Edit")}  ${visibleSettings.find((setting) => setting.id === editingKey)?.label || editingKey}`}
            width={contentWidth}
          />
          <DialogInputLine
            borderColor={saving ? "yellow" : "cyan"}
            left={spacer}
            right={tail}
            value={editValue}
            cursor={editCursor}
            width={contentWidth}
          />
        </>
      ) : null}
      <DialogTextLine color={saving ? "yellow" : "cyan"} left={spacer} right={tail} text={border} />
    </Box>
  );
}
