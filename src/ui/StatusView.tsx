import React from "react";
import { Box, Text } from "ink";
import type {
  ProviderTokenStats,
  RuntimeStats,
  TokenRange,
  VersionPayload,
} from "../api/types.js";
import type { I18n } from "../i18n/index.js";
import { truncate } from "./format.js";
import {
  padLeftCells,
  padRightCells,
} from "./terminal.js";

type TextColor = "cyan" | "green" | "yellow" | "red" | "magenta" | "blue" | "gray";

export interface StatSample {
  timestamp: number;
  cpuPercent: number;
  memoryPercent: number;
  memoryProcessMb: number;
  memorySystemMb: number;
  threadCount: number;
  messageCount: number;
}

export interface StatusLine {
  text: string;
  color?: TextColor;
  bold?: boolean;
  dimColor?: boolean;
}

interface StatusCard {
  label: string;
  value: string;
  note: string;
}

export function StatusView({
  i18n,
  lines,
  scrollOffset,
  maxScrollOffset,
  width,
}: {
  i18n?: I18n;
  lines: StatusLine[];
  scrollOffset: number;
  maxScrollOffset: number;
  width: number;
}) {
  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{t(i18n, "features.stats.header.title", "System Stats")}</Text>
        <Text dimColor>
          {scrollOffset > 0
            ? `${t(i18n, "tui.common.scroll", "scroll")} ${scrollOffset}/${maxScrollOffset}`
            : t(i18n, "tui.status.help.rangeScroll", "Left/Right range  PageUp/PageDown scroll")}
        </Text>
      </Box>
      {lines.map((line, index) => (
        <Text
          key={`${scrollOffset}-${index}-${line.text}`}
          color={line.color}
          bold={line.bold}
          dimColor={line.dimColor}
        >
          {truncate(line.text, width)}
        </Text>
      ))}
    </>
  );
}

