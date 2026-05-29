import React from "react";
import { Box, Text } from "ink";
import type { I18n } from "../i18n/index.js";
import { truncateCells } from "./terminal.js";

const ASTRBOT_LOGO_LINES = [
  "     ___           _______.___________..______      .______     ______   .___________.",
  "    /   \\         /       |           ||   _  \\     |   _  \\   /  __  \\  |           |",
  "   /  ^  \\       |   (----`---|  |----`|  |_)  |    |  |_)  | |  |  |  | `---|  |----`",
  "  /  /_\\  \\       \\   \\       |  |     |      /     |   _  <  |  |  |  |     |  |",
  " /  _____  \\  .----)   |      |  |     |  |\\  \\----.|  |_)  | |  `--'  |     |  |",
  "/__/     \\__\\ |_______/       |__|     | _| `._____||______/   \\______/      |__|",
];

export function SplashView({
  i18n,
  columns,
  rows,
  bootStatus,
  username,
  serverUrl,
}: {
  i18n?: I18n;
  columns: number;
  rows: number;
  bootStatus: string;
  username?: string;
  serverUrl: string;
}) {
  const splashWidth = Math.max(1, columns - 4);
  return (
    <Box
      flexDirection="column"
      width={columns}
      height={rows}
      alignItems="center"
      justifyContent="center"
    >
      <Box flexDirection="column">
        {ASTRBOT_LOGO_LINES.map((line, index) => (
          <Text key={index} color="cyan">
            {truncateCells(line, splashWidth)}
          </Text>
        ))}
        <Text> </Text>
        <Text bold>AstrBot TUI</Text>
        <Text dimColor>{truncateCells(bootStatus, splashWidth)}</Text>
        <Text dimColor>{truncateCells(`${username || t(i18n, "core.navigation.dashboard", "dashboard")} @ ${serverUrl}`, splashWidth)}</Text>
      </Box>
    </Box>
  );
}

function t(i18n: I18n | undefined, key: string, fallback: string): string {
  return i18n?.t(key, fallback) ?? fallback;
}
