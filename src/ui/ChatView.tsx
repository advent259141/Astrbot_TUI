import React from "react";
import { Box, Text } from "ink";
import type { ChatSession } from "../api/types.js";
import type { I18n } from "../i18n/index.js";
import { sessionTitle, truncate } from "./format.js";
import { terminalWidth, truncateCells } from "./terminal.js";

export interface MessageRow {
  id: string;
  role: "user" | "bot" | "space";
  text: string;
  label?: boolean;
}

export type SidebarAction = "new" | null;

export function ChatSidebar({
  width,
  height,
  i18n,
  sessionTitleText,
  sessionFilter,
  sessions,
  filteredSessions,
  visibleSessions,
  selectedSessionId,
  selectedSidebarAction,
}: {
  width: number;
  height: number;
  i18n?: I18n;
  sessionTitleText: string;
  sessionFilter: string;
  sessions: ChatSession[];
  filteredSessions: ChatSession[];
  visibleSessions: ChatSession[];
  selectedSessionId: string | null;
  selectedSidebarAction: SidebarAction;
}) {
  return (
    <Box
      width={width}
      height={height}
      borderStyle="single"
      borderColor="gray"
      flexDirection="column"
      paddingX={1}
    >
      <Text bold>{truncate(t(i18n, "core.navigation.chat", "Chat"), width - 4)}</Text>
      <Text color="cyan" inverse={selectedSidebarAction === "new"}>
        {truncate(`+ ${t(i18n, "features.chat.actions.newChat", "New Chat")}`, width - 4)}
      </Text>
      <Text bold>{truncate(sessionTitleText, width - 4)}</Text>
      {sessionFilter ? (
        <Text dimColor>{truncate(`${t(i18n, "core.actions.search", "Search")}: ${sessionFilter}`, width - 4)}</Text>
      ) : null}

      {filteredSessions.length ? (
        visibleSessions.map((session) => {
          const isSelected =
            selectedSidebarAction === null &&
            session.session_id === selectedSessionId;
          return (
            <Text
              key={session.session_id}
              color={isSelected ? "cyan" : undefined}
              inverse={isSelected}
            >
              {truncate(
                `${isSelected ? ">" : " "} ${sessionTitle(session)}`,
                width - 4,
              )}
            </Text>
          );
        })
      ) : sessions.length ? (
        <Text dimColor>{t(i18n, "tui.chat.noMatchingChats", "No matching chats.")}</Text>
      ) : (
        <Text dimColor>{t(i18n, "features.chat.conversation.noHistory", "No conversation history")}</Text>
      )}
    </Box>
  );
}

export function ChatView({
  i18n,
  title,
  meta,
  rows,
  width,
  height,
}: {
  i18n?: I18n;
  title: string;
  meta: string;
  rows: MessageRow[];
  width: number;
  height: number;
}) {
  return (
    <>
      <Box justifyContent="space-between">
        <Text bold>{truncate(title, Math.max(10, width - 18))}</Text>
        <Text dimColor>{meta}</Text>
      </Box>
      {rows.length ? (
        rows.map((row, index) => {
          if (row.role === "space") {
            return <Text key={row.id || `space-${index}`}> </Text>;
          }
          const text = row.label ? row.text : `  ${row.text}`;
          const display = truncateCells(text, width);
          if (row.role === "user") {
            const pad = " ".repeat(Math.max(0, width - terminalWidth(display)));
            return (
              <Text key={row.id} color={row.label ? "cyan" : undefined}>
                {pad}{display}
              </Text>
            );
          }
          return (
            <Text key={row.id} color={row.label ? "green" : undefined}>
              {display}
            </Text>
          );
        })
      ) : (
        <Box
          height={Math.max(1, height - 1)}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <Text bold>{t(i18n, "tui.chat.emptyTitle", "Start a conversation with AstrBot")}</Text>
          <Text dimColor>{t(i18n, "features.chat.input.placeholder", "Start typing...")}</Text>
        </Box>
      )}
    </>
  );
}

function t(i18n: I18n | undefined, key: string, fallback: string): string {
  return i18n?.t(key, fallback) ?? fallback;
}
