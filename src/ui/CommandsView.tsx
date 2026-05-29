import React from "react";
import { Box, Text } from "ink";
import type { CommandItem, ToolItem } from "../api/types.js";
import type { I18n } from "../i18n/index.js";
import { truncate } from "./format.js";
import {
  padRightCells,
  terminalWidth,
  truncateCells,
} from "./terminal.js";

export type ComponentsView = "commands" | "tools";
type TextColor = "cyan" | "green" | "yellow" | "red" | "magenta" | "blue" | "gray";

const COMPONENT_STATE_WIDTH = 6;
const COMPONENT_HEADER_STATE_WIDTH = 2 + COMPONENT_STATE_WIDTH;

export function CommandsView({
  i18n,
  width,
  componentSummary,
  commandMeta,
  componentsView,
  visibleCommands,
  visibleTools,
  commandWindowStart,
  toolWindowStart,
  selectedCommandIndex,
  selectedToolIndex,
  selectedCommand,
  selectedTool,
}: {
  i18n?: I18n;
  width: number;
  componentSummary: string;
  commandMeta: string;
  componentsView: ComponentsView;
  visibleCommands: CommandItem[];
  visibleTools: ToolItem[];
  commandWindowStart: number;
  toolWindowStart: number;
  selectedCommandIndex: number;
  selectedToolIndex: number;
  selectedCommand: CommandItem | null;
  selectedTool: ToolItem | null;
}) {
  return (
    <>
      <Box height={1} flexShrink={0} justifyContent="space-between">
        <Text bold>{componentSummary}</Text>
        <Text dimColor>{commandMeta}</Text>
      </Box>
      <Box height={1} flexShrink={0}>
        <Text
          color={componentsView === "commands" ? "cyan" : undefined}
          inverse={componentsView === "commands"}
        >
          {` ${t(i18n, "core.navigation.commands", "Commands")} `}
        </Text>
        <Text
          color={componentsView === "tools" ? "cyan" : undefined}
          inverse={componentsView === "tools"}
        >
          {` ${t(i18n, "features.tool-use.functionTools.title", "Function Tools")} `}
        </Text>
        <Text dimColor>{`  ${t(i18n, "tui.commands.leftRightSwitch", "Left/Right switch")}`}</Text>
      </Box>
      <Box height={1} flexShrink={0}>
        {componentsView === "commands" ? (
          <Text dimColor>
            {formatCommandHeader(width, i18n)}
          </Text>
        ) : (
          <Text dimColor>
            {formatToolHeader(width, i18n)}
          </Text>
        )}
      </Box>
      {componentsView === "commands" && visibleCommands.length ? (
        visibleCommands.map((command, index) => {
          const commandIndex = commandWindowStart + index;
          const isSelected = commandIndex === selectedCommandIndex;
          const cells = formatCommandCells(command, {
            isSelected,
            i18n,
            width,
          });
          return (
            <Box
              key={command.handler_full_name}
              width={width}
              height={1}
              flexShrink={0}
            >
              <Text color={isSelected ? "cyan" : undefined} inverse={isSelected}>
                {cells.marker}
              </Text>
              <Text
                color={isSelected ? "cyan" : commandStateColor(command)}
                inverse={isSelected}
              >
                {cells.state}
              </Text>
              <Text color={isSelected ? "cyan" : command.enabled ? undefined : "gray"} inverse={isSelected}>
                {cells.type}
              </Text>
              <Text color={isSelected ? "cyan" : command.enabled ? undefined : "gray"} inverse={isSelected}>
                {cells.plugin}
              </Text>
              <Text
                color={
                  isSelected
                    ? "cyan"
                    : command.has_conflict
                      ? "yellow"
                      : command.enabled
                        ? undefined
                        : "gray"
                }
                inverse={isSelected}
              >
                {cells.command}
              </Text>
            </Box>
          );
        })
      ) : componentsView === "tools" && visibleTools.length ? (
        visibleTools.map((tool, index) => {
          const toolIndex = toolWindowStart + index;
          const isSelected = toolIndex === selectedToolIndex;
          const cells = formatToolCells(tool, {
            isSelected,
            i18n,
            width,
          });
          return (
            <Box key={tool.name} width={width} height={1} flexShrink={0}>
              <Text color={isSelected ? "cyan" : undefined} inverse={isSelected}>
                {cells.marker}
              </Text>
              <Text
                color={isSelected ? "cyan" : toolStateColor(tool)}
                inverse={isSelected}
              >
                {cells.state}
              </Text>
              <Text color={isSelected ? "cyan" : tool.active ? undefined : "gray"} inverse={isSelected}>
                {cells.origin}
              </Text>
              <Text color={isSelected ? "cyan" : tool.active ? undefined : "gray"} inverse={isSelected}>
                {cells.source}
              </Text>
              <Text color={isSelected ? "cyan" : tool.active ? undefined : "gray"} inverse={isSelected}>
                {cells.name}
              </Text>
            </Box>
          );
        })
      ) : (
        <Text dimColor>
          {componentsView === "commands"
            ? t(i18n, "tui.commands.loadingCommandStatus", "Loading command status.")
            : t(i18n, "tui.commands.loadingFunctionTools", "Loading function tools.")}
        </Text>
      )}
      <Box height={1} flexShrink={0}>
        <Text dimColor>
          {truncate(
            componentsView === "tools"
              ? selectedTool
                ? toolDetailLine(selectedTool, i18n)
                : t(i18n, "tui.commands.help.toggleTool", "Enter toggles selected tool.")
              : selectedCommand
                ? commandDetailLine(selectedCommand, i18n)
                : t(i18n, "tui.commands.help.toggleCommand", "Enter toggles selected command."),
            width,
          )}
        </Text>
      </Box>
    </>
  );
}

