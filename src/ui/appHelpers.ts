import { useEffect, useState } from "react";
import { useStdout } from "ink";
import QRCode from "qrcode";
import type { DashboardClient } from "../api/client.js";
import {
  createI18n,
  resolveConfigList,
  resolveConfigText,
  type I18n,
} from "../i18n/index.js";
import type {
  AstrBotConfigPayload,
  ChatSession,
  PlatformConfig,
  PlatformRegistrationResult,
  PluginConfigPayload,
  PluginConfigSchemaItem,
  PluginItem,
  PluginMarketItem,
  PluginMarketPayload,
  ProviderConfig,
  ProviderSourceConfig,
  ProviderTemplatePayload,
} from "../api/types.js";
import { sessionTitle } from "./format.js";
import type { PlatformAction, PlatformTemplate } from "./PlatformsView.js";
import type { PluginConfigSetting } from "./PluginsView.js";
import type { ProviderType } from "./ProvidersView.js";
import { terminalWidth, truncateCells } from "./terminal.js";
import type { DialogColor } from "./dialogControls.js";
import {
  MAIN_VIEWS,
  PLATFORM_REGISTRATION_TYPES,
  type MainView,
  type PluginConfigChoice,
  type PluginConfigChoiceDialogState,
  type PluginConfigObjectValueType,
  type PluginConfigTemplateListDialogState,
  type PluginFileDialogState,
  type PluginObjectEditorState,
  type ProviderConfigSetting,
  type ProviderSourceTemplate,
  type ProviderTemplate,
} from "./App.types.js";

export function sessionMatchesFilter(session: ChatSession, rawFilter: string): boolean {
  const filter = rawFilter.trim().toLowerCase();
  if (!filter) {
    return true;
  }
  return [
    sessionTitle(session),
    session.session_id,
    session.platform_id,
    session.creator || "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(filter);
}

export function nextMainView(current: MainView): MainView {
  const index = MAIN_VIEWS.indexOf(current);
  return MAIN_VIEWS[(index + 1) % MAIN_VIEWS.length];
}

export function viewLabel(view: MainView, i18n: I18n): string {
  if (view === "chat") {
    return i18n.t("core.navigation.chat", "Chat");
  }
  if (view === "status") {
    return i18n.t("core.common.status", "Status");
  }
  if (view === "console") {
    return i18n.t("core.navigation.console", "Console");
  }
  if (view === "commands") {
    return i18n.t("core.navigation.commands", "Commands");
  }
  if (view === "plugins") {
    return i18n.t("core.navigation.extension", "Extensions");
  }
  if (view === "agents") {
    return i18n.t("core.navigation.persona", "Persona");
  }
  if (view === "platforms") {
    return i18n.t("core.navigation.platforms", "Platforms");
  }
  return i18n.t("core.navigation.providers", "Providers");
}

export function buildPluginConfigSettings(
  payload: PluginConfigPayload | null,
  pluginName?: string,
): PluginConfigSetting[] {
  const config = asRecord(payload?.config);
  if (!config) {
    return [];
  }
  const rootSchema = pluginConfigRootSchema(payload, pluginName);
  const schemaItems = asSchemaItems(rootSchema?.items);
  if (!schemaItems) {
    return Object.entries(config).map(([key, value]) =>
      rawPluginConfigSetting(key, [key], value, 0),
    );
  }

  const settings: PluginConfigSetting[] = [];
  const seenTopLevelKeys = new Set<string>();
  for (const [key, schema] of Object.entries(schemaItems)) {
    if (schema.invisible) {
      continue;
    }
    seenTopLevelKeys.add(key);
    appendPluginConfigSetting(settings, {
      key,
      path: [key],
      value: readConfigValue(config, [key], schema.default),
      schema,
      depth: 0,
      i18n: payload?.i18n,
      rootValue: config,
    });
  }

  for (const [key, value] of Object.entries(config)) {
    if (!seenTopLevelKeys.has(key)) {
      settings.push(rawPluginConfigSetting(key, [key], value, 0));
    }
  }
  return settings;
}

export function appendPluginConfigSetting(
  settings: PluginConfigSetting[],
  item: {
    key: string;
    path: string[];
    value: unknown;
    schema: PluginConfigSchemaItem;
    depth: number;
    i18n?: Record<string, unknown>;
    rootValue: Record<string, unknown>;
  },
): void {
  if (!pluginConfigConditionMatches(item.rootValue, item.schema.condition)) {
    return;
  }
  const type = normalizedPluginConfigType(item.schema, item.value);
  const isObjectGroup = type === "object" && asSchemaItems(item.schema.items);
  const isGroup = Boolean(isObjectGroup);
  const label = pluginConfigText(
    item.i18n,
    item.path,
    "description",
    String(item.schema.description || item.schema.name || item.key),
  );
  const hint = pluginConfigText(
    item.i18n,
    item.path,
    "hint",
    String(item.schema.hint || ""),
  );

  settings.push({
    id: pluginConfigSettingId(item.path),
    key: item.key,
    path: item.path,
    label,
    value: item.value,
    schema: item.schema,
    depth: item.depth,
    editable: !isGroup && !item.schema.readonly,
    isGroup,
    hint,
  });

  if (!isObjectGroup) {
    return;
  }

  const objectValue = asRecord(item.value) || {};
  const childItems = asSchemaItems(item.schema.items) || {};
  for (const [childKey, childSchema] of Object.entries(childItems)) {
    if (childSchema.invisible) {
      continue;
    }
    appendPluginConfigSetting(settings, {
      key: childKey,
      path: [...item.path, childKey],
      value: readConfigValue(objectValue, [childKey], childSchema.default),
      schema: childSchema,
      depth: item.depth + 1,
      i18n: item.i18n,
      rootValue: item.rootValue,
    });
  }
}

export function rawPluginConfigSetting(
  key: string,
  path: string[],
  value: unknown,
  depth: number,
): PluginConfigSetting {
  const type = inferPluginConfigValueType(value);
  return {
    id: pluginConfigSettingId(path),
    key,
    path,
    label: key,
    value,
    schema: { type },
    depth,
    editable: true,
    isGroup: false,
  };
}

export function pluginConfigRootSchema(
  payload: PluginConfigPayload | null,
  pluginName?: string,
): PluginConfigSchemaItem | null {
  const metadata = payload?.metadata;
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  if (pluginName) {
    const direct = asSchemaItem(metadata[pluginName]);
    if (direct) {
      return direct;
    }
  }
  for (const value of Object.values(metadata)) {
    const schema = asSchemaItem(value);
    if (schema?.items && typeof schema.items === "object") {
      return schema;
    }
  }
  return null;
}

export function asSchemaItem(value: unknown): PluginConfigSchemaItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as PluginConfigSchemaItem;
}

export function asSchemaItems(
  value: unknown,
): Record<string, PluginConfigSchemaItem> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const result: Record<string, PluginConfigSchemaItem> = {};
  for (const [key, child] of Object.entries(value)) {
    const schema = asSchemaItem(child);
    if (schema) {
      result[key] = schema;
    }
  }
  return result;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function readConfigValue(
  config: Record<string, unknown>,
  path: string[],
  fallback?: unknown,
): unknown {
  let cursor: unknown = config;
  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
      return fallback;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor === undefined ? fallback : cursor;
}

