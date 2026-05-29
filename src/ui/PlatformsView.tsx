import React from "react";
import { Box, Text } from "ink";
import type {
  PlatformConfig,
  PlatformRuntimeStat,
} from "../api/types.js";
import { resolveConfigText, type I18n } from "../i18n/index.js";
import {
  padRightCells,
  terminalWidth,
  truncateCells,
} from "./terminal.js";

export type PlatformPane = "platforms" | "login" | "settings";
export type PlatformAction = "new" | "switch" | "login" | "delete";
type I18nParams = Parameters<I18n["t"]>[2];

export interface PlatformSetting {
  key: string;
  label: string;
  hint?: string;
  value: unknown;
  configKey?: string;
}

export interface PlatformTemplate {
  name: string;
  config: PlatformConfig;
}

export interface PlatformsViewProps {
  i18n?: I18n;
  width: number;
  platforms: PlatformConfig[];
  platformStats: Record<string, PlatformRuntimeStat>;
  visiblePlatforms: PlatformConfig[];
  platformWindowStart: number;
  selectedPlatformIndex: number;
  selectedPlatformAction: PlatformAction;
  selectedPlatformSettingIndex: number;
  platformPane: PlatformPane;
  selectedPlatform: PlatformConfig | null;
  selectedPlatformSettings: PlatformSetting[];
  editingPlatformSettingKey: string | null;
  templates: PlatformTemplate[];
  canLoginPlatform: (platform: PlatformConfig) => boolean;
  isPlatformLoggedIn: (platform: PlatformConfig) => boolean;
}

const PLATFORM_STATE_WIDTH = 6;
const PLATFORM_DELETE_WIDTH = 4;
const PLATFORM_INFO_WIDTH = 16;

function t(
  i18n: I18n | undefined,
  key: string,
  fallback: string,
  params?: I18nParams,
): string {
  return i18n
    ? i18n.t(key, fallback, params)
    : interpolateFallback(fallback, params);
}

