import React from "react";
import { Box, Text } from "ink";
import type {
  PluginComponent,
  PluginConfigSchemaItem,
  PluginDetail,
  PluginItem,
  PluginMarketItem,
} from "../api/types.js";
import type { I18n } from "../i18n/index.js";
import {
  padRightCells,
  terminalWidth,
  truncateCells,
} from "./terminal.js";

export type PluginTab = "installed" | "market";
export type PluginPane = "tabs" | "list" | "actions" | "components" | "config" | "marketSearch" | "market" | "marketActions";
export type PluginAction = "switch" | "delete";
export type PluginDetailAction = "reload" | "update";
export interface PluginConfigSetting {
  id: string;
  key: string;
  path: string[];
  label: string;
  value: unknown;
  schema?: PluginConfigSchemaItem;
  configPath?: string[];
  depth: number;
  editable: boolean;
  isGroup: boolean;
  hint?: string;
}

type TextColor = "cyan" | "green" | "yellow" | "red" | "magenta" | "blue" | "gray";
interface PluginDetailRenderLine {
  label: string;
  value: string;
  color: TextColor;
  bold?: boolean;
  dim?: boolean;
  href?: string;
}

const PLUGIN_STATE_WIDTH = 7;
const PLUGIN_DELETE_WIDTH = 4;
const MARKET_STATUS_WIDTH = 11;
const MARKET_VERSION_WIDTH = 14;
const MARKET_ACTION_WIDTH = 13;

const FALLBACK_I18N: I18n = {
  locale: "en-US",
  t: (key, fallback = key) => fallback,
  raw: () => undefined,
  translateIfKey: (value, fallback = "") =>
    typeof value === "string" && value ? value : fallback,
};

export interface PluginsViewProps {
  i18n?: I18n;
  width: number;
  height: number;
  pluginTab: PluginTab;
  plugins: PluginItem[];
  visiblePlugins: PluginItem[];
  pluginWindowStart: number;
  selectedPluginIndex: number;
  selectedPluginAction: PluginAction;
  selectedPluginDetailAction: PluginDetailAction;
  pluginPane: PluginPane;
  selectedPlugin: PluginItem | null;
  selectedPluginDetail: PluginDetail | null;
  selectedPluginComponentIndex: number;
  visiblePluginComponents: PluginComponent[];
  pluginComponentWindowStart: number;
  selectedPluginConfigSettingIndex: number;
  visiblePluginConfigSettings: PluginConfigSetting[];
  pluginConfigWindowStart: number;
  pluginConfigSettingCount: number;
  loadingPluginConfigName: string | null;
  editingPluginConfigSettingKey: string | null;
  marketPlugins: PluginMarketItem[];
  marketTotalCount: number;
  marketFilter: string;
  isEditingMarketFilter: boolean;
  visibleMarketPlugins: PluginMarketItem[];
  marketPluginWindowStart: number;
  selectedMarketPluginIndex: number;
  selectedMarketPlugin: PluginMarketItem | null;
  marketDetailScrollOffset: number;
  marketDetailViewportHeight: number;
  loadingPluginDetailName: string | null;
  pendingPluginDeleteName: string | null;
  workingPluginName: string | null;
  workingMarketPluginName: string | null;
}

export function PluginsView({
  i18n = FALLBACK_I18N,
  width,
  height,
  pluginTab,
  plugins,
  visiblePlugins,
  pluginWindowStart,
  selectedPluginIndex,
  selectedPluginAction,
  selectedPluginDetailAction,
  pluginPane,
  selectedPlugin,
  selectedPluginDetail,
  selectedPluginComponentIndex,
  visiblePluginComponents,
  pluginComponentWindowStart,
  selectedPluginConfigSettingIndex,
  visiblePluginConfigSettings,
  pluginConfigWindowStart,
  pluginConfigSettingCount,
  loadingPluginConfigName,
  editingPluginConfigSettingKey,
  marketPlugins,
  marketTotalCount,
  marketFilter,
  isEditingMarketFilter,
  visibleMarketPlugins,
  marketPluginWindowStart,
  selectedMarketPluginIndex,
  selectedMarketPlugin,
  marketDetailScrollOffset,
  marketDetailViewportHeight,
  loadingPluginDetailName,
  pendingPluginDeleteName,
  workingPluginName,
  workingMarketPluginName,
}: PluginsViewProps) {
  const listWidth = Math.max(62, Math.min(88, Math.floor(width * 0.55)));
  const detailWidth = Math.max(34, width - listWidth - 3);
  const panelHeight = Math.max(1, height - 3);
  const activeCount = plugins.filter((plugin) => plugin.activated !== false).length;
  const updateCount = plugins.filter((plugin) => plugin.has_update).length;
  const installedMarketCount = marketPlugins.filter((plugin) => plugin.installed).length;
  const selectedPosition =
    pluginTab === "market"
      ? marketPlugins.length
        ? `${Math.min(selectedMarketPluginIndex + 1, marketPlugins.length)}/${marketPlugins.length}`
        : "0/0"
      : plugins.length
        ? `${Math.min(selectedPluginIndex + 1, plugins.length)}/${plugins.length}`
        : "0/0";
  const meta =
    pluginTab === "market"
      ? `${marketPlugins.length}/${marketTotalCount} ${i18n.t("tui.plugins.meta.market", "market")}  ${installedMarketCount} ${i18n.t("tui.plugins.meta.installed", "installed")}  ${selectedPosition}`
      : `${plugins.length} ${i18n.t("tui.plugins.meta.installed", "installed")}  ${activeCount} ${i18n.t("tui.common.on", "on")}  ${updateCount} ${i18n.t("tui.plugins.meta.updates", "updates")}  ${selectedPosition}`;
  const components = selectedPluginDetail?.components || [];
  const selectedComponent = components[selectedPluginComponentIndex] || null;

  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{i18n.t("core.navigation.extension", "Plugins")}</Text>
        <Text dimColor>{meta}</Text>
      </Box>
      <PluginTabs
        i18n={i18n}
        width={width}
        pluginTab={pluginTab}
        pluginPane={pluginPane}
        marketFilter={marketFilter}
        isEditingMarketFilter={isEditingMarketFilter}
      />
      <Box>
        <Box
          width={listWidth}
          height={panelHeight}
          flexDirection="column"
          borderStyle="single"
          borderColor={listBorderColor(pluginTab, pluginPane)}
          paddingX={1}
        >
          {pluginTab === "market" ? (
            <MarketList
              i18n={i18n}
              width={listWidth - 4}
              marketPlugins={marketPlugins}
              visibleMarketPlugins={visibleMarketPlugins}
              marketPluginWindowStart={marketPluginWindowStart}
              selectedMarketPluginIndex={selectedMarketPluginIndex}
              pluginPane={pluginPane}
              workingMarketPluginName={workingMarketPluginName}
            />
          ) : (
            <InstalledList
              i18n={i18n}
              width={listWidth - 4}
              plugins={plugins}
              visiblePlugins={visiblePlugins}
              pluginWindowStart={pluginWindowStart}
              selectedPluginIndex={selectedPluginIndex}
              selectedPluginAction={selectedPluginAction}
              pluginPane={pluginPane}
              pendingPluginDeleteName={pendingPluginDeleteName}
              workingPluginName={workingPluginName}
            />
          )}
        </Box>
        <Box width={3}>
          <Text> </Text>
        </Box>
        <Box
          width={detailWidth}
          height={panelHeight}
          flexDirection="column"
          borderStyle="single"
          borderColor={detailBorderColor(pluginTab, pluginPane)}
          paddingX={1}
        >
          {pluginTab === "market" ? (
            <MarketDetail
              i18n={i18n}
              plugin={selectedMarketPlugin}
              width={detailWidth - 4}
              scrollOffset={marketDetailScrollOffset}
              viewportHeight={marketDetailViewportHeight}
              isFocused={pluginPane === "marketActions"}
              working={Boolean(
                selectedMarketPlugin &&
                  workingMarketPluginName === marketPluginKey(selectedMarketPlugin),
              )}
            />
          ) : (
            <InstalledDetail
              i18n={i18n}
              plugin={selectedPlugin}
              detail={selectedPluginDetail}
              selectedPluginDetailAction={selectedPluginDetailAction}
              pluginPane={pluginPane}
              selectedPluginComponentIndex={selectedPluginComponentIndex}
              visiblePluginComponents={visiblePluginComponents}
              pluginComponentWindowStart={pluginComponentWindowStart}
              selectedPluginConfigSettingIndex={selectedPluginConfigSettingIndex}
              visiblePluginConfigSettings={visiblePluginConfigSettings}
              pluginConfigWindowStart={pluginConfigWindowStart}
              pluginConfigSettingCount={pluginConfigSettingCount}
              loadingPluginConfigName={loadingPluginConfigName}
              editingPluginConfigSettingKey={editingPluginConfigSettingKey}
              loadingPluginDetailName={loadingPluginDetailName}
              width={detailWidth - 4}
            />
          )}
        </Box>
      </Box>
      <Text dimColor>
        {truncateCells(
          pluginFooterLine({
            pluginTab,
            pluginPane,
            selectedPlugin,
            selectedMarketPlugin,
            selectedPluginAction,
            selectedPluginDetailAction,
            selectedComponent,
            pendingPluginDeleteName,
            workingPluginName,
            workingMarketPluginName,
            i18n,
          }),
          width,
        )}
      </Text>
    </>
  );
}