export function pluginConfigConditionMatches(
  rootValue: Record<string, unknown>,
  condition?: Record<string, unknown>,
): boolean {
  if (!condition) {
    return true;
  }
  for (const [selector, expectedValue] of Object.entries(condition)) {
    if (!pluginChoiceValueEquals(readConfigValueBySelector(rootValue, selector), expectedValue)) {
      return false;
    }
  }
  return true;
}

export function readConfigValueBySelector(
  config: Record<string, unknown>,
  selector: string,
): unknown {
  return readConfigValue(
    config,
    selector.split(".").filter(Boolean),
  );
}

export function setConfigValueAtPath(
  config: Record<string, unknown>,
  path: string[],
  value: unknown,
): Record<string, unknown> {
  if (!path.length) {
    return config;
  }
  const [head, ...tail] = path;
  if (!tail.length) {
    return {
      ...config,
      [head]: value,
    };
  }
  const child = asRecord(config[head]) || {};
  return {
    ...config,
    [head]: setConfigValueAtPath(child, tail, value),
  };
}

export function pluginTemplateEntries(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> =>
        Boolean(entry && typeof entry === "object" && !Array.isArray(entry)),
      )
    : [];
}

export interface PluginTemplateOption {
  key: string;
  schema: PluginConfigSchemaItem;
  label: string;
  hint: string;
}

export function pluginTemplateOptions(setting: PluginConfigSetting): PluginTemplateOption[] {
  const templates = asSchemaItems(setting.schema?.templates);
  if (!templates) {
    return [];
  }
  return Object.entries(templates).map(([key, schema]) => ({
    key,
    schema,
    label: String(schema.name || schema.description || key),
    hint: String(schema.hint || schema.description || ""),
  }));
}

export function buildPluginTemplateEntry(
  templateKey: string,
  template: PluginConfigSchemaItem,
): Record<string, unknown> {
  return {
    __template_key: templateKey,
    ...buildPluginConfigDefaults(asSchemaItems(template.items) || {}),
  };
}

export function buildPluginConfigDefaults(
  items: Record<string, PluginConfigSchemaItem>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(items)) {
    if (schema.type === "object") {
      result[key] = buildPluginConfigDefaults(asSchemaItems(schema.items) || {});
    } else if (Object.prototype.hasOwnProperty.call(schema, "default")) {
      result[key] = clonePluginConfigValue(schema.default);
    } else {
      result[key] = defaultPluginConfigValue(schema.type);
    }
  }
  return result;
}

export function defaultPluginConfigValue(type?: string): unknown {
  if (type === "int") {
    return 0;
  }
  if (type === "float") {
    return 0;
  }
  if (type === "bool") {
    return false;
  }
  if (type === "list" || type === "template_list" || type === "file") {
    return [];
  }
  if (type === "object" || type === "dict") {
    return {};
  }
  return "";
}

export function clonePluginConfigValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

export function pluginTemplateEntryFields(
  templateSetting: PluginConfigSetting,
  entry: Record<string, unknown> | undefined,
  entryIndex: number,
): PluginConfigSetting[] {
  if (!entry) {
    return [];
  }
  const templateKey = String(entry.__template_key || "");
  const template = templateKey
    ? asSchemaItem(templateSetting.schema?.templates?.[templateKey])
    : null;
  const items = asSchemaItems(template?.items);
  if (!items) {
    return [];
  }
  const fields: PluginConfigSetting[] = [];
  for (const [key, schema] of Object.entries(items)) {
    if (schema.invisible) {
      continue;
    }
    if (!pluginConfigConditionMatches(entry, schema.condition)) {
      continue;
    }
    appendPluginTemplateField(fields, {
      templateKey,
      entryIndex,
      key,
      path: [key],
      value: readConfigValue(entry, [key], schema.default),
      schema,
      depth: 0,
      rootValue: entry,
    });
  }
  return fields;
}

export function appendPluginTemplateField(
  fields: PluginConfigSetting[],
  item: {
    templateKey: string;
    entryIndex: number;
    key: string;
    path: string[];
    value: unknown;
    schema: PluginConfigSchemaItem;
    depth: number;
    rootValue: Record<string, unknown>;
  },
): void {
  const type = normalizedPluginConfigType(item.schema, item.value);
  const isObjectGroup = type === "object" && asSchemaItems(item.schema.items);
  const isGroup = Boolean(isObjectGroup);
  fields.push({
    id: pluginConfigSettingId([
      "__template_list__",
      item.templateKey,
      String(item.entryIndex),
      ...item.path,
    ]),
    key: item.key,
    path: item.path,
    label: String(item.schema.description || item.schema.name || item.key),
    value: item.value,
    schema: item.schema,
    depth: item.depth,
    editable: !isGroup && !item.schema.readonly,
    isGroup,
    hint: String(item.schema.hint || ""),
  });

  if (!isObjectGroup) {
    return;
  }

  const objectValue = asRecord(item.value) || {};
  for (const [childKey, childSchema] of Object.entries(asSchemaItems(item.schema.items) || {})) {
    if (childSchema.invisible) {
      continue;
    }
    if (!pluginConfigConditionMatches(item.rootValue, childSchema.condition)) {
      continue;
    }
    appendPluginTemplateField(fields, {
      templateKey: item.templateKey,
      entryIndex: item.entryIndex,
      key: childKey,
      path: [...item.path, childKey],
      value: readConfigValue(objectValue, [childKey], childSchema.default),
      schema: childSchema,
      depth: item.depth + 1,
      rootValue: item.rootValue,
    });
  }
}

export function pluginTemplateDialogItemCount(
  dialog: PluginConfigTemplateListDialogState,
): number {
  if (dialog.mode === "templates") {
    return pluginTemplateOptions(dialog.setting).length;
  }
  if (dialog.mode === "fields") {
    const entry = pluginTemplateEntries(dialog.setting.value)[dialog.entryIndex];
    return pluginTemplateEntryFields(dialog.setting, entry, dialog.entryIndex).length + 1;
  }
  return pluginTemplateEntries(dialog.setting.value).length + 1;
}

export function pluginTemplateDialogLines(
  dialog: PluginConfigTemplateListDialogState,
  i18n: I18n,
): Array<{ label: string; description?: string; color: DialogColor }> {
  if (dialog.mode === "templates") {
    const templates = pluginTemplateOptions(dialog.setting);
    return templates.length
      ? templates.map((template) => ({
          label: template.label,
          description: template.hint,
          color: "gray" as DialogColor,
        }))
      : [{ label: i18n.t("tui.pluginConfig.noTemplatesInSchema", "No templates in schema."), color: "gray" as DialogColor }];
  }
  if (dialog.mode === "fields") {
    const entry = pluginTemplateEntries(dialog.setting.value)[dialog.entryIndex];
    const templateKey = String(entry?.__template_key || "");
    const fields = pluginTemplateEntryFields(dialog.setting, entry, dialog.entryIndex);
    return [
      { label: i18n.t("tui.pluginConfig.deleteEntry", "Delete entry"), description: templateKey, color: "red" as DialogColor },
      ...fields.map((field) => ({
        label: `${"  ".repeat(field.depth)}${field.label || field.key}`,
        description: pluginTemplateFieldValueLabel(field),
        color: field.isGroup ? "blue" as DialogColor : "gray" as DialogColor,
      })),
    ];
  }
  const entries = pluginTemplateEntries(dialog.setting.value);
  return [
    {
      label: i18n.t("core.common.templateList.addEntry", "Add entry"),
      description: i18n.t("tui.pluginConfig.templateCount", "{count} templates", {
        count: pluginTemplateOptions(dialog.setting).length,
      }),
      color: "green" as DialogColor,
    },
    ...entries.map((entry, index) => ({
      label: i18n.t("tui.pluginConfig.entryLabel", "Entry {index}", { index: index + 1 }),
      description: String(entry.__template_key || i18n.t("core.common.templateList.unknownTemplate", "unknown template")),
      color: "gray" as DialogColor,
    })),
  ];
}