function interpolateFallback(value: string, params?: I18nParams): string {
  if (!params) {
    return value;
  }
  return value.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
    const replacement = params[key];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

export function PlatformsView({
  i18n,
  width,
  platforms,
  platformStats,
  visiblePlatforms,
  platformWindowStart,
  selectedPlatformIndex,
  selectedPlatformAction,
  selectedPlatformSettingIndex,
  platformPane,
  selectedPlatform,
  selectedPlatformSettings,
  editingPlatformSettingKey,
  templates,
  canLoginPlatform,
  isPlatformLoggedIn,
}: PlatformsViewProps) {
  const listWidth = Math.max(52, Math.min(82, Math.floor(width * 0.52)));
  const detailWidth = Math.max(28, width - listWidth - 3);
  const selectedPosition = platforms.length
    ? `${Math.min(selectedPlatformIndex + 1, platforms.length)}/${platforms.length}`
    : "0/0";
  const meta = t(
    i18n,
    "tui.platforms.meta",
    "{adapters} adapters  {templates} templates  {position}",
    {
      adapters: platforms.length,
      templates: templates.length,
      position: selectedPosition,
    },
  );

  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{t(i18n, "features.platform.title", "Platforms")}</Text>
        <Text dimColor>{meta}</Text>
      </Box>
      <Box>
        <Box
          width={listWidth}
          flexDirection="column"
          borderStyle="single"
          borderColor={platformPane === "platforms" ? "cyan" : "gray"}
          paddingX={1}
        >
          <Box justifyContent="space-between">
            <Box>
              <Text bold>{t(i18n, "features.platform.adapters", "Adapters")}</Text>
              <Text dimColor>{` ${platforms.length}`}</Text>
            </Box>
            <Text
              color={selectedPlatformAction === "new" && platformPane === "platforms" ? "cyan" : "green"}
              inverse={selectedPlatformAction === "new" && platformPane === "platforms"}
            >
              {` ${t(i18n, "core.shared.t2iTemplateEditor.new", "new")} `}
            </Text>
          </Box>
          <Text dimColor>{platformHeader(listWidth - 4, i18n)}</Text>
          {visiblePlatforms.length ? (
            visiblePlatforms.map((platform, index) => {
              const platformIndex = platformWindowStart + index;
              const isCurrent = platformIndex === selectedPlatformIndex;
              const isSelected =
                platformPane === "platforms" &&
                selectedPlatformAction !== "new" &&
                isCurrent;
              return (
                <PlatformRow
                  key={platform.id}
                  platform={platform}
                  stat={platformStats[platform.id]}
                  width={listWidth - 4}
                  isSelected={isSelected}
                  isCurrent={isCurrent}
                  selectedAction={selectedPlatformAction}
                  i18n={i18n}
                />
              );
            })
          ) : (
            <Text dimColor>{t(i18n, "tui.platforms.empty.adapters", "No platform adapters.")}</Text>
          )}
        </Box>
        <Box width={3}>
          <Text> </Text>
        </Box>
        <Box
          width={detailWidth}
          flexDirection="column"
          borderStyle="single"
          borderColor={
            platformPane === "settings" ||
            platformPane === "login"
              ? "cyan"
              : "gray"
          }
          paddingX={1}
        >
          {selectedPlatform ? (
            <>
              <Box justifyContent="space-between">
                <Text bold>{truncateCells(selectedPlatform.id, Math.max(1, detailWidth - 18))}</Text>
                <Box>
                  <PlatformLoginBadge
                    platform={selectedPlatform}
                    canLogin={canLoginPlatform(selectedPlatform)}
                    loggedIn={isPlatformLoggedIn(selectedPlatform)}
                    selected={platformPane === "login"}
                    i18n={i18n}
                  />
                  <Text dimColor>{truncateCells(platformType(selectedPlatform, i18n), 14)}</Text>
                </Box>
              </Box>
              <Box justifyContent="space-between">
                <Text bold>{t(i18n, "core.common.settings", "Settings")}</Text>
                <Text dimColor>{selectedPlatformSettings.length}</Text>
              </Box>
              {selectedPlatformSettings.length ? (
                selectedPlatformSettings.map((setting, index) => (
                  <PlatformSettingLine
                    key={setting.key}
                    setting={setting}
                    isSelected={platformPane === "settings" && index === selectedPlatformSettingIndex}
                    isEditing={editingPlatformSettingKey === setting.key}
                    width={detailWidth - 4}
                    i18n={i18n}
                  />
                ))
              ) : (
                <Text dimColor>
                  {t(i18n, "tui.platforms.empty.settings", "No editable adapter settings.")}
                </Text>
              )}
            </>
          ) : (
            <Text dimColor>
              {t(i18n, "tui.platforms.empty.selection", "Select a platform adapter.")}
            </Text>
          )}
        </Box>
      </Box>
      <Text dimColor>
        {truncateCells(
          platformDetailLine({
            platformPane,
            selectedPlatform,
            selectedPlatformAction,
            selectedSetting: selectedPlatformSettings[selectedPlatformSettingIndex],
            editingPlatformSettingKey,
            i18n,
          }),
          width,
        )}
      </Text>
    </>
  );
}