function PluginTabs({
  i18n,
  width,
  pluginTab,
  pluginPane,
  marketFilter,
  isEditingMarketFilter,
}: {
  i18n: I18n;
  width: number;
  pluginTab: PluginTab;
  pluginPane: PluginPane;
  marketFilter: string;
  isEditingMarketFilter: boolean;
}) {
  const tabFocused = pluginPane === "tabs";
  const searchSelected = pluginPane === "marketSearch";
  const filterText = marketFilter
    ? truncateCells(
        `${i18n.t("core.actions.filter", "filter")}: ${marketFilter}`,
        Math.max(10, Math.floor(width * 0.28)),
      )
    : "";
  return (
    <Box width={width} justifyContent="space-between">
      <Box>
        <Text
          color={pluginTab === "installed" ? "cyan" : undefined}
          inverse={tabFocused && pluginTab === "installed"}
        >
          {` ${i18n.t("features.extension.tabs.installedPlugins", "AstrBot Plugins")} `}
        </Text>
        <Text> </Text>
        <Text
          color={pluginTab === "market" ? "cyan" : undefined}
          inverse={tabFocused && pluginTab === "market"}
        >
          {` ${i18n.t("core.navigation.extensionTabs.market", "Market")} `}
        </Text>
      </Box>
      {pluginTab === "market" ? (
        <Box>
          {filterText ? (
            <>
              <Text color="gray">{filterText}</Text>
              <Text> </Text>
            </>
          ) : null}
          <Text
            color={searchSelected || isEditingMarketFilter ? "cyan" : "green"}
            inverse={searchSelected && !isEditingMarketFilter}
          >
            {` ${i18n.t("core.actions.search", "Search")} `}
          </Text>
        </Box>
      ) : (
        <Text> </Text>
      )}
    </Box>
  );
}

function InstalledList({
  i18n,
  width,
  plugins,
  visiblePlugins,
  pluginWindowStart,
  selectedPluginIndex,
  selectedPluginAction,
  pluginPane,
  pendingPluginDeleteName,
  workingPluginName,
}: {
  i18n: I18n;
  width: number;
  plugins: PluginItem[];
  visiblePlugins: PluginItem[];
  pluginWindowStart: number;
  selectedPluginIndex: number;
  selectedPluginAction: PluginAction;
  pluginPane: PluginPane;
  pendingPluginDeleteName: string | null;
  workingPluginName: string | null;
}) {
  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{i18n.t("features.extension.titles.installedAstrBotPlugins", "Installed AstrBot Plugins")}</Text>
        <Text dimColor>{plugins.length}</Text>
      </Box>
      <Text dimColor>{pluginHeader(width, i18n)}</Text>
      {visiblePlugins.length ? (
        visiblePlugins.map((plugin, index) => {
          const pluginIndex = pluginWindowStart + index;
          const isSelected = pluginPane === "list" && pluginIndex === selectedPluginIndex;
          return (
            <PluginRow
              i18n={i18n}
              key={plugin.name}
              plugin={plugin}
              width={width}
              isSelected={isSelected}
              isCurrent={pluginIndex === selectedPluginIndex}
              selectedAction={selectedPluginAction}
              pendingDelete={pendingPluginDeleteName === plugin.name}
              working={workingPluginName === plugin.name}
            />
          );
        })
      ) : (
        <Text dimColor>{i18n.t("tui.plugins.noInstalled", "No installed plugins.")}</Text>
      )}
    </>
  );
}