export function buildStatusLines({
  i18n,
  stats,
  providerStats,
  version,
  width,
  tokenRange,
  updatedAt,
}: {
  i18n?: I18n;
  stats: RuntimeStats | null;
  providerStats: ProviderTokenStats | null;
  version: VersionPayload | null;
  width: number;
  tokenRange: TokenRange;
  updatedAt: Date | null;
}): StatusLine[] {
  const safeWidth = Math.max(36, width);
  const rangeLabel = formatRangeLabel(tokenRange, i18n);
  const wide = safeWidth >= 110;
  const leftWidth = wide ? Math.floor(safeWidth * 0.58) : safeWidth;
  const rightWidth = wide ? safeWidth - leftWidth - 3 : safeWidth;
  const chartWidth = Math.max(18, Math.min(56, leftWidth - 12));
  const cards: StatusCard[] = [
    {
      label: t(i18n, "features.stats.overviewCards.platformCount.label", "Platform instances"),
      value: formatNumber(stats?.platform_count ?? 0),
      note: t(i18n, "features.stats.overviewCards.platformCount.note", "Configured and currently running platform instances"),
    },
    {
      label: t(i18n, "features.stats.overviewCards.messageCount.label", "Message count"),
      value: formatNumber(stats?.message_count ?? 0),
      note: t(i18n, "features.stats.overviewCards.messageCount.note", "Total accumulated messages"),
    },
    {
      label: t(i18n, "features.stats.overviewCards.todayModelCalls.label", "Today model calls"),
      value: formatCompactNumber(providerStats?.today_total_tokens ?? 0),
      note: t(i18n, "features.stats.modelTotal.callCount", "{count} calls", {
        count: formatNumber(providerStats?.today_total_calls ?? 0),
      }),
    },
    {
      label: t(i18n, "features.stats.overviewCards.cpu.label", "CPU"),
      value: formatPercent(Number(stats?.cpu_percent ?? 0)),
      note: t(i18n, "features.stats.overviewCards.cpu.note", "AstrBot CPU usage"),
    },
    {
      label: t(i18n, "features.stats.overviewCards.memory.label", "Process memory"),
      value: formatMemory(Number(stats?.memory?.process ?? 0), i18n),
      note: t(i18n, "features.stats.overviewCards.memory.note", "System memory {systemMemory}", {
        systemMemory: formatMemory(Number(stats?.memory?.system ?? 0), i18n),
      }),
    },
    {
      label: t(i18n, "features.stats.overviewCards.uptime.label", "Uptime"),
      value: formatRunningTime(stats?.running, i18n),
      note: t(i18n, "features.stats.overviewCards.uptime.note", "Started at {startTime}", {
        startTime: formatDateTimeSec(stats?.start_time ?? 0, i18n),
      }),
    },
  ];

  const messageChart = renderBarChart(
    (stats?.message_time_series ?? []).map(([timestamp, value]) => ({
      label: formatHour(timestamp, false, i18n),
      value: Number(value ?? 0),
    })),
    chartWidth,
    Math.min(12, Math.max(4, Math.floor(chartWidth / 6))),
    i18n,
  );
  const platformRanking = [...(stats?.platform ?? [])]
    .sort((left, right) => Number(right.count ?? 0) - Number(left.count ?? 0))
    .slice(0, 8)
    .map((item) => ({ label: item.name || t(i18n, "tui.common.unknown", "unknown"), value: Number(item.count ?? 0) }));
  const tokenChart = renderBarChart(
    (providerStats?.trend.total_series ?? []).map(([timestamp, value]) => ({
      label: formatHourMs(timestamp, i18n),
      value: Number(value ?? 0),
    })),
    chartWidth,
    Math.min(12, Math.max(4, Math.floor(chartWidth / 6))),
    i18n,
  );
  const providerRanking = (providerStats?.range_by_provider ?? [])
    .slice(0, 8)
    .map((item) => ({ label: item.provider_id || t(i18n, "tui.common.unknown", "unknown"), value: Number(item.tokens ?? 0) }));
  const sessionRanking = (providerStats?.range_by_umo ?? [])
    .slice(0, 8)
    .map((item) => ({ label: item.umo || t(i18n, "tui.common.unknown", "unknown"), value: Number(item.tokens ?? 0) }));

  const lines: StatusLine[] = [
    {
      text: `${t(i18n, "features.stats.header.subtitle", "A unified view of platforms, messages, and model calls.")} ${t(i18n, "tui.status.updated", "Updated")} ${formatTime(updatedAt, i18n)}. ${t(i18n, "tui.status.rangeLabel", "Range")} ${rangeLabel}`,
      dimColor: true,
    },
    { text: "" },
    ...renderCardGrid(cards, safeWidth),
    { text: "" },
    sectionTitle(
      t(i18n, "features.stats.messageOverview.title", "Message Overview"),
      t(i18n, "features.stats.messageOverview.subtitle", "Robot message statistics"),
    ),
  ];

  if (wide) {
    lines.push(
      ...renderTwoColumns(
        messageChart,
        renderRanking(
          platformRanking,
          rightWidth,
          t(i18n, "features.stats.platformRanking.title", "Platform message ranking"),
          i18n,
        ),
        leftWidth,
        rightWidth,
      ),
    );
  } else {
    lines.push(
      ...messageChart,
      { text: "" },
      ...renderRanking(
        platformRanking,
        safeWidth,
        t(i18n, "features.stats.platformRanking.title", "Platform message ranking"),
        i18n,
      ),
    );
  }

  lines.push(
    { text: "" },
    sectionTitle(
      t(i18n, "features.stats.modelCalls.title", "Model Calls"),
      t(i18n, "features.stats.modelCalls.subtitle", "Model call statistics"),
    ),
  );
  if (wide) {
    lines.push(
      ...renderTwoColumns(
        tokenChart,
        renderModelSummary(providerStats, version, rightWidth, i18n),
        leftWidth,
        rightWidth,
      ),
    );
  } else {
    lines.push(...tokenChart, { text: "" }, ...renderModelSummary(providerStats, version, safeWidth, i18n));
  }

  lines.push(
    { text: "" },
    sectionTitle(
      t(i18n, "tui.status.sections.rankings", "Rankings"),
      t(i18n, "features.stats.modelRanking.subtitle", "Ranked by model call tokens"),
    ),
  );
  if (wide) {
    lines.push(
      ...renderTwoColumns(
        renderRanking(
          providerRanking,
          leftWidth,
          t(i18n, "features.stats.modelRanking.title", "{range} model call ranking", { range: rangeLabel }),
          i18n,
        ),
        renderRanking(
          sessionRanking,
          rightWidth,
          t(i18n, "features.stats.sessionRanking.title", "{range} session token top 10", { range: rangeLabel }),
          i18n,
        ),
        leftWidth,
        rightWidth,
      ),
    );
  } else {
    lines.push(
      ...renderRanking(
        providerRanking,
        safeWidth,
        t(i18n, "features.stats.modelRanking.title", "{range} model call ranking", { range: rangeLabel }),
        i18n,
      ),
      { text: "" },
      ...renderRanking(
        sessionRanking,
        safeWidth,
        t(i18n, "features.stats.sessionRanking.title", "{range} session token top 10", { range: rangeLabel }),
        i18n,
      ),
    );
  }

  return lines.map((line) => ({ ...line, text: truncate(line.text, safeWidth) }));
}