function PlatformRow({
  platform,
  stat,
  width,
  isSelected,
  isCurrent,
  selectedAction,
  i18n,
}: {
  platform: PlatformConfig;
  stat?: PlatformRuntimeStat;
  width: number;
  isSelected: boolean;
  isCurrent: boolean;
  selectedAction: PlatformAction;
  i18n?: I18n;
}) {
  const marker = `${isSelected ? ">" : " "} `;
  const state = padRightCells(
    platform.enable === false
      ? t(i18n, "tui.common.off", "off")
      : t(i18n, "tui.common.on", "on"),
    PLATFORM_STATE_WIDTH,
  );
  const del = padRightCells(t(i18n, "tui.common.deleteShort", "X"), PLATFORM_DELETE_WIDTH);
  const switchSelected = isSelected && selectedAction === "switch";
  const deleteSelected = isSelected && selectedAction === "delete";
  const type = platformType(platform, i18n);
  const layout = platformTableLayout(width);
  const infoLabel = runtimeInfoLabel(platform, stat, i18n);
  const info = padRightCells(infoLabel, PLATFORM_INFO_WIDTH);

  return (
    <Box width={width}>
      <Text color={isSelected ? "cyan" : isCurrent ? "green" : undefined}>{marker}</Text>
      <Text color={switchSelected ? "cyan" : platform.enable === false ? "red" : "green"} inverse={switchSelected}>
        {state}
      </Text>
      <Text color={isSelected ? "cyan" : platform.enable === false ? "gray" : undefined}>
        {padRightCells(truncateCells(platform.id, layout.idWidth), layout.idWidth)}
      </Text>
      <Text color={isSelected ? "cyan" : "gray"}>
        {padRightCells(truncateCells(type, layout.typeWidth), layout.typeWidth)}
      </Text>
      <Text color={infoLabel === "-" ? "gray" : runtimeInfoColor(stat)}>
        {info}
      </Text>
      <Text color="red" inverse={deleteSelected}>
        {del}
      </Text>
    </Box>
  );
}

function PlatformLoginBadge({
  platform,
  canLogin,
  loggedIn,
  selected,
  i18n,
}: {
  platform: PlatformConfig;
  canLogin: boolean;
  loggedIn: boolean;
  selected: boolean;
  i18n?: I18n;
}) {
  const loginLabel = loggedIn
    ? t(i18n, "tui.platforms.runtime.logged", "Logged")
    : canLogin
      ? t(i18n, "features.auth.login", "Login")
      : "";

  if (!loginLabel) {
    return null;
  }
  return (
    <>
      <Text
        color={loggedIn ? "green" : "yellow"}
        inverse={selected && canLogin && !loggedIn}
      >
        {` ${loginLabel} `}
      </Text>
      <Text>  </Text>
    </>
  );
}

function PlatformSettingLine({
  setting,
  isSelected,
  isEditing,
  width,
  i18n,
}: {
  setting: PlatformSetting;
  isSelected: boolean;
  isEditing: boolean;
  width: number;
  i18n?: I18n;
}) {
  const marker = `${isSelected ? ">" : " "} `;
  const active = isSelected || isEditing;
  const gap = "  ";
  const keyWidth = Math.min(24, Math.max(14, Math.floor(width * 0.34)));
  const valueWidth = Math.max(
    1,
    width - terminalWidth(marker) - keyWidth - terminalWidth(gap),
  );
  const valueText = platformSettingValueLabel(setting.key, setting.value, valueWidth, i18n);
  return (
    <Box width={width}>
      <Text color={active ? "cyan" : undefined}>
        {marker}
      </Text>
      <Text color={active ? "cyan" : "gray"} inverse={active}>
        {padRightCells(truncateCells(setting.label || setting.key, keyWidth), keyWidth)}
      </Text>
      <Text inverse={active}>{gap}</Text>
      <Text color={active ? "white" : "yellow"} inverse={active}>
        {padRightCells(truncateCells(valueText, valueWidth), valueWidth)}
      </Text>
    </Box>
  );
}

function platformSettingValueLabel(
  key: string,
  value: unknown,
  width: number,
  i18n?: I18n,
): string {
  const label = platformConfigValueLabel(value, i18n);
  if (isSensitivePlatformKey(key)) {
    return maskLongValue(label, width, i18n);
  }
  return truncateCells(label, width);
}

function platformConfigValueLabel(value: unknown, i18n?: I18n): string {
  if (value === null || value === undefined || value === "") {
    return t(i18n, "tui.common.none", "N/A");
  }
  if (typeof value === "boolean") {
    return value
      ? t(i18n, "tui.common.true", "true")
      : t(i18n, "tui.common.false", "false");
  }
  if (Array.isArray(value)) {
    return value.map((item) => platformConfigValueLabel(item, i18n)).join(", ");
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length ? `{${keys.join(", ")}}` : "{}";
  }
  return String(value);
}

