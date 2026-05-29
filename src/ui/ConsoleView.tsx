import React from "react";
import { Box, Text } from "ink";
import type { LiveLogPayload } from "../api/types.js";
import type { I18n } from "../i18n/index.js";
import { terminalWidth } from "./terminal.js";

type ConsoleColor = "cyan" | "green" | "yellow" | "red" | "magenta" | "blue" | "gray";

export interface ConsoleSegment {
  text: string;
  color?: ConsoleColor;
  dimColor?: boolean;
  bold?: boolean;
}

export interface ConsoleLine {
  segments: ConsoleSegment[];
}

export function ConsoleView({
  i18n,
  meta,
  lines,
  width,
}: {
  i18n?: I18n;
  meta: string;
  lines: ConsoleLine[];
  width: number;
}) {
  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{t(i18n, "features.console.title", "Console")}</Text>
        <Text dimColor>{meta}</Text>
      </Box>
      {lines.length ? (
        lines.map((line, index) => (
          <Text key={`${index}-${line.segments.map((segment) => segment.text).join("")}`}>
            {line.segments.map((segment, segmentIndex) => (
              <Text
                key={`${segmentIndex}-${segment.text}`}
                color={segment.color}
                dimColor={segment.dimColor}
                bold={segment.bold}
              >
                {segment.text}
              </Text>
            ))}
          </Text>
        ))
      ) : (
        <Text dimColor>{t(i18n, "tui.console.waitingForLogs", "Waiting for live logs.")}</Text>
      )}
    </>
  );
}

export function buildConsoleLines(
  logs: LiveLogPayload[],
  width: number,
): ConsoleLine[] {
  return logs.flatMap((log) => {
    const text = rawLogText(log);
    const level = logLevel(log);
    return stripAnsi(text)
      .split(/\r?\n/)
      .flatMap((line) => wrapConsoleSegments(parseConsoleLine(line, level), width));
  });
}

function parseConsoleLine(line: string, level: string): ConsoleSegment[] {
  if (!line) {
    return [{ text: `[${level}]`, color: levelColor(level), bold: levelBold(level) }];
  }

  const match = /^(?<time>\[[^\]]+\])\s+(?<scope>\[[^\]]+\])\s+(?<level>\[[^\]]+\])(?<version>\s+\[v[^\]]+\])?\s+(?<source>\[[^\]]+:\d+\]):\s*(?<message>.*)$/u.exec(line);
  if (!match?.groups) {
    return [{ text: line, color: levelColor(level), bold: levelBold(level) }];
  }

  const parsedLevel = normalizeLevel(match.groups.level);
  const color = levelColor(parsedLevel);
  return [
    { text: match.groups.time, color: "green" },
    { text: " " },
    { text: match.groups.scope, color: scopeColor(match.groups.scope) },
    { text: " " },
    { text: match.groups.level, color, bold: levelBold(parsedLevel) },
    ...(match.groups.version
      ? [{ text: match.groups.version, color: "yellow" as const }]
      : []),
    { text: " " },
    { text: match.groups.source, color: "gray" },
    { text: ": ", color: "gray" },
    { text: match.groups.message, color, bold: levelBold(parsedLevel) },
  ];
}

function wrapConsoleSegments(
  segments: ConsoleSegment[],
  width: number,
): ConsoleLine[] {
  if (width <= 0) {
    return [{ segments: [] }];
  }

  const lines: ConsoleLine[] = [];
  let current: ConsoleSegment[] = [];
  let used = 0;

  for (const segment of segments) {
    for (const char of segment.text) {
      const charWidth = terminalWidth(char);
      if (used > 0 && used + charWidth > width) {
        lines.push({ segments: current });
        current = [];
        used = 0;
      }
      if (charWidth > width) {
        continue;
      }
      appendSegment(current, { ...segment, text: char });
      used += charWidth;
    }
  }

  lines.push({ segments: current });
  return lines;
}

function appendSegment(segments: ConsoleSegment[], next: ConsoleSegment): void {
  const previous = segments[segments.length - 1];
  if (
    previous &&
    previous.color === next.color &&
    previous.dimColor === next.dimColor &&
    previous.bold === next.bold
  ) {
    previous.text += next.text;
    return;
  }
  segments.push(next);
}

function rawLogText(log: LiveLogPayload): string {
  const value = log.message ?? log.data ?? log.msg ?? log.content ?? "";
  const text = String(value).trimEnd();
  return text || `[${logLevel(log)}]`;
}

function logLevel(log: LiveLogPayload): string {
  return normalizeLevel(String(log.level || "INFO"));
}

function normalizeLevel(value: string): string {
  const normalized = value.replace(/[\[\]\s]/g, "").toUpperCase();
  if (normalized === "DBUG") {
    return "DEBUG";
  }
  if (normalized === "WARN") {
    return "WARNING";
  }
  if (normalized === "ERRO") {
    return "ERROR";
  }
  if (normalized === "CRIT") {
    return "CRITICAL";
  }
  return normalized || "INFO";
}

function levelColor(level: string): ConsoleColor | undefined {
  if (level === "DEBUG") {
    return "blue";
  }
  if (level === "INFO") {
    return "cyan";
  }
  if (level === "WARNING") {
    return "yellow";
  }
  if (level === "ERROR" || level === "CRITICAL") {
    return "red";
  }
  return undefined;
}

function levelBold(level: string): boolean {
  return level === "ERROR" || level === "CRITICAL";
}

function scopeColor(scope: string): ConsoleColor {
  return scope.includes("Plug") ? "magenta" : "cyan";
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function t(i18n: I18n | undefined, key: string, fallback: string): string {
  return i18n?.t(key, fallback) ?? fallback;
}