function formatCommandHeader(width: number, i18n?: I18n): string {
  const layout = commandTableLayout(width);
  const state = t(i18n, "tui.commands.header.stateShort", "S");
  const type = t(i18n, "features.command.table.headers.type", "Type");
  const plugin = t(i18n, "features.command.table.headers.plugin", "Plugin");
  const command = t(i18n, "features.command.table.headers.command", "Command");
  if (layout.compact) {
    return truncateCells(`  ${state}  ${type}  ${command}`, width);
  }
  return truncateCells(
    `${padRightCells(`  ${state}`, COMPONENT_HEADER_STATE_WIDTH)}${padRightCells(type, layout.typeWidth)}${padRightCells(plugin, layout.pluginWidth)}${command}`,
    width,
  );
}

function formatCommandCells(
  command: CommandItem,
  options: { isSelected: boolean; i18n?: I18n; width: number },
): {
  marker: string;
  state: string;
  type: string;
  plugin: string;
  command: string;
} {
  const marker = `${options.isSelected ? ">" : " "} `;
  const state = command.has_conflict
    ? t(options.i18n, "tui.commands.state.conflict", "!")
    : command.enabled
      ? t(options.i18n, "tui.common.on", "on")
      : t(options.i18n, "tui.common.off", "off");
  const type = commandTypeLabel(command, options.i18n);
  const plugin = commandPluginLabel(command);
  const commandName = commandDisplayName(command);
  const suffix = commandSuffix(command, options.i18n);
  const layout = commandTableLayout(options.width);
  if (layout.compact) {
    const stateCell = padRightCells(state, COMPONENT_STATE_WIDTH);
    const typeCell = padRightCells(type, 7);
    const commandWidth = Math.max(
      1,
      options.width
        - terminalWidth(marker)
        - terminalWidth(stateCell)
        - terminalWidth(typeCell),
    );
    return {
      marker,
      state: stateCell,
      type: typeCell,
      plugin: "",
      command: truncateCells(`${commandName}${suffix}`, commandWidth),
    };
  }

  const stateCell = padRightCells(state, COMPONENT_STATE_WIDTH);
  const typeCell = padRightCells(type, layout.typeWidth);
  const pluginCell = padRightCells(plugin, layout.pluginWidth);
  const commandWidth = Math.max(
    1,
    options.width
      - terminalWidth(marker)
      - terminalWidth(stateCell)
      - terminalWidth(typeCell)
      - terminalWidth(pluginCell),
  );
  return {
    marker,
    state: stateCell,
    type: typeCell,
    plugin: pluginCell,
    command: truncateCells(`${commandName}${suffix}`, commandWidth),
  };
}