function isSensitivePlatformKey(key: string): boolean {
  return /token|secret|password|passwd|key/i.test(key);
}

function maskLongValue(value: string, width: number, i18n?: I18n): string {
  if (
    value === t(i18n, "tui.common.none", "N/A") ||
    terminalWidth(value) <= Math.min(width, 18)
  ) {
    return truncateCells(value, width);
  }
  if (width <= 8) {
    return truncateCells("****", width);
  }
  const headWidth = Math.max(2, Math.min(10, Math.floor((width - 3) * 0.45)));
  const tailWidth = Math.max(2, width - headWidth - 3);
  return `${truncateCells(value, headWidth)}...${takeTailCells(value, tailWidth)}`;
}

function takeTailCells(value: string, width: number): string {
  let result = "";
  let used = 0;
  const chars = Array.from(value);
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const char = chars[index] || "";
    const charWidth = terminalWidth(char);
    if (used + charWidth > width) {
      break;
    }
    result = `${char}${result}`;
    used += charWidth;
  }
  return result;
}

function platformHeader(width: number, i18n?: I18n): string {
  const layout = platformTableLayout(width);
  const stateHeader = padRightCells(
    `  ${t(i18n, "tui.common.stateShort", "S")}`,
    2 + PLATFORM_STATE_WIDTH,
  );
  const adapterHeader = padRightCells(
    t(i18n, "features.platform.dialog.adapter", "Adapter"),
    layout.idWidth,
  );
  const typeHeader = padRightCells(
    t(i18n, "core.common.type", "Type"),
    layout.typeWidth,
  );
  const infoHeader = padRightCells(
    t(i18n, "core.common.info", "Info"),
    PLATFORM_INFO_WIDTH,
  );
  const deleteHeader = padRightCells(
    t(i18n, "tui.common.deleteShort", "X"),
    PLATFORM_DELETE_WIDTH,
  );
  return truncateCells(
    `${stateHeader}${adapterHeader}${typeHeader}${infoHeader}${deleteHeader}`,
    width,
  );
}

function platformTableLayout(width: number): {
  idWidth: number;
  typeWidth: number;
} {
  const fixed =
    2 +
    PLATFORM_STATE_WIDTH +
    PLATFORM_INFO_WIDTH +
    PLATFORM_DELETE_WIDTH;
  const available = Math.max(10, width - fixed);
  const idWidth = Math.max(10, Math.floor(available * 0.58));
  return {
    idWidth,
    typeWidth: Math.max(1, available - idWidth),
  };
}

function platformDetailLine({
  platformPane,
  selectedPlatform,
  selectedPlatformAction,
  selectedSetting,
  editingPlatformSettingKey,
  i18n,
}: {
  platformPane: PlatformPane;
  selectedPlatform: PlatformConfig | null;
  selectedPlatformAction: PlatformAction;
  selectedSetting?: PlatformSetting;
  editingPlatformSettingKey: string | null;
  i18n?: I18n;
}): string {
  if (editingPlatformSettingKey) {
    return t(
      i18n,
      "tui.platforms.footer.editing",
      "Editing {key}. Enter saves, Esc cancels.",
        { key: selectedSetting?.label || editingPlatformSettingKey },
    );
  }
  if (platformPane === "login") {
    return t(
      i18n,
      "tui.platforms.footer.login",
      "{id}  Enter opens scan login.",
      { id: selectedPlatform?.id || "" },
    );
  }
  if (platformPane === "settings") {
    return selectedSetting
      ? t(
        i18n,
        "tui.platforms.footer.settingSelected",
        "{key}  Enter edits. Left returns to adapters.",
        { key: selectedSetting.label || selectedSetting.key },
      )
      : t(
        i18n,
        "tui.platforms.footer.settings",
        "Enter edits the selected adapter setting. Left returns to adapters.",
      );
  }
  if (selectedPlatformAction === "new") {
    return t(
      i18n,
      "tui.platforms.footer.new",
      "Enter opens adapter template selection.",
    );
  }
  if (!selectedPlatform) {
    return t(i18n, "tui.platforms.footer.selectAdapter", "Select an adapter.");
  }
  if (selectedPlatformAction === "switch") {
    return t(
      i18n,
      "tui.platforms.footer.switch",
      "{id}  Enter toggles on/off.",
      { id: selectedPlatform.id },
    );
  }
  if (selectedPlatformAction === "login") {
    return t(
      i18n,
      "tui.platforms.footer.login",
      "{id}  Enter opens scan login.",
      { id: selectedPlatform.id },
    );
  }
  return t(
    i18n,
    "tui.platforms.footer.delete",
    "{id}  Enter twice deletes.",
    { id: selectedPlatform.id },
  );
}