export function pluginTemplateFieldValueLabel(field: PluginConfigSetting): string {
  if (field.isGroup) {
    return "section";
  }
  if (field.value === null || field.value === undefined || field.value === "") {
    return "N/A";
  }
  if (typeof field.value === "object") {
    return JSON.stringify(field.value);
  }
  return String(field.value);
}

export function pluginObjectEditorKeys(setting: PluginConfigSetting): string[] {
  const value = asRecord(setting.value);
  const templateKeys = Object.keys(pluginObjectTemplateItems(setting));
  const valueKeys = value ? Object.keys(value) : [];
  return Array.from(new Set([...templateKeys, ...valueKeys])).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function pluginObjectEditorItemCount(editor: PluginObjectEditorState): number {
  const keyCount = pluginObjectEditorKeys(editor.setting).length;
  return keyCount ? keyCount * 2 + 1 : 1;
}

export function pluginObjectEditorLines(
  editor: PluginObjectEditorState,
  i18n: I18n,
): Array<{ label: string; description?: string; color: DialogColor }> {
  const keys = pluginObjectEditorKeys(editor.setting);
  const value = asRecord(editor.setting.value) || {};
  const templateItems = pluginObjectTemplateItems(editor.setting);
  const lines: Array<{ label: string; description?: string; color: DialogColor }> = [
    {
      label: i18n.t("tui.pluginConfig.addKey", "Add key"),
      description: `type ${editor.newValueType}`,
      color: "green",
    },
  ];
  for (const key of keys) {
    const schema = templateItems[key];
    const configPath = [
      ...(editor.setting.configPath || editor.setting.path),
      "template_schema",
      key,
    ];
    const label = schema
      ? resolveConfigText(i18n, configPath, "description", schema.description || schema.name || key)
      : key;
    const type = normalizedPluginConfigType(schema, value[key]);
    lines.push({
      label: i18n.t("tui.pluginConfig.deleteKey", "Delete key"),
      description: key,
      color: "red",
    });
    lines.push({
      label,
      description: `${key}  ${type}  ${pluginObjectValueLabel(value[key])}`,
      color: schema ? "cyan" : "gray",
    });
  }
  return lines;
}

export function nextPluginObjectValueType(
  current: PluginConfigObjectValueType,
  delta: number,
): PluginConfigObjectValueType {
  const values: PluginConfigObjectValueType[] = ["string", "number", "boolean", "json"];
  const index = Math.max(0, values.indexOf(current));
  return values[(index + delta + values.length) % values.length];
}

export function parsePluginObjectEditorValue(
  rawValue: string,
  type: PluginConfigObjectValueType,
): unknown {
  const trimmed = rawValue.trim();
  if (type === "number") {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  if (type === "boolean") {
    return ["true", "1", "yes", "on", "y"].includes(trimmed.toLowerCase());
  }
  if (type === "json") {
    try {
      return JSON.parse(trimmed || "null");
    } catch {
      return rawValue;
    }
  }
  return rawValue;
}

export function pluginObjectTemplateSchema(
  setting: PluginConfigSetting,
  keyName: string,
): PluginConfigSchemaItem | undefined {
  return pluginObjectTemplateItems(setting)[keyName];
}

export function pluginObjectTemplateItems(
  setting: PluginConfigSetting,
): Record<string, PluginConfigSchemaItem> {
  return asSchemaItems(setting.schema?.template_schema) || {};
}

export function pluginObjectValueLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length ? `{${keys.join(", ")}}` : "{}";
  }
  return String(value);
}

export interface PluginFileDialogLine {
  label: string;
  description?: string;
  color: DialogColor;
  action: "add" | "remove" | "close" | "noop";
  path?: string;
}

export function pluginFileDialogItemCount(dialog: PluginFileDialogState): number {
  return Math.max(1, pluginFileDialogLines(dialog).length);
}

export function pluginFileDialogLines(dialog: PluginFileDialogState, i18n?: I18n): PluginFileDialogLine[] {
  const configuredFiles = pluginFileConfiguredFiles(dialog.setting.value);
  const configured = new Set(configuredFiles);
  const directoryFiles = Array.from(new Set(dialog.files));
  const lines: PluginFileDialogLine[] = [];
  for (const path of configuredFiles) {
    const exists = directoryFiles.includes(path);
    lines.push({
      label: i18n?.t("tui.common.remove", "Remove") ?? "Remove",
      description: `${pluginFileDisplayName(path)}${exists ? "" : `  ${i18n?.t("tui.pluginConfig.missing", "missing") ?? "missing"}`}`,
      color: exists ? "red" : "yellow",
      action: "remove",
      path,
    });
  }
  for (const path of directoryFiles) {
    if (configured.has(path)) {
      continue;
    }
    lines.push({
      label: i18n?.t("core.common.add", "Add") ?? "Add",
      description: pluginFileDisplayName(path),
      color: "green",
      action: "add",
      path,
    });
  }
  if (!lines.length) {
    lines.push({
      label: i18n?.t("tui.pluginConfig.noFilesFound", "No files found") ?? "No files found",
      description: i18n?.t("tui.pluginConfig.uploadNotWired", "Upload is not wired yet") ?? "Upload is not wired yet",
      color: "gray",
      action: "noop",
    });
  }
  lines.push({
    label: i18n?.t("core.common.close", "Close") ?? "Close",
    description: i18n?.t("tui.pluginConfig.configuredCount", "{count} configured", {
      count: configuredFiles.length,
    }) ?? `${configuredFiles.length} configured`,
    color: "cyan",
    action: "close",
  });
  return lines;
}

export function pluginFileConfiguredFiles(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
}