function MarketList({
  i18n,
  width,
  marketPlugins,
  visibleMarketPlugins,
  marketPluginWindowStart,
  selectedMarketPluginIndex,
  pluginPane,
  workingMarketPluginName,
}: {
  i18n: I18n;
  width: number;
  marketPlugins: PluginMarketItem[];
  visibleMarketPlugins: PluginMarketItem[];
  marketPluginWindowStart: number;
  selectedMarketPluginIndex: number;
  pluginPane: PluginPane;
  workingMarketPluginName: string | null;
}) {
  return (
    <>
      <Text dimColor>{marketHeader(width, i18n)}</Text>
      {visibleMarketPlugins.length ? (
        visibleMarketPlugins.map((plugin, index) => {
          const pluginIndex = marketPluginWindowStart + index;
          const isCurrent = pluginIndex === selectedMarketPluginIndex;
          return (
            <MarketRow
              i18n={i18n}
              key={`${marketPluginKey(plugin)}-${pluginIndex}`}
              plugin={plugin}
              width={width}
              isSelected={pluginPane === "market" && isCurrent}
              isActionSelected={pluginPane === "marketActions" && isCurrent}
              isCurrent={isCurrent}
              working={workingMarketPluginName === marketPluginKey(plugin)}
            />
          );
        })
      ) : (
        <Text dimColor>{i18n.t("tui.plugins.noMarketLoaded", "No market plugins loaded.")}</Text>
      )}
    </>
  );
}

function InstalledDetail({
  i18n,
  plugin,
  detail,
  selectedPluginDetailAction,
  pluginPane,
  selectedPluginComponentIndex,
  visiblePluginComponents,
  pluginComponentWindowStart,
  selectedPluginConfigSettingIndex,
  visiblePluginConfigSettings,
  pluginConfigWindowStart,
  pluginConfigSettingCount,
  loadingPluginConfigName,
  editingPluginConfigSettingKey,
  loadingPluginDetailName,
  width,
}: {
  i18n: I18n;
  plugin: PluginItem | null;
  detail: PluginDetail | null;
  selectedPluginDetailAction: PluginDetailAction;
  pluginPane: PluginPane;
  selectedPluginComponentIndex: number;
  visiblePluginComponents: PluginComponent[];
  pluginComponentWindowStart: number;
  selectedPluginConfigSettingIndex: number;
  visiblePluginConfigSettings: PluginConfigSetting[];
  pluginConfigWindowStart: number;
  pluginConfigSettingCount: number;
  loadingPluginConfigName: string | null;
  editingPluginConfigSettingKey: string | null;
  loadingPluginDetailName: string | null;
  width: number;
}) {
  const components = detail?.components || [];
  const selectedVisibleConfigIndex =
    selectedPluginConfigSettingIndex - pluginConfigWindowStart;
  const selectedConfigSetting =
    pluginPane === "config" &&
    !editingPluginConfigSettingKey &&
    selectedVisibleConfigIndex >= 0 &&
    selectedVisibleConfigIndex < visiblePluginConfigSettings.length
      ? visiblePluginConfigSettings[selectedVisibleConfigIndex]
      : null;
  if (!plugin) {
    return <Text dimColor>{i18n.t("tui.plugins.selectPlugin", "Select a plugin.")}</Text>;
  }

  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{truncateCells(pluginDisplayName(plugin), Math.max(1, width - 14))}</Text>
        <Text color={pluginStateColor(plugin)}>
          {plugin.activated === false
            ? i18n.t("tui.common.off", "off")
            : i18n.t("tui.common.on", "on")}
        </Text>
      </Box>
      <PluginActionRow
        i18n={i18n}
        plugin={plugin}
        selectedAction={selectedPluginDetailAction}
        isSelected={pluginPane === "actions"}
        width={width}
      />
      <PluginDetailLine label={i18n.t("core.common.name", "Name")} value={plugin.name} width={width} color="cyan" />
      <PluginDetailLine label={i18n.t("features.extension.table.headers.version", "Version")} value={String(plugin.version || "-")} width={width} color="gray" />
      <PluginDetailLine label={i18n.t("core.header.updateDialog.redirectConfirm.latestLabel", "Latest")} value={latestVersionLabel(plugin, i18n)} width={width} color={plugin.has_update ? "yellow" : "gray"} />
      <PluginDetailLine label={i18n.t("features.extension.table.headers.author", "Author")} value={String(plugin.author || "-")} width={width} color="gray" />
      {plugin.reserved ? (
        <PluginDetailLine
          label={i18n.t("features.extension.status.system", "System")}
          value={i18n.t("tui.plugins.reservedPlugin", "reserved plugin")}
          width={width}
          color="magenta"
        />
      ) : null}
      {plugin.support_platforms?.length ? (
        <PluginDetailLine
          label={i18n.t("features.extension.detail.info.supportPlatforms", "Platforms")}
          value={plugin.support_platforms.join(", ")}
          width={width}
          color="gray"
        />
      ) : null}
      {plugin.astrbot_version ? (
        <PluginDetailLine
          label="AstrBot"
          value={plugin.astrbot_version}
          width={width}
          color="gray"
        />
      ) : null}
      <Text dimColor>{truncateCells(String(plugin.desc || i18n.t("tui.plugins.noDescription", "No description.")), width)}</Text>
      <Text> </Text>
      <Box justifyContent="space-between">
        <Text bold>{i18n.t("features.extension.detail.contents", "Plugin Handlers")}</Text>
        <Text dimColor>
          {loadingPluginDetailName === plugin.name
            ? i18n.t("core.status.loading", "loading")
            : `${components.length ? selectedPluginComponentIndex + 1 : 0}/${components.length}`}
        </Text>
      </Box>
      {visiblePluginComponents.length ? (
        visiblePluginComponents.map((component, index) => {
          const componentIndex = pluginComponentWindowStart + index;
          const isSelected =
            pluginPane === "components" &&
            componentIndex === selectedPluginComponentIndex;
          return (
            <PluginComponentLine
              i18n={i18n}
              key={`${componentIndex}-${component.type}-${component.name}`}
              component={component}
              width={width}
              isSelected={isSelected}
            />
          );
        })
      ) : (
        <Text dimColor>
          {loadingPluginDetailName === plugin.name
            ? i18n.t("tui.plugins.loadingComponents", "Loading plugin components...")
            : i18n.t("tui.plugins.noComponentsLoaded", "No components loaded.")}
        </Text>
      )}
      <Text> </Text>
      <Box justifyContent="space-between">
        <Text bold>{i18n.t("core.navigation.config", "Config")}</Text>
        <Text dimColor>
          {loadingPluginConfigName === plugin.name
            ? i18n.t("core.status.loading", "loading")
            : `${pluginConfigSettingCount ? selectedPluginConfigSettingIndex + 1 : 0}/${pluginConfigSettingCount}`}
        </Text>
      </Box>
      {visiblePluginConfigSettings.length ? (
        visiblePluginConfigSettings.map((setting, index) => {
          const settingIndex = pluginConfigWindowStart + index;
          return (
            <PluginConfigSettingLine
              i18n={i18n}
              key={setting.id}
              setting={setting}
              width={width}
              isSelected={pluginPane === "config" && settingIndex === selectedPluginConfigSettingIndex}
              isEditing={editingPluginConfigSettingKey === setting.id}
            />
          );
        })
      ) : (
        <Text dimColor>
          {loadingPluginConfigName === plugin.name
            ? i18n.t("tui.plugins.loadingConfigPlain", "Loading plugin config...")
            : i18n.t("tui.plugins.noPluginConfig", "No plugin config.")}
        </Text>
      )}
      {selectedConfigSetting ? (
        <PluginConfigSelectedDetail
          i18n={i18n}
          setting={selectedConfigSetting}
          width={width}
        />
      ) : null}
    </>
  );
}