function commandStateColor(command: CommandItem): TextColor {
  if (command.has_conflict) {
    return "yellow";
  }
  if (!command.enabled) {
    return "red";
  }
  return "green";
}

function formatToolHeader(width: number, i18n?: I18n): string {
  const layout = toolTableLayout(width);
  const state = t(i18n, "tui.commands.header.stateShort", "S");
  const origin = t(i18n, "features.tool-use.functionTools.table.origin", "Origin");
  const source = t(i18n, "features.extension.market.source", "Source");
  const tool = t(i18n, "features.tool-use.functionTools.title", "Function Tools");
  if (layout.compact) {
    return truncateCells(`  ${state}  ${origin}  ${tool}`, width);
  }
  return truncateCells(
    `${padRightCells(`  ${state}`, COMPONENT_HEADER_STATE_WIDTH)}${padRightCells(origin, layout.originWidth)}${padRightCells(source, layout.sourceWidth)}${tool}`,
    width,
  );
}

function formatToolCells(
  tool: ToolItem,
  options: { isSelected: boolean; i18n?: I18n; width: number },
): {
  marker: string;
  state: string;
  origin: string;
  source: string;
  name: string;
} {
  const marker = `${options.isSelected ? ">" : " "} `;
  const state = tool.readonly
    ? t(options.i18n, "tui.common.readonlyShort", "ro")
    : tool.active
      ? t(options.i18n, "tui.common.on", "on")
      : t(options.i18n, "tui.common.off", "off");
  const layout = toolTableLayout(options.width);
  if (layout.compact) {
    const stateCell = padRightCells(state, COMPONENT_STATE_WIDTH);
    const originCell = padRightCells(toolOriginLabel(tool, options.i18n), 8);
    const nameWidth = Math.max(
      1,
      options.width
        - terminalWidth(marker)
        - terminalWidth(stateCell)
        - terminalWidth(originCell),
    );
    return {
      marker,
      state: stateCell,
      origin: originCell,
      source: "",
      name: truncateCells(tool.name, nameWidth),
    };
  }

  const stateCell = padRightCells(state, COMPONENT_STATE_WIDTH);
  const originCell = padRightCells(toolOriginLabel(tool, options.i18n), layout.originWidth);
  const sourceCell = padRightCells(tool.origin_name || "-", layout.sourceWidth);
  const nameWidth = Math.max(
    1,
    options.width
      - terminalWidth(marker)
      - terminalWidth(stateCell)
      - terminalWidth(originCell)
      - terminalWidth(sourceCell),
  );
  return {
    marker,
    state: stateCell,
    origin: originCell,
    source: sourceCell,
    name: truncateCells(tool.name, nameWidth),
  };
}

function toolTableLayout(width: number): {
  compact: boolean;
  originWidth: number;
  sourceWidth: number;
} {
  if (width < 72) {
    return { compact: true, originWidth: 0, sourceWidth: 0 };
  }
  return {
    compact: false,
    originWidth: 10,
    sourceWidth: Math.max(24, Math.min(44, Math.floor(width * 0.34))),
  };
}

