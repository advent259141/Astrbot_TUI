import type {
  ChatRecord,
  ChatSession,
  CommandItem,
  LiveLogPayload,
  RuntimeStats,
  VersionPayload,
} from "../api/types.js";
import { textFromParts } from "../api/messages.js";
import type { I18n } from "../i18n/index.js";
import { terminalWidth, textCells, truncateCells } from "./terminal.js";

export function sessionTitle(session: ChatSession): string {
  return (
    session.display_name?.trim() ||
    `${session.platform_id || "webchat"}:${session.session_id.slice(0, 8)}`
  );
}

export function formatMessage(record: ChatRecord, i18n?: I18n): string[] {
  const role = record.content.type === "user"
    ? t(i18n, "features.chat.message.user", "User")
    : t(i18n, "features.chat.message.assistant", "Assistant");
  const body = textFromParts(record.content.message).trim() || " ";
  return [`${role}: ${body}`];
}

export function formatLog(log: LiveLogPayload): string {
  const level = String(log.level || "INFO").toUpperCase();
  const rawMessage =
    log.message ??
    log.data ??
    log.msg ??
    log.content ??
    "";
  const message = stripAnsi(String(rawMessage)).trim();
  return message || `[${level}]`;
}

export function formatRuntime(
  stats: RuntimeStats | null,
  version: VersionPayload | null,
  i18n?: I18n,
): string[] {
  const lines: string[] = [];
  if (version?.version) {
    lines.push(`AstrBot v${version.version}`);
  }
  if (version?.dashboard_version) {
    lines.push(`${t(i18n, "core.navigation.dashboard", "Dashboard")} ${version.dashboard_version}`);
  }
  if (stats) {
    lines.push(`${t(i18n, "features.stats.overviewCards.messageCount.label", "Messages")} ${stats.message_count ?? 0}`);
    lines.push(`${t(i18n, "core.navigation.platforms", "Platforms")} ${stats.platform_count ?? 0}  ${t(i18n, "core.navigation.extension", "Extensions")} ${stats.plugin_count ?? 0}`);
    lines.push(`${t(i18n, "features.stats.overviewCards.cpu.label", "CPU")} ${stats.cpu_percent ?? 0}%  ${t(i18n, "tui.status.cards.threads", "Threads")} ${stats.thread_count ?? 0}`);
    if (stats.memory) {
      lines.push(`${t(i18n, "features.stats.overviewCards.memory.label", "Memory")} ${stats.memory.process ?? 0} / ${stats.memory.system ?? 0} ${t(i18n, "features.stats.units.mb", "MB")}`);
    }
    if (stats.running) {
      lines.push(
        `${t(i18n, "features.stats.overviewCards.uptime.label", "Uptime")} ${stats.running.hours ?? 0}${t(i18n, "features.stats.units.hoursShort", "h")} ${stats.running.minutes ?? 0}${t(i18n, "features.stats.units.minutesShort", "m")} ${stats.running.seconds ?? 0}${t(i18n, "features.stats.units.secondsShort", "s")}`,
      );
    }
  }
  return lines;
}

export function formatCommand(command: CommandItem, i18n?: I18n): string {
  const name = String(command.command_name || command.name || command.handler_full_name);
  const marker = command.enabled ? "on " : "off";
  const conflict = command.has_conflict
    ? ` ${t(i18n, "features.command.status.conflict", "conflict")}`
    : "";
  return `${marker} ${name}${conflict}`;
}

export function truncate(value: string, width: number): string {
  if (width <= 0) {
    return "";
  }
  if (terminalWidth(value) <= width) {
    return value;
  }
  if (width <= 3) {
    return ".".repeat(width);
  }
  return `${truncateCells(value, width - 3)}...`;
}

export function wrapText(value: string, width: number): string[] {
  if (width <= 0) return [""];
  const lines: string[] = [];
  for (const paragraph of value.split("\n")) {
    let line = "";
    let used = 0;
    for (const cell of textCells(paragraph)) {
      if (used + cell.width > width && line) {
        lines.push(line);
        line = "";
        used = 0;
      }
      line += cell.segment;
      used += cell.width;
    }
    lines.push(line);
  }
  return lines;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function t(i18n: I18n | undefined, key: string, fallback: string): string {
  return i18n?.t(key, fallback) ?? fallback;
}