function MarketDetail({
  i18n,
  plugin,
  width,
  scrollOffset,
  viewportHeight,
  isFocused,
  working,
}: {
  i18n: I18n;
  plugin: PluginMarketItem | null;
  width: number;
  scrollOffset: number;
  viewportHeight: number;
  isFocused: boolean;
  working: boolean;
}) {
  if (!plugin) {
    return <Text dimColor>{i18n.t("tui.plugins.selectMarketPlugin", "Select a market plugin.")}</Text>;
  }
  const lines = marketDetailLines(plugin, width, working, i18n);
  const maxScrollOffset = Math.max(0, lines.length - viewportHeight);
  const start = Math.min(scrollOffset, maxScrollOffset);
  const visibleLines = lines.slice(start, start + viewportHeight);

  return (
    <>
      {visibleLines.map((line, index) => (
        <MarketDetailLineView
          key={`${start + index}-${line.label}-${line.value}`}
          line={line}
          width={width}
        />
      ))}
      {isFocused && maxScrollOffset > 0 ? (
        <Text dimColor>
          {truncateCells(`${i18n.t("tui.plugins.detail", "Detail")} ${start + 1}-${Math.min(start + viewportHeight, lines.length)}/${lines.length}`, width)}
        </Text>
      ) : null}
    </>
  );
}

function PluginRow({
  i18n,
  plugin,
  width,
  isSelected,
  isCurrent,
  selectedAction,
  pendingDelete,
  working,
}: {
  i18n: I18n;
  plugin: PluginItem;
  width: number;
  isSelected: boolean;
  isCurrent: boolean;
  selectedAction: PluginAction;
  pendingDelete: boolean;
  working: boolean;
}) {
  const cells = pluginCells(plugin, width, isSelected, working, i18n);
  const switchSelected = isSelected && selectedAction === "switch";
  const deleteSelected = isSelected && selectedAction === "delete";
  return (
    <Box width={width}>
      <Text color={isSelected ? "cyan" : isCurrent ? "green" : undefined}>
        {cells.marker}
      </Text>
      <Text
        color={switchSelected ? "cyan" : pluginStateColor(plugin)}
        inverse={switchSelected}
      >
        {cells.state}
      </Text>
      <Text color={isSelected ? "cyan" : plugin.activated === false ? "gray" : undefined}>
        {cells.name}
      </Text>
      <Text color={plugin.has_update ? "yellow" : isSelected ? "cyan" : "gray"}>
        {cells.version}
      </Text>
      <Text color={pendingDelete ? "yellow" : "red"} inverse={deleteSelected}>
        {cells.delete}
      </Text>
    </Box>
  );
}

function MarketRow({
  i18n,
  plugin,
  width,
  isSelected,
  isActionSelected,
  isCurrent,
  working,
}: {
  i18n: I18n;
  plugin: PluginMarketItem;
  width: number;
  isSelected: boolean;
  isActionSelected: boolean;
  isCurrent: boolean;
  working: boolean;
}) {
  const cells = marketCells(plugin, width, isSelected, working, i18n);
  return (
    <Box width={width}>
      <Text color={isSelected || isActionSelected ? "cyan" : isCurrent ? "green" : undefined}>
        {cells.marker}
      </Text>
      <Text color={marketStatusColor(plugin)}>
        {cells.status}
      </Text>
      <Text color={isSelected ? "cyan" : plugin.installed ? "gray" : undefined} wrap="truncate-end">
        {cells.name}
      </Text>
      <Text color={plugin.has_update ? "yellow" : "gray"}>
        {cells.version}
      </Text>
      <Text color={marketActionColor(plugin, working)} inverse={isActionSelected}>
        {cells.action}
      </Text>
    </Box>
  );
}

function PluginActionRow({
  i18n,
  plugin,
  selectedAction,
  isSelected,
  width,
}: {
  i18n: I18n;
  plugin: PluginItem;
  selectedAction: PluginDetailAction;
  isSelected: boolean;
  width: number;
}) {
  const reloadSelected = isSelected && selectedAction === "reload";
  const updateSelected = isSelected && selectedAction === "update";
  const reloadLabel = i18n.t("features.extension.buttons.reload", "Reload");
  const updateLabel = plugin.has_update
    ? i18n.t("features.extension.buttons.update", "Update")
    : i18n.t("tui.plugins.reinstall", "Reinstall");
  const titleWidth = Math.max(
    1,
    width -
      terminalWidth(reloadLabel) -
      terminalWidth(updateLabel) -
      6,
  );

  return (
    <Box width={width}>
      <Text color="gray">{padRightCells(i18n.t("features.extension.buttons.actions", "Actions"), titleWidth)}</Text>
      <Text
        color={reloadSelected ? "cyan" : "magenta"}
        inverse={reloadSelected}
      >
        {` ${reloadLabel} `}
      </Text>
      <Text> </Text>
      <Text
        color={updateSelected ? "cyan" : plugin.has_update ? "yellow" : "gray"}
        inverse={updateSelected}
      >
        {` ${updateLabel} `}
      </Text>
    </Box>
  );
}