export function pluginFileDisplayName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export function parsePluginConfigEditableValue(
  rawValue: string,
  previousValue: unknown,
  schema?: PluginConfigSchemaItem,
): unknown {
  const type = normalizedPluginConfigType(schema, previousValue);
  const trimmed = rawValue.trim();
  if (type === "bool") {
    const normalized = trimmed.toLowerCase();
    if (["true", "1", "yes", "on", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off", "n"].includes(normalized)) {
      return false;
    }
    return previousValue;
  }
  if (type === "int") {
    const numeric = Number(trimmed);
    return Number.isInteger(numeric) ? numeric : previousValue;
  }
  if (type === "float" || type === "number") {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : previousValue;
  }
  if (
    type === "list" ||
    type === "dict" ||
    type === "object" ||
    type === "template_list" ||
    Array.isArray(previousValue) ||
    (previousValue !== null && typeof previousValue === "object")
  ) {
    try {
      return JSON.parse(trimmed || (type === "list" || type === "template_list" ? "[]" : "{}"));
    } catch {
      return previousValue;
    }
  }
  if (schema?.options?.length) {
    const option = schema.options.find((candidate) => String(candidate) === rawValue);
    return option === undefined ? rawValue : option;
  }
  return rawValue;
}

export function pluginConfigOptionChoices(setting: PluginConfigSetting): PluginConfigChoice[] {
  return pluginConfigOptionChoicesForI18n(setting, createI18n());
}

export function pluginConfigOptionChoicesForI18n(
  setting: PluginConfigSetting,
  i18n: I18n,
): PluginConfigChoice[] {
  const options = setting.schema?.options || [];
  const labels = resolveConfigList(i18n, setting.configPath || setting.path, "labels", setting.schema?.labels);
  const descriptions = Array.isArray(setting.schema?.descriptions)
    ? setting.schema.descriptions
    : [];
  return options.map((option, index) => ({
    label: String(labels[index] || option),
    value: option,
    description: descriptions[index] === undefined ? undefined : String(descriptions[index]),
  }));
}

export function pluginConfigDialogChoices(
  dialog: PluginConfigChoiceDialogState,
  i18n: I18n,
): PluginConfigChoice[] {
  if (!dialog.multi) {
    return dialog.choices;
  }
  return [
    ...dialog.choices,
    {
      label: i18n.t("tui.pluginConfig.saveSelection", "Save selection"),
      value: "__save__",
      description: i18n.t("tui.pluginConfig.selectedCount", "{count} selected", {
        count: dialog.selectedValues.length,
      }),
    },
    { label: i18n.t("tui.pluginConfig.clearSelection", "Clear selection"), value: "__clear__" },
  ];
}

export function pluginConfigSettingIsMultiChoice(setting: PluginConfigSetting): boolean {
  const special = String(setting.schema?._special || "");
  const type = normalizedPluginConfigType(setting.schema, setting.value);
  return (
    type === "list" ||
    special === "select_providers" ||
    special === "provider_pool" ||
    special === "select_knowledgebase" ||
    special === "persona_pool" ||
    special === "select_plugin_set"
  );
}

export function pluginConfigSpecialProviderType(special: string): string {
  if (special === "select_provider" || special === "select_providers" || special === "provider_pool") {
    return "chat_completion";
  }
  if (special === "select_provider_stt") {
    return "speech_to_text";
  }
  if (special === "select_provider_tts") {
    return "text_to_speech";
  }
  if (special.startsWith("select_agent_runner_provider")) {
    return "agent_runner";
  }
  return "";
}

export function pluginConfigSpecialProviderSubtype(special: string): string {
  const prefix = "select_agent_runner_provider:";
  return special.startsWith(prefix) ? special.slice(prefix.length) : "";
}

export function pluginConfigSpecialTitle(special: string, i18n: I18n): string {
  if (special.includes("provider")) {
    return i18n.t("core.shared.providerSelector.dialogTitle", "Select Provider");
  }
  if (special.includes("persona")) {
    return i18n.t("core.shared.personaSelector.dialogTitle", "Select Persona");
  }
  if (special.includes("knowledgebase")) {
    return i18n.t("core.shared.knowledgeBaseSelector.dialogTitle", "Select Knowledge Base");
  }
  if (special.includes("plugin_set")) {
    return i18n.t("core.shared.pluginSetSelector.dialogTitle", "Select Plugin Set");
  }
  return i18n.t("tui.pluginConfig.selectValue", "Select Value");
}

export function providerMatchesSubtype(provider: ProviderConfig, subtype: string): boolean {
  const normalized = subtype.toLowerCase();
  return [provider.type, provider.provider, provider.id]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .includes(normalized);
}

export async function loadPluginSpecialChoices({
  client,
  special,
  providerType,
  providerSubtype,
  fallback,
  plugins,
  i18n,
}: {
  client: DashboardClient;
  special: string;
  providerType: string;
  providerSubtype: string;
  fallback: unknown;
  plugins: PluginItem[];
  i18n: I18n;
}): Promise<PluginConfigChoice[]> {
  let choices: PluginConfigChoice[] = [];
  if (providerType) {
    const providers = await client.getProviderList(providerType);
    choices = [
      { label: i18n.t("tui.pluginConfig.clearSelection", "Clear selection"), value: "" },
      ...providers
        .filter((provider) =>
          providerSubtype
            ? providerMatchesSubtype(provider, providerSubtype)
            : true,
        )
        .map((provider) => ({
          label: String(provider.id || provider.model || "-"),
          value: String(provider.id || ""),
          description: [
            provider.type || provider.provider_type,
            provider.model,
          ].filter(Boolean).join("  "),
        })),
    ];
  } else if (special === "select_persona" || special === "persona_pool") {
    const personas = await client.getPersonas("");
    choices = [
      {
        label: i18n.t("core.shared.personaSelector.defaultPersona", "Default"),
        value: "default",
        description: i18n.t("tui.pluginConfig.builtInDefaultPersona", "Built-in default persona"),
      },
      ...personas.map((persona) => ({
        label: String(persona.persona_id || persona.name || "-"),
        value: String(persona.persona_id || ""),
        description: truncateCells(String(persona.system_prompt || ""), 60),
      })),
    ];
  } else if (special === "select_knowledgebase") {
    const payload = await client.getKnowledgeBases();
    choices = (payload.items || []).map((item) => ({
      label: String(item.name || "-"),
      value: String(item.name || ""),
      description: [
        item.description,
        item.doc_count !== undefined
          ? i18n.t("tui.pluginConfig.docsCount", "{count} docs", { count: item.doc_count })
          : "",
        item.chunk_count !== undefined
          ? i18n.t("tui.pluginConfig.chunksCount", "{count} chunks", { count: item.chunk_count })
          : "",
      ].filter(Boolean).join("  "),
    }));
  } else if (special === "select_plugin_set") {
    choices = [
      {
        label: i18n.t("tui.pluginConfig.allPlugins", "All plugins"),
        value: ["*"],
        description: i18n.t("tui.pluginConfig.allPluginsHint", "Use every available plugin"),
      },
      {
        label: i18n.t("tui.pluginConfig.noPlugins", "No plugins"),
        value: [],
        description: i18n.t("tui.pluginConfig.noPluginsHint", "Disable plugin tools for this scope"),
      },
      ...plugins
        .filter((plugin) => plugin.activated !== false && !plugin.reserved)
        .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")))
        .map((plugin) => ({
          label: String(plugin.display_name || plugin.name || "-"),
          value: String(plugin.name || ""),
          description: truncateCells(String(plugin.desc || plugin.repo || ""), 60),
        })),
    ];
  }

  return choices.length
    ? choices
    : [{
        label: i18n.t("tui.pluginConfig.noChoicesLoaded", "No choices loaded"),
        value: fallback,
        description: i18n.t("tui.pluginConfig.escToClose", "Esc to close"),
      }];
}

export function pluginChoiceSelected(values: unknown[], value: unknown): boolean {
  if (value === "__save__" || value === "__clear__") {
    return false;
  }
  return values.some((item) => pluginChoiceValueEquals(item, value));
}

export function pluginChoiceValueEquals(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function togglePluginChoiceValue(values: unknown[], value: unknown): unknown[] {
  if (pluginChoiceSelected(values, value)) {
    return values.filter((item) => !pluginChoiceValueEquals(item, value));
  }
  return [...values, value];
}

export function normalizedPluginConfigType(
  schema: PluginConfigSchemaItem | undefined,
  value: unknown,
): string {
  return String(schema?.type || inferPluginConfigValueType(value)).toLowerCase();
}

export function inferPluginConfigValueType(value: unknown): string {
  if (Array.isArray(value)) {
    return "list";
  }
  if (typeof value === "boolean") {
    return "bool";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? "int" : "float";
  }
  if (value && typeof value === "object") {
    return "object";
  }
  return "string";
}

export function pluginConfigText(
  i18n: Record<string, unknown> | undefined,
  path: string[],
  field: string,
  fallback: string,
): string {
  const configI18n = asRecord(i18n?.config);
  if (!configI18n) {
    return fallback;
  }
  let cursor: unknown = configI18n;
  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
      return fallback;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  if (cursor && typeof cursor === "object" && field in cursor) {
    const translated = (cursor as Record<string, unknown>)[field];
    if (typeof translated === "string") {
      return translated;
    }
  }
  return fallback;
}

export function pluginConfigSettingId(path: string[]): string {
  return path.join("\u0000");
}

export function marketActionLabel(plugin: PluginMarketItem, i18n: I18n): string {
  if (plugin.installed && plugin.has_update) {
    return i18n.t("features.extension.buttons.update", "Update");
  }
  if (plugin.installed) {
    return i18n.t("features.extension.card.actions.reinstall", "Reinstall");
  }
  return i18n.t("features.extension.buttons.install", "Install");
}

export function clampScrollOffset(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(max, value));
}

export function annotatePluginsWithMarket(
  plugins: PluginItem[],
  marketPlugins: PluginMarketItem[],
): PluginItem[] {
  const marketByRepo = new Map<string, PluginMarketItem>();
  const marketByName = new Map<string, PluginMarketItem>();

  for (const plugin of marketPlugins) {
    const repo = normalizePluginRepo(plugin.repo);
    if (repo) {
      marketByRepo.set(repo, plugin);
    }
    if (plugin.name) {
      marketByName.set(plugin.name, plugin);
    }
  }

  return plugins.map((plugin) => {
    const repo = normalizePluginRepo(plugin.repo);
    const repoMatch = repo ? marketByRepo.get(repo) : undefined;
    const nameMatch = marketByName.get(plugin.name);
    const matchedPlugin = repoMatch || nameMatch;
    const onlineVersion = String(
      matchedPlugin?.version ||
        plugin.online_version ||
        plugin.online_vesion ||
        "",
    );
    const hasUpdate = Boolean(
      matchedPlugin &&
        onlineVersion &&
        onlineVersion.toLowerCase() !== "unknown" &&
        String(plugin.version || "") !== onlineVersion,
    );

    return {
      ...plugin,
      online_version: onlineVersion,
      has_update: hasUpdate,
      update_download_url: String(matchedPlugin?.download_url || ""),
      update_match_source: matchedPlugin
        ? repoMatch
          ? "repo"
          : "name"
        : undefined,
    };
  });
}

export function annotateMarketPlugins(
  marketPlugins: PluginMarketItem[],
  plugins: PluginItem[],
): PluginMarketItem[] {
  const installedByRepo = new Map<string, PluginItem>();
  const installedByName = new Map<string, PluginItem>();

  for (const plugin of plugins) {
    const repo = normalizePluginRepo(plugin.repo);
    if (repo) {
      installedByRepo.set(repo, plugin);
    }
    installedByName.set(normalizePluginName(plugin.name), plugin);
  }

  return marketPlugins
    .map((plugin) => {
      const repo = normalizePluginRepo(plugin.repo);
      const matchedPlugin =
        (repo ? installedByRepo.get(repo) : undefined) ||
        installedByName.get(normalizePluginName(plugin.name));
      const marketVersion = String(plugin.version || "");
      const installedVersion = String(matchedPlugin?.version || "");
      const hasUpdate = Boolean(
        matchedPlugin &&
          marketVersion &&
          marketVersion.toLowerCase() !== "unknown" &&
          installedVersion !== marketVersion,
      );

      return {
        ...plugin,
        trimmedName: plugin.trimmedName || trimPluginMarketName(plugin.name),
        installed: Boolean(matchedPlugin),
        installed_name: matchedPlugin?.name,
        installed_version: installedVersion,
        installed_plugin: matchedPlugin,
        has_update: hasUpdate,
        support_platforms:
          plugin.support_platforms?.length
            ? plugin.support_platforms
            : matchedPlugin?.support_platforms,
        astrbot_version: plugin.astrbot_version || matchedPlugin?.astrbot_version,
      };
    })
    .sort((left, right) => {
      if (Boolean(left.installed) !== Boolean(right.installed)) {
        return left.installed ? 1 : -1;
      }
      if (Boolean(left.pinned) !== Boolean(right.pinned)) {
        return left.pinned ? -1 : 1;
      }
      return pluginMarketSortLabel(left).localeCompare(pluginMarketSortLabel(right));
    });
}

export function filterMarketPlugins(
  marketPlugins: PluginMarketItem[],
  rawFilter: string,
): PluginMarketItem[] {
  const filter = rawFilter.trim().toLowerCase();
  if (!filter) {
    return marketPlugins;
  }
  return marketPlugins.filter((plugin) =>
    [
      plugin.name,
      plugin.display_name,
      plugin.trimmedName,
      plugin.author,
      plugin.category,
      plugin.repo,
      plugin.desc,
      plugin.short_desc,
      listSearchValue(plugin.tags),
      listSearchValue(plugin.support_platforms),
    ]
      .join(" ")
      .toLowerCase()
      .includes(filter),
  );
}

export function listSearchValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(" ");
  }
  if (value === null || value === undefined || typeof value === "object") {
    return "";
  }
  return String(value);
}