function toolOriginLabel(tool: ToolItem, i18n?: I18n): string {
  if (tool.origin === "builtin") {
    return t(i18n, "tui.commands.origin.builtin", "builtin");
  }
  if (tool.origin === "plugin") {
    return t(i18n, "tui.commands.origin.plugin", "plugin");
  }
  if (tool.origin === "mcp") {
    return t(i18n, "tui.commands.origin.mcp", "mcp");
  }
  return tool.origin || "-";
}

function toolStateColor(tool: ToolItem): TextColor {
  if (tool.readonly) {
    return "gray";
  }
  return tool.active ? "green" : "red";
}

function toolDetailLine(tool: ToolItem, i18n?: I18n): string {
  const readonly = tool.readonly ? ` ${t(i18n, "features.tool-use.functionTools.table.readonly", "Read-only")}` : "";
  const params = Object.keys(tool.parameters?.properties || {}).length;
  const description = tool.description ? ` - ${tool.description}` : "";
  return `${tool.name} ${t(i18n, "tui.common.from", "from")} ${tool.origin_name || tool.origin || "-"}${readonly} ${t(i18n, "tui.commands.detail.params", "params")}: ${params}${description}`;
}

function commandTableLayout(width: number): {
  compact: boolean;
  typeWidth: number;
  pluginWidth: number;
} {
  if (width < 72) {
    return { compact: true, typeWidth: 0, pluginWidth: 0 };
  }
  return {
    compact: false,
    typeWidth: 11,
    pluginWidth: Math.max(24, Math.min(46, Math.floor(width * 0.36))),
  };
}

function commandDisplayName(command: CommandItem): string {
  const effective = String(command.effective_command || "").trim();
  if (effective) {
    return effective.startsWith("/") ? effective : `/${effective}`;
  }
  return String(command.command_name || command.name || command.current_fragment || "-");
}

function commandPluginLabel(command: CommandItem): string {
  const display = String(command.plugin_display_name || command.plugin || "").trim();
  if (display) {
    return display;
  }
  const modulePath = String(command.module_path || command.handler_full_name || "");
  const parts = modulePath.split(".");
  const pluginsIndex = parts.lastIndexOf("plugins");
  if (pluginsIndex >= 0 && parts[pluginsIndex + 1]) {
    return parts[pluginsIndex + 1];
  }
  const builtinIndex = parts.indexOf("builtin_stars");
  if (builtinIndex >= 0 && parts[builtinIndex + 1]) {
    return parts[builtinIndex + 1];
  }
  return "-";
}

function commandTypeLabel(command: CommandItem, i18n?: I18n): string {
  if (command.type === "group" || command.is_group) {
    const count = command.sub_commands?.length;
    return count
      ? `${t(i18n, "tui.commands.type.group", "group")}(${count})`
      : t(i18n, "tui.commands.type.group", "group");
  }
  if (command.type === "sub_command") {
    return t(i18n, "tui.commands.type.sub", "sub");
  }
  return t(i18n, "tui.commands.type.commandShort", "cmd");
}

function commandSuffix(command: CommandItem, i18n?: I18n): string {
  const parts = [
    command.has_conflict ? t(i18n, "features.command.status.conflict", "conflict") : "",
    command.permission && command.permission !== "everyone" ? command.permission : "",
    command.reserved ? t(i18n, "features.extension.status.system", "system") : "",
  ].filter(Boolean);
  return parts.length ? `  [${parts.join(", ")}]` : "";
}

function commandDetailLine(command: CommandItem, i18n?: I18n): string {
  const aliases = command.aliases?.length
    ? ` ${t(i18n, "features.command.dialogs.details.aliases", "aliases")}: ${command.aliases.join(", ")}`
    : "";
  const description = command.description ? ` - ${command.description}` : "";
  return `${commandDisplayName(command)} ${t(i18n, "tui.common.from", "from")} ${commandPluginLabel(command)}${description}${aliases}`;
}

function t(i18n: I18n | undefined, key: string, fallback: string): string {
  return i18n?.t(key, fallback) ?? fallback;
}