function pluginCells(
  plugin: PluginItem,
  width: number,
  isSelected: boolean,
  working: boolean,
  i18n: I18n,
): {
  marker: string;
  state: string;
  name: string;
  version: string;
  delete: string;
} {
  const layout = pluginTableLayout(width);
  const marker = `${isSelected ? ">" : " "} `;
  const state = working
    ? "..."
    : plugin.activated === false
      ? i18n.t("tui.common.off", "off")
      : i18n.t("tui.common.on", "on");
  const version = String(plugin.version || "-");
  return {
    marker,
    state: padRightCells(state, PLUGIN_STATE_WIDTH),
    name: padRightCells(truncateCells(pluginDisplayName(plugin), layout.nameWidth), layout.nameWidth),
    version: padRightCells(truncateCells(version, layout.versionWidth), layout.versionWidth),
    delete: padRightCells(i18n.t("tui.plugins.headerDelete", "X"), PLUGIN_DELETE_WIDTH),
  };
}

function marketCells(
  plugin: PluginMarketItem,
  width: number,
  isSelected: boolean,
  working: boolean,
  i18n: I18n,
): {
  marker: string;
  status: string;
  name: string;
  version: string;
  action: string;
} {
  const layout = marketTableLayout(width);
  const marker = `${isSelected ? ">" : " "} `;
  return {
    marker,
    status: padRightCells(marketStatusLabel(plugin, i18n), MARKET_STATUS_WIDTH),
    name: padRightCells(truncateCells(marketPluginListName(plugin), layout.nameWidth), layout.nameWidth),
    version: padRightCells(truncateCells(String(plugin.version || "-"), MARKET_VERSION_WIDTH), MARKET_VERSION_WIDTH),
    action: padRightCells(
      working ? i18n.t("tui.plugins.working", "Working") : marketActionLabel(plugin, i18n),
      MARKET_ACTION_WIDTH,
    ),
  };
}

function pluginHeader(width: number, i18n: I18n): string {
  const layout = pluginTableLayout(width);
  return truncateCells(
    `${padRightCells(`  ${i18n.t("tui.plugins.headerState", "S")}`, 2 + PLUGIN_STATE_WIDTH)}${padRightCells(i18n.t("features.extension.failedPlugins.columns.plugin", "Plugin"), layout.nameWidth)}${padRightCells(i18n.t("features.extension.table.headers.version", "Version"), layout.versionWidth)}${padRightCells(i18n.t("tui.plugins.headerDelete", "X"), PLUGIN_DELETE_WIDTH)}`,
    width,
  );
}

function marketHeader(width: number, i18n: I18n): string {
  const layout = marketTableLayout(width);
  return truncateCells(
    `${padRightCells(`  ${i18n.t("core.common.status", "Status")}`, 2 + MARKET_STATUS_WIDTH)}${padRightCells(i18n.t("features.extension.failedPlugins.columns.plugin", "Plugin"), layout.nameWidth)}${padRightCells(i18n.t("features.extension.table.headers.version", "Version"), MARKET_VERSION_WIDTH)}${padRightCells(i18n.t("features.extension.table.headers.actions", "Action"), MARKET_ACTION_WIDTH)}`,
    width,
  );
}

function pluginTableLayout(width: number): {
  nameWidth: number;
  versionWidth: number;
} {
  const fixed =
    2 +
    PLUGIN_STATE_WIDTH +
    PLUGIN_DELETE_WIDTH;
  const available = Math.max(24, width - fixed);
  const versionWidth = Math.max(12, Math.min(24, Math.floor(available * 0.24)));
  return {
    nameWidth: Math.max(8, available - versionWidth),
    versionWidth,
  };
}

function marketTableLayout(width: number): {
  nameWidth: number;
} {
  const fixed =
    2 +
    MARKET_STATUS_WIDTH +
    MARKET_VERSION_WIDTH +
    MARKET_ACTION_WIDTH;
  return {
    nameWidth: Math.max(8, width - fixed - 2),
  };
}

function PluginDetailLine({
  label,
  value,
  width,
  color,
}: {
  label: string;
  value: string;
  width: number;
  color: TextColor;
}) {
  const labelWidth = Math.min(12, Math.max(8, Math.floor(width * 0.24)));
  const valueWidth = Math.max(1, width - labelWidth - 4);
  return (
    <Box width={width}>
      <Text color="gray">{padRightCells(label, labelWidth)}</Text>
      <Text>  </Text>
      <Text color={color} wrap="truncate-end">
        {padRightCells(truncateCells(value || "-", valueWidth), valueWidth)}
      </Text>
    </Box>
  );
}

function PluginConfigSettingLine({
  i18n,
  setting,
  width,
  isSelected,
  isEditing,
}: {
  i18n: I18n;
  setting: PluginConfigSetting;
  width: number;
  isSelected: boolean;
  isEditing: boolean;
}) {
  const marker = `${isSelected ? ">" : " "} `;
  const active = isSelected || isEditing;
  const gap = "  ";
  const typeWidth = 8;
  const keyWidth = Math.min(28, Math.max(12, Math.floor(width * 0.38)));
  const valueWidth = Math.max(
    1,
    width -
      terminalWidth(marker) -
      typeWidth -
      keyWidth -
      terminalWidth(gap) * 2,
  );
  const value = pluginConfigValueLabel(setting, i18n);
  const name = `${"  ".repeat(setting.depth)}${setting.label || setting.key}`;
  const type = pluginConfigTypeLabel(setting, i18n);
  const valueColor = setting.editable ? "yellow" : "gray";
  return (
    <Box width={width}>
      <Text color={active ? "cyan" : undefined}>{marker}</Text>
      <Text color={active ? "cyan" : setting.isGroup ? "blue" : "gray"} inverse={active}>
        {padRightCells(truncateCells(type, typeWidth), typeWidth)}
      </Text>
      <Text inverse={active}>{gap}</Text>
      <Text color={active ? "cyan" : setting.isGroup ? "white" : undefined} inverse={active}>
        {padRightCells(truncateCells(name, keyWidth), keyWidth)}
      </Text>
      <Text inverse={active}>{gap}</Text>
      <Text color={active ? "white" : valueColor} inverse={active}>
        {padRightCells(truncateCells(value, valueWidth), valueWidth)}
      </Text>
    </Box>
  );
}