export function normalizePluginMarket(payload: PluginMarketPayload): PluginMarketItem[] {
  if (Array.isArray(payload)) {
    return payload.filter(isPluginMarketItem).map((plugin) => ({
      ...plugin,
      trimmedName: plugin.trimmedName || trimPluginMarketName(plugin.name),
    }));
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const items: PluginMarketItem[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const name = String(value.name || key);
    if (!name) {
      continue;
    }
    items.push({
      ...value,
      name,
      trimmedName: value.trimmedName || trimPluginMarketName(name),
      version: String(value.version || ""),
      repo: value.repo || "",
      download_url: String(value.download_url || ""),
    });
  }
  return items;
}

export function isPluginMarketItem(value: unknown): value is PluginMarketItem {
  return Boolean(
    value &&
      typeof value === "object" &&
      "name" in value &&
      String((value as { name?: unknown }).name || ""),
  );
}

export function normalizePluginRepo(repo: unknown): string {
  return String(repo || "").trim().replace(/\/+$/, "").toLowerCase();
}

export function normalizePluginName(name: unknown): string {
  return String(name || "").trim().toLowerCase().replace(/_/g, "-");
}

export function trimPluginMarketName(name: unknown): string {
  const rawName = String(name || "").trim();
  const lowerName = rawName.toLowerCase();
  if (lowerName.startsWith("astrbot_plugin_")) {
    return rawName.slice(15);
  }
  if (lowerName.startsWith("astrbot_") || lowerName.startsWith("astrbot-")) {
    return rawName.slice(8);
  }
  return rawName;
}

export function pluginMarketSortLabel(plugin: PluginMarketItem): string {
  return String(plugin.display_name || plugin.trimmedName || plugin.name || "")
    .trim()
    .toLowerCase();
}

export function marketPluginKey(plugin: PluginMarketItem): string {
  return String(plugin.repo || plugin.name || plugin.download_url || "");
}

export function isPluginInstallWarning(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      ("warning_type" in value || "can_ignore" in value) &&
      !("name" in value),
  );
}

export function buildPlatformTemplates(payload: AstrBotConfigPayload | null): PlatformTemplate[] {
  const templates = readPlatformTemplates(payload);
  return Object.entries(templates).map(([name, config]) => ({
    name,
    config: normalizePlatformTemplate(name, config),
  }));
}