export function statSampleFromStats(stats: RuntimeStats): StatSample {
  const memoryProcessMb = Number(stats.memory?.process ?? 0);
  const memorySystemMb = Number(stats.memory?.system ?? 0);
  return {
    timestamp: Date.now(),
    cpuPercent: clampPercent(Number(stats.cpu_percent ?? 0)),
    memoryPercent: memorySystemMb > 0
      ? clampPercent((memoryProcessMb / memorySystemMb) * 100)
      : 0,
    memoryProcessMb,
    memorySystemMb,
    threadCount: Number(stats.thread_count ?? 0),
    messageCount: Number(stats.message_count ?? 0),
  };
}

function sectionTitle(title: string, subtitle: string): StatusLine {
  return {
    text: `${title} - ${subtitle}`,
    bold: true,
    color: "cyan",
  };
}

function renderCardGrid(cards: StatusCard[], width: number): StatusLine[] {
  const columns = width >= 112 ? 3 : width >= 74 ? 2 : 1;
  const cardWidth = Math.max(22, Math.floor((width - (columns - 1) * 2) / columns));
  const lines: StatusLine[] = [];
  for (let index = 0; index < cards.length; index += columns) {
    const row = cards.slice(index, index + columns);
    lines.push({ text: row.map((card) => padRight(card.label, cardWidth)).join("  "), dimColor: true });
    lines.push({ text: row.map((card) => padRight(card.value, cardWidth)).join("  "), bold: true, color: "cyan" });
    lines.push({ text: row.map((card) => padRight(card.note, cardWidth)).join("  "), dimColor: true });
    if (index + columns < cards.length) {
      lines.push({ text: "" });
    }
  }
  return lines;
}

function renderTwoColumns(
  left: StatusLine[],
  right: StatusLine[],
  leftWidth: number,
  rightWidth: number,
): StatusLine[] {
  const length = Math.max(left.length, right.length);
  return Array.from({ length }, (_, index) => {
    const leftLine = left[index];
    const rightLine = right[index];
    return {
      text: `${padRight(leftLine?.text ?? "", leftWidth)}   ${truncate(rightLine?.text ?? "", rightWidth)}`,
      color: leftLine?.color ?? rightLine?.color,
      bold: Boolean(leftLine?.bold || rightLine?.bold),
      dimColor: Boolean((leftLine?.dimColor ?? false) && (rightLine?.dimColor ?? false)),
    };
  });
}

function renderBarChart(
  points: Array<{ label: string; value: number }>,
  width: number,
  maxBars: number,
  i18n?: I18n,
): StatusLine[] {
  const visible = points.slice(-maxBars);
  if (!visible.length) {
    return [{ text: t(i18n, "tui.status.noTrendData", "No trend data yet."), dimColor: true }];
  }
  const max = Math.max(...visible.map((point) => point.value), 1);
  const labelWidth = Math.max(5, Math.max(...visible.map((point) => point.label.length)));
  const barWidth = Math.max(8, width - labelWidth - 12);
  return visible.map((point) => {
    const filled = Math.round((point.value / max) * barWidth);
    return {
      text: `${padLeft(point.label, labelWidth)} | ${"#".repeat(filled)}${"-".repeat(barWidth - filled)} ${formatCompactNumber(point.value)}`,
      color: point.value > 0 ? "green" : "gray",
    };
  });
}

function renderRanking(
  items: Array<{ label: string; value: number }>,
  width: number,
  title: string,
  i18n?: I18n,
): StatusLine[] {
  const lines: StatusLine[] = [{ text: title, bold: true }];
  if (!items.length) {
    lines.push({ text: t(i18n, "tui.status.noRankingData", "No ranking data yet."), dimColor: true });
    return lines;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  const barWidth = Math.max(6, Math.min(18, width - 28));
  items.forEach((item, index) => {
    const filled = Math.round((item.value / max) * barWidth);
    const labelWidth = Math.max(8, width - barWidth - 14);
    lines.push({
      text: `${String(index + 1).padStart(2, " ")} ${padRight(item.label, labelWidth)} ${"#".repeat(filled)}${"-".repeat(barWidth - filled)} ${formatCompactNumber(item.value)}`,
    });
  });
  return lines;
}

function renderModelSummary(
  providerStats: ProviderTokenStats | null,
  version: VersionPayload | null,
  width: number,
  i18n?: I18n,
): StatusLine[] {
  const lines: StatusLine[] = [
    { text: t(i18n, "tui.status.model.total", "Model total"), bold: true },
    { text: `${formatNumber(providerStats?.range_total_tokens ?? 0)} ${t(i18n, "features.stats.units.tokens", "tokens")}`, bold: true, color: "magenta" },
    { text: t(i18n, "features.stats.modelTotal.callCount", "{count} calls", { count: formatNumber(providerStats?.range_total_calls ?? 0) }), dimColor: true },
    { text: `${padRight(t(i18n, "features.stats.modelTotal.avgTtft", "Avg TTFT"), 15)}${formatDurationMs(providerStats?.range_avg_ttft_ms ?? 0, i18n)}` },
    { text: `${padRight(t(i18n, "features.stats.modelTotal.avgDuration", "Avg duration"), 15)}${formatDurationMs(providerStats?.range_avg_duration_ms ?? 0, i18n)}` },
    { text: `${padRight(t(i18n, "features.stats.modelTotal.avgTpm", "Avg TPM"), 15)}${formatTpm(providerStats?.range_avg_tpm ?? 0, i18n)}` },
    { text: `${padRight(t(i18n, "features.stats.modelTotal.successRate", "Success rate"), 15)}${formatSuccessRate(providerStats)}` },
    { text: `AstrBot        ${version?.version ? `v${version.version}` : "-"}`, dimColor: true },
  ];
  return lines.map((line) => ({ ...line, text: truncate(line.text, width) }));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(Number(value) || 0));
}