function PluginConfigSelectedDetail({
  i18n,
  setting,
  width,
}: {
  i18n: I18n;
  setting: PluginConfigSetting;
  width: number;
}) {
  const description = setting.label || setting.key;
  const value = pluginConfigValueLabel(setting, i18n);
  const valueColor = setting.editable ? "yellow" : "gray";
  return (
    <Box flexDirection="column" marginTop={1}>
      <PluginConfigPreviewLine
        label="desc"
        value={description}
        width={width}
        color="cyan"
        maxLines={2}
      />
      {setting.hint ? (
        <PluginConfigPreviewLine
          label="hint"
          value={setting.hint}
          width={width}
          color="gray"
          maxLines={1}
        />
      ) : null}
      <PluginConfigPreviewLine
        label="key"
        value={setting.key}
        width={width}
        color="gray"
        maxLines={1}
      />
      <PluginConfigPreviewLine
        label="value"
        value={value}
        width={width}
        color={valueColor}
        maxLines={1}
      />
    </Box>
  );
}

function PluginConfigPreviewLine({
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
  const labelWidth = 5;
  const gap = "  ";
  const contentWidth = Math.max(1, width - labelWidth - terminalWidth(gap));
  const lines = wrapCells(value || "-", contentWidth, maxLines);
  return (
    <>
      {lines.map((line, index) => (
        <Box key={`${label}-${index}`} width={width}>
          <Text color="gray">
            {padRightCells(index === 0 ? label : "", labelWidth)}
          </Text>
          <Text>{gap}</Text>
          <Text color={color} wrap="truncate-end">
            {padRightCells(truncateCells(line, contentWidth), contentWidth)}
          </Text>
        </Box>
      ))}
    </>
  );
}

function pluginConfigValueLabel(setting: PluginConfigSetting, i18n: I18n): string {
  const value = setting.value;
  if (setting.isGroup) {
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
    return value
      ? i18n.t("tui.common.true", "true")
      : i18n.t("tui.common.false", "false");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function pluginConfigTypeLabel(setting: PluginConfigSetting, i18n: I18n): string {
  if (setting.schema?._special) {
    return i18n.t("tui.plugins.configType.special", "special");
  }
  const type = String(setting.schema?.type || inferPluginConfigType(setting.value));
  if (type === "string") {
    return i18n.t("tui.plugins.configType.string", "str");
  }
  if (type === "boolean") {
    return i18n.t("tui.plugins.configType.boolean", "bool");
  }
  if (type === "number") {
    return i18n.t("tui.plugins.configType.number", "num");
  }
  if (type === "bool") {
    return i18n.t("tui.plugins.configType.bool", "bool");
  }
  if (type === "list") {
    return i18n.t("tui.plugins.configType.list", "list");
  }
  if (type === "value") {
    return i18n.t("tui.plugins.configType.value", "value");
  }
  if (type === "int") {
    return i18n.t("tui.plugins.configType.int", "int");
  }
  if (type === "float") {
    return i18n.t("tui.plugins.configType.float", "float");
  }
  if (type === "object") {
    return i18n.t("tui.plugins.configType.object", "object");
  }
  if (type === "file") {
    return i18n.t("tui.plugins.configType.file", "file");
  }
  if (type === "dict") {
    return i18n.t("tui.plugins.configType.dict", "dict");
  }
  if (type === "template_list") {
    return i18n.t("tui.plugins.configType.templateList", "tmpl");
  }
  return type || i18n.t("tui.common.value", "value");
}

function inferPluginConfigType(value: unknown): string {
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

function MarketDetailLineView({
  line,
  width,
}: {
  line: PluginDetailRenderLine;
  width: number;
}) {
  if (!line.label) {
    return (
      <Text dimColor={line.dim} color={line.dim ? undefined : line.color} wrap="truncate-end">
        {truncateCells(line.value, width)}
      </Text>
    );
  }
  const labelWidth = Math.min(12, Math.max(8, Math.floor(width * 0.24)));
  const valueWidth = Math.max(1, width - labelWidth - 4);
  return (
    <Box width={width}>
      <Text color="gray">{padRightCells(line.label, labelWidth)}</Text>
      <Text>  </Text>
      <Text
        color={line.color}
        bold={line.bold}
        dimColor={line.dim}
        wrap="truncate-end"
      >
        {line.href
          ? hyperlink(line.value || "-", line.href)
          : padRightCells(truncateCells(line.value || "-", valueWidth), valueWidth)}
      </Text>
    </Box>
  );
}

function PluginComponentLine({
  i18n,
  component,
  width,
  isSelected,
}: {
  i18n: I18n;
  component: PluginComponent;
  width: number;
  isSelected: boolean;
}) {
  const marker = `${isSelected ? ">" : " "} `;
  const type = padRightCells(componentTypeLabel(component, i18n), 10);
  const name = componentLabel(component);
  const count = Array.isArray(component.subcommands) && component.subcommands.length
    ? ` (${component.subcommands.length})`
    : "";
  const nameWidth = Math.max(
    1,
    width - terminalWidth(marker) - terminalWidth(type),
  );
  return (
    <Box width={width}>
      <Text color={isSelected ? "cyan" : undefined}>{marker}</Text>
      <Text color={isSelected ? "cyan" : componentTypeColor(component)}>
        {type}
      </Text>
      <Text color={isSelected ? "cyan" : undefined}>
        {truncateCells(`${name}${count}`, nameWidth)}
      </Text>
    </Box>
  );
}

function wrapCells(value: string, width: number, maxLines: number): string[] {
  if (width <= 0) {
    return [""];
  }
  const chars = Array.from(value);
  const lines: string[] = [];
  let line = "";
  let used = 0;

  for (const char of chars) {
    const charWidth = terminalWidth(char);
    if (used > 0 && used + charWidth > width) {
      lines.push(line);
      line = "";
      used = 0;
      if (lines.length >= maxLines) {
        break;
      }
    }
    line += char;
    used += charWidth;
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  }
  if (!lines.length) {
    return [""];
  }
  if (chars.length && lines.length === maxLines && terminalWidth(lines[lines.length - 1] || "") >= width) {
    lines[lines.length - 1] = truncateCells(lines[lines.length - 1] || "", Math.max(1, width - 1));
  }
  return lines;
}

function marketDetailLines(
  plugin: PluginMarketItem,
  width: number,
  working: boolean,
  i18n: I18n,
): PluginDetailRenderLine[] {
  const lines: PluginDetailRenderLine[] = [];
  const valueWidth = marketDetailValueWidth(width);
  lines.push({
    label: "",
    value: `${marketPluginDisplayName(plugin)}  ${marketStatusLabel(plugin, i18n)}`,
    color: marketStatusColor(plugin),
    bold: true,
  });
  if (working) {
    lines.push({
      label: i18n.t("features.extension.table.headers.actions", "Action"),
      value: i18n.t("tui.plugins.workingEllipsis", "Working..."),
      color: "yellow",
    });
  }
  lines.push({ label: i18n.t("core.common.name", "Name"), value: plugin.name, color: "cyan" });
  lines.push({
    label: i18n.t("features.extension.detail.info.version", "Version"),
    value: String(plugin.version || "-"),
    color: plugin.has_update ? "yellow" : "gray",
  });
  if (plugin.installed) {
    lines.push({
      label: i18n.t("features.extension.status.installed", "Installed"),
      value: String(plugin.installed_version || "-"),
      color: plugin.has_update ? "yellow" : "green",
    });
  }
  lines.push({
    label: i18n.t("features.extension.detail.info.author", "Author"),
    value: String(plugin.author || "-"),
    color: "gray",
  });
  if (plugin.category) {
    lines.push({
      label: i18n.t("features.extension.detail.info.category", "Category"),
      value: String(plugin.category),
      color: "blue",
    });
  }
  if (plugin.stars !== undefined) {
    lines.push({
      label: i18n.t("features.extension.detail.info.stars", "Stars"),
      value: String(plugin.stars),
      color: "yellow",
    });
  }
  const supportPlatforms = listValue(plugin.support_platforms);
  if (supportPlatforms) {
    lines.push({
      label: i18n.t("features.extension.detail.info.supportPlatforms", "Platforms"),
      value: supportPlatforms,
      color: "gray",
    });
  }
  if (plugin.astrbot_version) {
    lines.push({
      label: i18n.t("tui.plugins.astrbot", "AstrBot"),
      value: plugin.astrbot_version,
      color: "gray",
    });
  }
  const tags = listValue(plugin.tags);
  if (tags) {
    lines.push({ label: i18n.t("features.extension.detail.info.tags", "Tags"), value: tags, color: "magenta" });
  }
  appendLinkDetailLines(lines, i18n.t("features.extension.detail.info.repository", "Repo"), String(plugin.repo || "-"), valueWidth, "gray");
  if (plugin.download_url) {
    appendLinkDetailLines(lines, i18n.t("tui.plugins.package", "Package"), String(plugin.download_url), valueWidth, "gray");
  }
  lines.push({ label: "", value: " ", color: "gray", dim: true });
  for (const line of wrapCells(
    String(plugin.short_desc || plugin.desc || i18n.t("tui.plugins.noDescription", "No description.")),
    Math.max(8, width - 2),
    Number.POSITIVE_INFINITY,
  )) {
    lines.push({ label: "", value: line, color: "gray", dim: true });
  }
  return lines;
}

function appendLinkDetailLines(
  lines: PluginDetailRenderLine[],
  label: string,
  value: string,
  width: number,
  color: TextColor,
): void {
  const url = String(value || "").trim();
  if (url && url !== "-") {
    wrapCells(url, width, Number.POSITIVE_INFINITY).forEach((line, index) => {
      lines.push({
        label: index === 0 ? label : " ",
        value: line,
        color,
        href: url,
      });
    });
    return;
  }
  lines.push({ label, value: "-", color });
}

function marketDetailValueWidth(width: number): number {
  const labelWidth = Math.min(12, Math.max(8, Math.floor(width * 0.24)));
  return Math.max(8, width - labelWidth - 4);
}

function pluginDisplayName(plugin: PluginItem): string {
  return String(plugin.display_name || plugin.name || "-");
}

function marketPluginDisplayName(plugin: PluginMarketItem): string {
  return String(plugin.display_name || plugin.trimmedName || plugin.name || "-");
}

function marketPluginListName(plugin: PluginMarketItem): string {
  const displayName = marketPluginDisplayName(plugin);
  const safeName = displayName
    .replace(/[\p{Extended_Pictographic}\u{1f1e6}-\u{1f1ff}\ufe0f\u200d]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return safeName || displayName;
}

function listValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return "";
  }
  return String(value).trim();
}

function hyperlink(label: string, url: string): string {
  return `\u001b]8;;${url}\u0007${label}\u001b]8;;\u0007`;
}

function latestVersionLabel(plugin: PluginItem, i18n: I18n): string {
  const current = String(plugin.version || "-");
  const online = String(plugin.online_version || plugin.online_vesion || "");
  if (!online) {
    return i18n.t("features.extension.status.unknown", "unknown");
  }
  if (plugin.has_update) {
    return `${current} -> ${online}`;
  }
  if (!plugin.has_update && String(plugin.version || "") === online) {
    return `${online} (${i18n.t("tui.plugins.current", "current")})`;
  }
  return online;
}

function pluginStateColor(plugin: PluginItem): TextColor {
  if (plugin.activated === false) {
    return "red";
  }
  return "green";
}

function marketStatusLabel(plugin: PluginMarketItem, i18n: I18n): string {
  if (plugin.installed && plugin.has_update) {
    return i18n.t("features.extension.buttons.update", "Update");
  }
  if (plugin.installed) {
    return i18n.t("features.extension.status.installed", "Installed");
  }
  return plugin.pinned
    ? i18n.t("tui.plugins.featured", "Featured")
    : i18n.t("core.shared.t2iTemplateEditor.new", "New");
}

function marketStatusColor(plugin: PluginMarketItem): TextColor {
  if (plugin.installed && plugin.has_update) {
    return "yellow";
  }
  if (plugin.installed) {
    return "green";
  }
  if (plugin.pinned) {
    return "magenta";
  }
  return "cyan";
}

function marketActionLabel(plugin: PluginMarketItem, i18n: I18n): string {
  if (plugin.installed && plugin.has_update) {
    return i18n.t("features.extension.buttons.update", "Update");
  }
  if (plugin.installed) {
    return i18n.t("features.extension.card.actions.reinstall", "Reinstall");
  }
  return i18n.t("features.extension.buttons.install", "Install");
}

function marketActionColor(plugin: PluginMarketItem, working = false): TextColor {
  if (working) {
    return "yellow";
  }
  if (plugin.installed && plugin.has_update) {
    return "yellow";
  }
  if (plugin.installed) {
    return "gray";
  }
  return "green";
}

function componentLabel(component: PluginComponent): string {
  return String(
    component.command ||
      component.title ||
      component.name ||
      component.handler_name ||
      component.page_name ||
      "-",
  );
}

function componentTypeLabel(component: PluginComponent, i18n: I18n): string {
  const type = String(component.type || "component");
  if (type === "llm_tool") {
    return i18n.t("tui.plugins.componentType.tool", "tool");
  }
  if (type === "command") {
    return i18n.t("tui.plugins.componentType.command", "command");
  }
  if (type === "page") {
    return i18n.t("tui.plugins.componentType.page", "page");
  }
  if (type === "skill") {
    return i18n.t("tui.plugins.componentType.skill", "skill");
  }
  if (type === "component") {
    return i18n.t("tui.plugins.componentType.component", "component");
  }
  return type;
}

function componentTypeColor(component: PluginComponent): TextColor {
  const type = String(component.type || "");
  if (type === "command") {
    return "green";
  }
  if (type === "llm_tool" || type === "tool") {
    return "yellow";
  }
  if (type === "page") {
    return "blue";
  }
  if (type === "skill") {
    return "magenta";
  }
  return "gray";
}

function pluginActionLabel(action: PluginAction | PluginDetailAction, i18n: I18n): string {
  if (action === "switch") {
    return i18n.t("tui.plugins.action.onOff", "on/off");
  }
  if (action === "reload") {
    return i18n.t("tui.plugins.action.reload", "reload");
  }
  if (action === "update") {
    return i18n.t("tui.plugins.action.update", "update");
  }
  return i18n.t("tui.plugins.action.delete", "X");
}

function listBorderColor(pluginTab: PluginTab, pluginPane: PluginPane): TextColor {
  if (pluginTab === "market") {
    return pluginPane === "market" ? "cyan" : "gray";
  }
  return pluginPane === "list" ? "cyan" : "gray";
}

function detailBorderColor(pluginTab: PluginTab, pluginPane: PluginPane): TextColor {
  if (pluginTab === "market") {
    return pluginPane === "marketActions" ? "cyan" : "gray";
  }
  return pluginPane === "actions" || pluginPane === "components" || pluginPane === "config" ? "cyan" : "gray";
}

function marketPluginKey(plugin: PluginMarketItem): string {
  return String(plugin.repo || plugin.name || plugin.download_url || "");
}

function pluginFooterLine({
  pluginTab,
  pluginPane,
  selectedPlugin,
  selectedMarketPlugin,
  selectedPluginAction,
  selectedPluginDetailAction,
  selectedComponent,
  pendingPluginDeleteName,
  workingPluginName,
  workingMarketPluginName,
  i18n,
}: {
  pluginTab: PluginTab;
  pluginPane: PluginPane;
  selectedPlugin: PluginItem | null;
  selectedMarketPlugin: PluginMarketItem | null;
  selectedPluginAction: PluginAction;
  selectedPluginDetailAction: PluginDetailAction;
  selectedComponent: PluginComponent | null;
  pendingPluginDeleteName: string | null;
  workingPluginName: string | null;
  workingMarketPluginName: string | null;
  i18n: I18n;
}): string {
  if (pluginPane === "tabs") {
    return i18n.t(
      "tui.plugins.help.tabs",
      "Left/Right moves across the top row. Down or Enter opens the selected tab.",
    );
  }
  if (pluginTab === "market") {
    if (!selectedMarketPlugin) {
      return i18n.t(
        "tui.plugins.help.marketEmpty",
        "Search filters the market. Enter opens the search box.",
      );
    }
    if (pluginPane === "marketSearch") {
      return i18n.t(
        "tui.plugins.help.marketSearch",
        "Enter opens search. Left returns to tabs. Down opens results.",
      );
    }
    if (workingMarketPluginName === marketPluginKey(selectedMarketPlugin)) {
      return formatI18n(
        i18n,
        "tui.plugins.help.workingOn",
        "Working on {name}...",
        { name: selectedMarketPlugin.name },
      );
    }
    if (pluginPane === "marketActions") {
      return formatI18n(
        i18n,
        "tui.plugins.help.marketActions",
        "{name}  Up/Down scrolls detail. Enter: {action}. Left returns to list.",
        {
          name: selectedMarketPlugin.name,
          action: marketActionLabel(selectedMarketPlugin, i18n),
        },
      );
    }
    return formatI18n(
      i18n,
      "tui.plugins.help.marketList",
      "{name}  Right selects {action}, Enter opens action. Up returns to tabs.",
      {
        name: selectedMarketPlugin.name,
        action: marketActionLabel(selectedMarketPlugin, i18n),
      },
    );
  }
  if (!selectedPlugin) {
    return i18n.t("tui.plugins.selectPlugin", "Select a plugin.");
  }
  if (workingPluginName === selectedPlugin.name) {
    return formatI18n(
      i18n,
      "tui.plugins.help.workingOn",
      "Working on {name}...",
      { name: selectedPlugin.name },
    );
  }
  if (pendingPluginDeleteName === selectedPlugin.name) {
    return formatI18n(
      i18n,
      "tui.plugins.help.confirmUninstall",
      "Press Enter again to uninstall {name}.",
      { name: selectedPlugin.name },
    );
  }
  if (pluginPane === "actions") {
    return formatI18n(
      i18n,
      "tui.plugins.help.actions",
      "{name}  Enter: {action}. Left returns to list, Down opens components.",
      {
        name: selectedPlugin.name,
        action: pluginActionLabel(selectedPluginDetailAction, i18n),
      },
    );
  }
  if (pluginPane === "components") {
    return selectedComponent
      ? formatI18n(
          i18n,
          "tui.plugins.help.componentSelected",
          "{type} {name}  Down opens config, Left returns to list.",
          {
            type: componentTypeLabel(selectedComponent, i18n),
            name: componentLabel(selectedComponent),
          },
        )
      : i18n.t(
          "tui.plugins.help.components",
          "Down opens config, Left returns to list.",
        );
  }
  if (pluginPane === "config") {
    return formatI18n(
      i18n,
      "tui.plugins.help.config",
      "{name} config  Enter changes selected field. Up returns to components, Left returns to list.",
      { name: selectedPlugin.name },
    );
  }
  return formatI18n(
    i18n,
    "tui.plugins.help.list",
    "{name}  Enter: {action}. Right past X opens actions, Up returns to tabs.",
    {
      name: selectedPlugin.name,
      action: pluginActionLabel(selectedPluginAction, i18n),
    },
  );
}

function formatI18n(
  i18n: I18n,
  key: string,
  fallback: string,
  values: Record<string, string | number>,
): string {
  return i18n.t(key, fallback).replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}