export function readPlatformTemplates(payload: AstrBotConfigPayload | null): Record<string, unknown> {
  const platformGroup = payload?.metadata?.platform_group;
  if (!platformGroup || typeof platformGroup !== "object") {
    return {};
  }
  const metadata = (platformGroup as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  const platform = (metadata as { platform?: unknown }).platform;
  if (!platform || typeof platform !== "object") {
    return {};
  }
  const template = (platform as { config_template?: unknown }).config_template;
  return template && typeof template === "object"
    ? (template as Record<string, unknown>)
    : {};
}

export function normalizePlatformTemplate(name: string, template: unknown): PlatformConfig {
  if (!template || typeof template !== "object" || Array.isArray(template)) {
    return {
      id: name,
      type: name,
      enable: true,
    };
  }
  const config = clonePlainPlatformConfig(template as PlatformConfig);
  return {
    ...config,
    id: String(config.id || name),
    type: String(config.type || name),
    enable: config.enable !== false,
  };
}

export function platformConfigFromTemplate(
  template: PlatformTemplate,
  existingPlatforms: PlatformConfig[],
): PlatformConfig {
  const config = clonePlainPlatformConfig(template.config);
  const baseId = String(config.id || config.type || slugProviderSourceTemplateName(template.name));
  return {
    ...config,
    id: nextPlatformId(existingPlatforms, baseId),
    enable: config.enable !== false,
  };
}

export function nextPlatformId(
  existingPlatforms: PlatformConfig[],
  baseId: string,
): string {
  const existingIds = new Set(existingPlatforms.map((platform) => platform.id));
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseId}-${index}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
  return `${baseId}-${Date.now()}`;
}

export function buildProviderSourceTemplates(
  payload: ProviderTemplatePayload | null,
  providerType: ProviderType,
): ProviderSourceTemplate[] {
  const rawTemplates = readProviderSourceTemplates(payload);
  return Object.entries(rawTemplates)
    .map(([name, config]) => ({
      name,
      config: normalizeProviderSourceTemplate(config),
    }))
    .filter((template) => providerSourceTypeForTemplate(template.config) === providerType);
}

export function buildProviderTemplates(
  payload: ProviderTemplatePayload | null,
  providerType: ProviderType,
): ProviderTemplate[] {
  const rawTemplates = readProviderSourceTemplates(payload);
  return Object.entries(rawTemplates)
    .map(([name, config]) => ({
      name,
      config: normalizeProviderTemplate(config),
    }))
    .filter((template) => providerTypeForTemplate(template.config) === providerType);
}

export function readProviderSourceTemplates(
  payload: ProviderTemplatePayload | null,
): Record<string, unknown> {
  const providerSchema = payload?.config_schema?.provider;
  if (!providerSchema || typeof providerSchema !== "object") {
    return {};
  }
  const template = (providerSchema as { config_template?: unknown }).config_template;
  return template && typeof template === "object"
    ? (template as Record<string, unknown>)
    : {};
}

export function normalizeProviderSourceTemplate(template: unknown): ProviderSourceConfig {
  if (!template || typeof template !== "object" || Array.isArray(template)) {
    return {
      id: "provider-source",
      provider: "openai",
      type: "openai_chat_completion",
      provider_type: "chat_completion",
      enable: true,
      key: [],
      timeout: 120,
    };
  }
  return { ...(template as ProviderSourceConfig) };
}

export function providerSourceConfigFromTemplate(
  template: ProviderSourceTemplate,
  existingSources: ProviderSourceConfig[],
): ProviderSourceConfig {
  const config = clonePlainProviderSourceConfig(template.config);
  const baseId = String(config.id || slugProviderSourceTemplateName(template.name));
  return {
    ...config,
    id: nextProviderSourceId(existingSources, baseId),
    enable: config.enable !== false,
  };
}

export function providerSourceTemplateMeta(config: ProviderSourceConfig): string {
  return truncateCells(String(config.provider || config.type || ""), 16);
}

export function providerTemplateMeta(config: ProviderConfig): string {
  return truncateCells(String(config.provider || config.type || ""), 18);
}

export function providerConfigFromTemplate(
  template: ProviderTemplate,
  existingProviders: ProviderConfig[],
): ProviderConfig {
  const config = clonePlainProviderConfig(template.config);
  const baseId = String(config.id || slugProviderSourceTemplateName(template.name));
  return {
    ...config,
    id: nextProviderId(existingProviders, baseId),
    enable: config.enable !== false,
  };
}

export function normalizeProviderTemplate(template: unknown): ProviderConfig {
  if (!template || typeof template !== "object" || Array.isArray(template)) {
    return {
      id: "provider",
      type: "provider",
      provider_type: "chat_completion",
      enable: true,
    };
  }
  return { ...(template as ProviderConfig) };
}

export function providerTypeForTemplate(provider: ProviderConfig): ProviderType {
  const rawType = String(provider.provider_type || provider.type || "");
  if (rawType.includes("agent_runner") || rawType === "dify" || rawType === "coze") {
    return "agent_runner";
  }
  if (rawType.includes("speech_to_text") || rawType.includes("stt")) {
    return "speech_to_text";
  }
  if (rawType.includes("text_to_speech") || rawType.includes("tts")) {
    return "text_to_speech";
  }
  if (rawType.includes("embedding")) {
    return "embedding";
  }
  if (rawType.includes("rerank")) {
    return "rerank";
  }
  return "chat_completion";
}

export function nextProviderId(
  existingProviders: ProviderConfig[],
  baseId: string,
): string {
  const existingIds = new Set(existingProviders.map((provider) => provider.id));
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseId}-${index}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
  return `${baseId}-${Date.now()}`;
}

export function nextProviderSourceId(
  existingSources: ProviderSourceConfig[],
  baseId: string,
): string {
  const existingIds = new Set(existingSources.map((source) => source.id));
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseId}-${index}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
  return `${baseId}-${Date.now()}`;
}

export function slugProviderSourceTemplateName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "provider-source";
}

export function providerSourceTypeForTemplate(source: ProviderSourceConfig): ProviderType {
  const rawType = String(source.provider_type || source.type || "");
  if (rawType.includes("agent_runner")) {
    return "agent_runner";
  }
  if (rawType.includes("speech_to_text") || rawType.includes("stt")) {
    return "speech_to_text";
  }
  if (rawType.includes("text_to_speech") || rawType.includes("tts")) {
    return "text_to_speech";
  }
  if (rawType.includes("embedding")) {
    return "embedding";
  }
  if (rawType.includes("rerank")) {
    return "rerank";
  }
  return "chat_completion";
}

export function providerEditableValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function parseProviderEditableValue(rawValue: string, previousValue: unknown): unknown {
  const trimmed = rawValue.trim();
  if (typeof previousValue === "number") {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : previousValue;
  }
  if (typeof previousValue === "boolean") {
    return ["true", "1", "yes", "on"].includes(trimmed.toLowerCase());
  }
  if (Array.isArray(previousValue)) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : previousValue;
    } catch {
      return previousValue;
    }
  }
  if (previousValue && typeof previousValue === "object") {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object" ? parsed : previousValue;
    } catch {
      return previousValue;
    }
  }
  return rawValue;
}

export function clonePlainProviderConfig(provider: ProviderConfig): ProviderConfig {
  return JSON.parse(JSON.stringify(provider)) as ProviderConfig;
}

export function mergeProviderConfigWithTemplate(
  provider: ProviderConfig,
  payload: ProviderTemplatePayload | null,
): ProviderConfig {
  const template = findProviderTemplateForConfig(provider, payload);
  if (!template) {
    return clonePlainProviderConfig(provider);
  }
  return mergeConfigWithOrder(provider, template);
}