function formatRangeLabel(range: TokenRange, i18n?: I18n): string {
  if (range === 7) {
    return t(i18n, "features.stats.ranges.oneWeek", "7d");
  }
  if (range === 3) {
    return t(i18n, "features.stats.ranges.threeDays", "3d");
  }
  return t(i18n, "features.stats.ranges.oneDay", "1d");
}

function formatRunningTime(running?: RuntimeStats["running"], i18n?: I18n): string {
  if (!running) {
    return "-";
  }
  const hours = Number(running.hours ?? 0);
  const minutes = Number(running.minutes ?? 0);
  const seconds = Number(running.seconds ?? 0);
  if (hours > 0) {
    return `${hours}${t(i18n, "features.stats.units.hoursShort", "h")} ${minutes}${t(i18n, "features.stats.units.minutesShort", "m")}`;
  }
  if (minutes > 0) {
    return `${minutes}${t(i18n, "features.stats.units.minutesShort", "m")} ${seconds}${t(i18n, "features.stats.units.secondsShort", "s")}`;
  }
  return `${seconds}${t(i18n, "features.stats.units.secondsShort", "s")}`;
}

function formatDateTimeSec(timestampSec: number, i18n?: I18n): string {
  if (!timestampSec) {
    return "-";
  }
  return new Date(timestampSec * 1000).toLocaleString(i18n?.locale || "zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: Date | null, i18n?: I18n): string {
  if (!value) {
    return t(i18n, "features.stats.header.notUpdated", "not updated");
  }
  return value.toLocaleTimeString(i18n?.locale || "zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatHour(timestampSec: number, includeDate: boolean, i18n?: I18n): string {
  if (!timestampSec) {
    return "--:--";
  }
  const options: Intl.DateTimeFormatOptions = includeDate
    ? { month: "2-digit", day: "2-digit", hour: "2-digit" }
    : { hour: "2-digit" };
  return new Date(timestampSec * 1000).toLocaleString(i18n?.locale || "zh-CN", options);
}

function formatHourMs(timestampMs: number, i18n?: I18n): string {
  if (!timestampMs) {
    return "--:--";
  }
  return new Date(timestampMs).toLocaleString(i18n?.locale || "zh-CN", {
    hour: "2-digit",
  });
}

function formatDurationMs(value: number, i18n?: I18n): string {
  if (!value || value <= 0) {
    return "-";
  }
  if (value < 1000) {
    return `${Math.round(value)} ${t(i18n, "features.stats.units.ms", "ms")}`;
  }
  return `${(value / 1000).toFixed(2)} ${t(i18n, "features.stats.units.secondsShort", "s")}`;
}

function formatTpm(value: number, i18n?: I18n): string {
  if (!value || value <= 0) {
    return "-";
  }
  return `${Math.round(value)} ${t(i18n, "features.stats.units.tpm", "tpm")}`;
}

function formatSuccessRate(providerStats: ProviderTokenStats | null): string {
  if (!providerStats?.range_total_calls) {
    return "-";
  }
  return `${(providerStats.range_success_rate * 100).toFixed(1)}%`;
}

function padRight(value: string, width: number): string {
  return padRightCells(value, width);
}

function padLeft(value: string, width: number): string {
  return padLeftCells(value, width);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

function formatPercent(value: number): string {
  return `${clampPercent(value).toFixed(1)}%`;
}

function formatMemory(valueMb: number, i18n?: I18n): string {
  if (valueMb >= 1024) {
    return `${(valueMb / 1024).toFixed(1)} ${t(i18n, "features.stats.units.gb", "GB")}`;
  }
  return `${Math.round(valueMb)} ${t(i18n, "features.stats.units.mb", "MB")}`;
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

function t(
  i18n: I18n | undefined,
  key: string,
  fallback: string,
  params?: Parameters<I18n["t"]>[2],
): string {
  return i18n?.t(key, fallback, params) ?? fallback;
}