export function buildPlatformSettings(
  platform: PlatformConfig | null,
  i18n?: I18n,
): PlatformSetting[] {
  if (!platform) {
    return [];
  }
  const preferred = ["enable", "token", "host", "port", "ws_reverse_host", "ws_reverse_port"];
  const entries = new Map(
    Object.entries(platform).filter(([key]) => key !== "id" && key !== "type"),
  );
  const settings: PlatformSetting[] = [
    {
      key: "platform_name",
      label: t(i18n, "tui.platforms.settings.platformName", "Platform Name"),
      hint: t(i18n, "tui.platforms.settings.platformNameHint", "Unique adapter name."),
      value: platform.id,
      configKey: "id",
    },
  ];
  for (const key of preferred) {
    if (entries.has(key)) {
      settings.push(platformSettingFromEntry(key, entries.get(key), i18n));
      entries.delete(key);
    }
  }
  for (const [key, value] of entries) {
    settings.push(platformSettingFromEntry(key, value, i18n));
  }
  return settings;
}

function platformSettingFromEntry(
  key: string,
  value: unknown,
  i18n?: I18n,
): PlatformSetting {
  const path = ["platform_group", "platform", key];
  const fallback = humanizePlatformSettingKey(key);
  return {
    key,
    label: i18n ? resolveConfigText(i18n, path, "description", fallback) : fallback,
    hint: i18n ? resolveConfigText(i18n, path, "hint", "") : "",
    value,
  };
}

function humanizePlatformSettingKey(key: string): string {
  return key
    .replace(/^platform_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function platformType(platform: PlatformConfig, i18n?: I18n): string {
  return String(platform.type || t(i18n, "tui.common.unknown", "unknown"));
}

function runtimeInfoLabel(
  platform: PlatformConfig,
  stat?: PlatformRuntimeStat,
  i18n?: I18n,
): string {
  const tags: string[] = [];
  if (stat?.error_count) {
    tags.push(t(i18n, "tui.platforms.runtime.info.errors", "ERR {count}", {
      count: stat.error_count,
    }));
  }
  if (findPlatformQrPayload(stat)) {
    tags.push(t(i18n, "tui.platforms.runtime.info.qr", "QR"));
  }
  if (stat?.unified_webhook && platform.webhook_uuid) {
    tags.push(t(i18n, "tui.platforms.runtime.info.webhook", "Hook"));
  }
  return tags.length ? tags.join(" ") : "-";
}

function runtimeInfoColor(stat?: PlatformRuntimeStat): "green" | "yellow" | "red" | "cyan" | "gray" {
  if (!stat) {
    return "gray";
  }
  if (stat.error_count || stat.status === "error") {
    return "red";
  }
  if (findPlatformQrPayload(stat) || stat.status === "pending") {
    return "yellow";
  }
  if (stat.unified_webhook) {
    return "cyan";
  }
  return "green";
}

function findPlatformQrPayload(
  stat?: PlatformRuntimeStat | null,
): Record<string, unknown> | null {
  if (!stat) {
    return null;
  }
  if (stat.weixin_oc?.qrcode_img_content || stat.weixin_oc?.qrcode) {
    return stat.weixin_oc;
  }
  for (const value of Object.values(stat)) {
    if (
      value &&
      typeof value === "object" &&
      ("qrcode_img_content" in value || "qrcode" in value)
    ) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}