export function findProviderTemplateForConfig(
  provider: ProviderConfig,
  payload: ProviderTemplatePayload | null,
): ProviderConfig | null {
  const templates = readProviderSourceTemplates(payload);
  for (const config of Object.values(templates)) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      continue;
    }
    const template = normalizeProviderTemplate(config);
    if (
      template.type === provider.type ||
      template.provider === provider.provider ||
      template.provider_type === provider.provider_type
    ) {
      return template;
    }
  }
  return null;
}

export function mergeConfigWithOrder(
  source: ProviderConfig,
  reference: ProviderConfig,
): ProviderConfig {
  const target = {} as ProviderConfig;
  mergeConfigObject(target, source, reference);
  for (const [key, value] of Object.entries(source)) {
    if (!(key in target)) {
      target[key] = clonePlainValue(value);
    }
  }
  return target;
}

export function mergeConfigObject(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  reference: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(source)) {
    target[key] = clonePlainValue(value);
  }
  for (const [key, value] of Object.entries(reference)) {
    const current = source[key];
    if (isPlainObject(value)) {
      const nextObject: Record<string, unknown> = isPlainObject(current)
        ? { ...(current as Record<string, unknown>) }
        : {};
      mergeConfigObject(
        nextObject,
        isPlainObject(current) ? (current as Record<string, unknown>) : {},
        value as Record<string, unknown>,
      );
      target[key] = nextObject;
    } else if (!(key in target)) {
      target[key] = clonePlainValue(value);
    }
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function clonePlainValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function clonePlainProviderSourceConfig(source: ProviderSourceConfig): ProviderSourceConfig {
  return JSON.parse(JSON.stringify(source)) as ProviderSourceConfig;
}

export function clonePlainPlatformConfig(platform: PlatformConfig): PlatformConfig {
  return JSON.parse(JSON.stringify(platform)) as PlatformConfig;
}

export function buildProviderConfigSettings(
  provider: ProviderConfig | null,
  payload: ProviderTemplatePayload | null,
  i18n: I18n,
): ProviderConfigSetting[] {
  if (!provider) {
    return [];
  }
  const excluded = new Set(["provider_source_id", "provider_type", "type", "provider"]);
  const preferred = [
    "id",
    "model",
    "enable",
    "max_context_tokens",
    "modalities",
    "custom_extra_body",
  ];
  const providerValue = provider as Record<string, unknown>;
  const entries = new Map(Object.entries(providerValue).filter(([key]) => !excluded.has(key)));
  const schemaItems = providerConfigSchemaItems(payload);
  const settings: ProviderConfigSetting[] = [];
  const seenTopLevelKeys = new Set<string>();
  for (const key of preferred) {
    if (!entries.has(key)) {
      continue;
    }
    const schema = schemaItems[key];
    if (schema) {
      seenTopLevelKeys.add(key);
      appendProviderConfigSetting(settings, {
        key,
        path: [key],
        configPath: ["provider_group", "provider", key],
        value: readConfigValue(providerValue, [key], schema.default),
        schema,
        depth: 0,
        rootValue: providerValue,
        i18n,
      });
    } else {
      settings.push(providerConfigSettingFromEntry(key, entries.get(key), undefined, i18n));
      seenTopLevelKeys.add(key);
    }
    entries.delete(key);
  }
  for (const [key, value] of entries) {
    if (!seenTopLevelKeys.has(key)) {
      const schema = schemaItems[key];
      if (schema) {
        appendProviderConfigSetting(settings, {
          key,
          path: [key],
          configPath: ["provider_group", "provider", key],
          value: readConfigValue(providerValue, [key], schema.default),
          schema,
          depth: 0,
          rootValue: providerValue,
          i18n,
        });
      } else {
        settings.push(providerConfigSettingFromEntry(key, value, undefined, i18n));
      }
    }
  }
  return settings;
}

export function providerConfigSchemaItems(
  payload: ProviderTemplatePayload | null,
): Record<string, PluginConfigSchemaItem> {
  const providerSchema = payload?.config_schema?.provider;
  if (!providerSchema || typeof providerSchema !== "object" || Array.isArray(providerSchema)) {
    return {};
  }
  return asSchemaItems((providerSchema as { items?: unknown }).items) || {};
}

export function providerConfigSettingFromEntry(
  key: string,
  value: unknown,
  schema?: PluginConfigSchemaItem,
  i18n?: I18n,
): ProviderConfigSetting {
  const inferredSchema = schema || { type: inferPluginConfigValueType(value) };
  const configPath = ["provider_group", "provider", key];
  const label = i18n
    ? resolveConfigText(i18n, configPath, "description", inferredSchema.description || inferredSchema.name || key)
    : String(inferredSchema.description || inferredSchema.name || key);
  const hidden = Boolean(inferredSchema.invisible);
  const schemaItems = asSchemaItems(inferredSchema.items);
  const type = normalizedPluginConfigType(inferredSchema, value);
  const isGroup = Boolean(type === "object" && schemaItems);
  return {
    id: pluginConfigSettingId([key]),
    key,
    path: [key],
    label,
    value,
    schema: inferredSchema,
    configPath,
    depth: 0,
    editable: !hidden && !isGroup && !inferredSchema.readonly,
    isGroup,
    hint: i18n
      ? resolveConfigText(i18n, configPath, "hint", inferredSchema.hint || "")
      : typeof inferredSchema.hint === "string"
        ? inferredSchema.hint
        : undefined,
  };
}

export function appendProviderConfigSetting(
  settings: ProviderConfigSetting[],
  item: {
    key: string;
    path: string[];
    configPath: string[];
    value: unknown;
    schema: PluginConfigSchemaItem;
    depth: number;
    rootValue: Record<string, unknown>;
    i18n: I18n;
  },
): void {
  if (item.schema.invisible || !pluginConfigConditionMatches(item.rootValue, item.schema.condition)) {
    return;
  }
  const type = normalizedPluginConfigType(item.schema, item.value);
  const childItems = asSchemaItems(item.schema.items);
  const isGroup = Boolean(type === "object" && childItems);
  settings.push({
    id: pluginConfigSettingId(item.path),
    key: item.key,
    path: item.path,
    configPath: item.configPath,
    label: resolveConfigText(
      item.i18n,
      item.configPath,
      "description",
      item.schema.description || item.schema.name || item.key,
    ),
    value: item.value,
    schema: item.schema,
    depth: item.depth,
    editable: !isGroup && !item.schema.readonly,
    isGroup,
    hint: resolveConfigText(item.i18n, item.configPath, "hint", item.schema.hint || ""),
  });
  if (!isGroup || !childItems) {
    return;
  }
  const objectValue = asRecord(item.value) || {};
  for (const [childKey, childSchema] of Object.entries(childItems)) {
    appendProviderConfigSetting(settings, {
      key: childKey,
      path: [...item.path, childKey],
      configPath: [...item.configPath, childKey],
      value: readConfigValue(objectValue, [childKey], childSchema.default),
      schema: childSchema,
      depth: item.depth + 1,
      rootValue: item.rootValue,
      i18n: item.i18n,
    });
  }
}

export function providerMetadataContext(metadata?: Record<string, unknown> | null): number {
  const limit = metadata?.limit;
  if (!limit || typeof limit !== "object" || !("context" in limit)) {
    return 0;
  }
  const context = (limit as { context?: unknown }).context;
  return typeof context === "number" ? context : 0;
}

export function providerModalitiesFromMetadata(
  metadata?: Record<string, unknown> | null,
): string[] {
  if (!metadata) {
    return ["text", "image", "audio", "tool_use"];
  }
  const modalities = ["text"];
  const rawModalities = metadata.modalities;
  const input =
    rawModalities && typeof rawModalities === "object" && "input" in rawModalities
      ? (rawModalities as { input?: unknown }).input
      : [];
  if (Array.isArray(input) && input.includes("image")) {
    modalities.push("image");
  }
  if (Array.isArray(input) && input.includes("audio")) {
    modalities.push("audio");
  }
  if (metadata.tool_call) {
    modalities.push("tool_use");
  }
  return modalities;
}

export function platformRegistrationQrValue(result: PlatformRegistrationResult): string {
  return String(
    result.verification_uri_complete ||
      result.qrcode_img_content ||
      result.qrcode ||
      "",
  ).trim();
}

export function applyPlatformRegistrationResult(
  platform: PlatformConfig,
  result: PlatformRegistrationResult,
): PlatformConfig {
  const next = { ...platform };
  const fieldMap: Array<[keyof PlatformRegistrationResult, string]> = [
    ["app_id", "app_id"],
    ["app_secret", "app_secret"],
    ["domain", "domain"],
    ["weixin_oc_token", "weixin_oc_token"],
    ["weixin_oc_account_id", "weixin_oc_account_id"],
    ["weixin_oc_base_url", "weixin_oc_base_url"],
    ["weixin_oc_user_id", "weixin_oc_user_id"],
    ["client_id", "client_id"],
    ["client_secret", "client_secret"],
  ];
  for (const [sourceKey, targetKey] of fieldMap) {
    const value = result[sourceKey];
    if (value !== undefined && value !== null && value !== "") {
      next[targetKey] = value;
    }
  }
  const suffix = platformRegistrationIdSuffix(next, result);
  if (suffix && !String(next.id || "").endsWith(suffix)) {
    next.id = `${next.id}${suffix}`;
  }
  return next;
}

export function platformRegistrationIdSuffix(
  platform: PlatformConfig,
  result: PlatformRegistrationResult,
): string {
  const explicitSuffix = String(result.platform_id_suffix || "")
    .trim()
    .replace(/[!:]/g, "_");
  if (explicitSuffix) {
    return explicitSuffix.startsWith("_") || explicitSuffix.startsWith("-")
      ? explicitSuffix
      : `_${explicitSuffix}`;
  }
  const type = String(platform.type || "");
  if (type === "lark" && result.bot_name) {
    const botName = String(result.bot_name).trim().replace(/[!:]/g, "_");
    return botName ? `-${botName}` : "";
  }
  return "";
}

export function isPlatformIdValid(id: string): boolean {
  return Boolean(id.trim()) && !/[!:]/.test(id);
}

export function platformWebhookBaseUrl(
  payload: AstrBotConfigPayload | null,
  serverUrl: string,
): string {
  const callbackBase =
    typeof payload?.config?.callback_api_base === "string"
      ? payload.config.callback_api_base.trim()
      : "";
  return (callbackBase || serverUrl).replace(/\/+$/, "");
}

export function registrationStatusColor(status?: string): DialogColor {
  if (status === "created") {
    return "green";
  }
  if (status === "error" || status === "denied" || status === "expired") {
    return "red";
  }
  if (status === "starting" || status === "pending" || status === "slow_down") {
    return "yellow";
  }
  return "gray";
}

export function registrationStatusLabel(status: string | undefined, i18n: I18n): string {
  if (status === "starting") {
    return i18n.t("features.platform.registrationAction.status.starting", "Starting");
  }
  if (status === "pending") {
    return i18n.t("features.platform.registrationAction.status.pending", "Waiting for Scan");
  }
  if (status === "created") {
    return i18n.t("features.platform.registrationAction.status.created", "Setup Complete - remember to click the save button!");
  }
  if (status === "denied") {
    return i18n.t("features.platform.registrationAction.status.denied", "Canceled");
  }
  if (status === "expired") {
    return i18n.t("features.platform.registrationAction.status.expired", "Expired");
  }
  if (status === "slow_down") {
    return i18n.t("features.platform.registrationAction.status.slow_down", "Polling Slowed");
  }
  if (status === "error") {
    return i18n.t("features.platform.registrationAction.status.error", "Setup Failed");
  }
  return status || i18n.t("core.status.pending", "pending");
}

export function canLoginPlatform(platform: PlatformConfig): boolean {
  return PLATFORM_REGISTRATION_TYPES.has(String(platform.type || ""));
}

export function isPlatformLoggedIn(platform: PlatformConfig): boolean {
  const type = String(platform.type || "");
  if (type === "weixin_oc") {
    return Boolean(platform.weixin_oc_token || platform.weixin_oc_account_id);
  }
  if (type === "lark") {
    return Boolean(platform.app_id && platform.app_secret);
  }
  if (type === "dingtalk") {
    return Boolean(platform.client_id && platform.client_secret);
  }
  return false;
}

export function platformActionsFor(platform: PlatformConfig | null): PlatformAction[] {
  const actions: PlatformAction[] = ["switch"];
  if (platform && canLoginPlatform(platform) && !isPlatformLoggedIn(platform)) {
    actions.push("login");
  }
  actions.push("delete");
  return actions;
}

export function qrTextLines(value: string, maxWidth: number, maxLines: number, i18n: I18n): string[] {
  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
    const size = qr.modules.size;
    const data = qr.modules.data;
    const quiet = [4, 3, 2, 1, 0].find((candidate) => {
      const totalSize = size + candidate * 2;
      return totalSize <= maxWidth && Math.ceil(totalSize / 2) <= maxLines;
    });

    if (quiet === undefined) {
      const totalSize = size + 8;
      return [truncateCells(i18n.t("tui.platforms.qrTooSmall", "QR {size}x{size}. Enlarge terminal or open: {url}", {
        size: totalSize,
        url: value,
      }), maxWidth)];
    }

    const lines: string[] = [];
    for (let y = -quiet; y < size + quiet; y += 2) {
      let line = "";
      for (let x = -quiet; x < size + quiet; x += 1) {
        const topDark = qrModule(data, size, x, y);
        const bottomDark = qrModule(data, size, x, y + 1);
        if (topDark && bottomDark) {
          line += "█";
        } else if (topDark) {
          line += "▀";
        } else if (bottomDark) {
          line += "▄";
        } else {
          line += " ";
        }
      }
      lines.push(line);
    }
    return lines;
  } catch {
    return [truncateCells(value, maxWidth)];
  }
}

export function qrModule(data: ArrayLike<boolean | number>, size: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return false;
  }
  return Boolean(data[y * size + x]);
}

export function centerCells(value: string, width: number): string {
  const valueWidth = terminalWidth(value);
  if (valueWidth >= width) {
    return truncateCells(value, width);
  }
  return `${" ".repeat(Math.floor((width - valueWidth) / 2))}${value}`;
}

export function useTerminalSize(): [number, number] {
  const { stdout } = useStdout();
  const [size, setSize] = useState<[number, number]>([
    stdout.columns || 100,
    stdout.rows || 30,
  ]);

  useEffect(() => {
    const update = () => {
      setSize([stdout.columns || 100, stdout.rows || 30]);
    };
    stdout.on("resize", update);
    update();
    return () => {
      stdout.off("resize", update);
    };
  }, [stdout]);

  return size;
}
