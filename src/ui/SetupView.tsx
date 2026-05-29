import { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { I18n } from "../i18n/index.js";
import { useTerminalSize } from "./appHelpers.js";
import { clampCursor, insertAtCursor, removeAtCursor } from "./dialogControls.js";

export interface SetupValues {
  serverUrl: string;
  username: string;
  password: string;
}

type FieldKey = "server" | "username" | "password";

const FIELD_ORDER: FieldKey[] = ["server", "username", "password"];

interface FieldState {
  value: string;
  cursor: number;
}

export function SetupView({
  i18n,
  defaultServerUrl,
  defaultUsername,
  onSubmit,
}: {
  i18n: I18n;
  defaultServerUrl: string;
  defaultUsername: string;
  onSubmit: (values: SetupValues) => Promise<void>;
}) {
  const { exit } = useApp();
  const [columns, rows] = useTerminalSize();
  const [fields, setFields] = useState<Record<FieldKey, FieldState>>({
    server: { value: defaultServerUrl, cursor: defaultServerUrl.length },
    username: { value: defaultUsername, cursor: defaultUsername.length },
    password: { value: "", cursor: 0 },
  });
  const [focus, setFocus] = useState<FieldKey>("server");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const moveFocus = (delta: number) => {
    const index = FIELD_ORDER.indexOf(focus);
    const next = FIELD_ORDER[(index + delta + FIELD_ORDER.length) % FIELD_ORDER.length];
    setFocus(next);
  };

  const updateFocused = (updater: (field: FieldState) => FieldState) => {
    setFields((current) => ({ ...current, [focus]: updater(current[focus]) }));
  };

  const submit = () => {
    const values: SetupValues = {
      serverUrl: fields.server.value.trim(),
      username: fields.username.value.trim(),
      password: fields.password.value,
    };
    if (!values.serverUrl || !values.username) {
      setError(i18n.t("tui.cli.setup.fillAll", "Please fill in the server address and username."));
      return;
    }
    setSubmitting(true);
    setError("");
    void onSubmit(values).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    });
  };

  useInput((value, key) => {
    if (submitting) {
      return;
    }
    if (key.escape || (key.ctrl && value === "c")) {
      exit();
      return;
    }
    if (key.tab) {
      moveFocus(key.shift ? -1 : 1);
      return;
    }
    if (key.downArrow) {
      moveFocus(1);
      return;
    }
    if (key.upArrow) {
      moveFocus(-1);
      return;
    }
    if (key.return) {
      if (focus === "password") {
        submit();
      } else {
        moveFocus(1);
      }
      return;
    }
    if (key.leftArrow) {
      updateFocused((field) => ({ ...field, cursor: clampCursor(field.cursor - 1, field.value.length) }));
      return;
    }
    if (key.rightArrow) {
      updateFocused((field) => ({ ...field, cursor: clampCursor(field.cursor + 1, field.value.length) }));
      return;
    }
    if (key.backspace || key.delete) {
      updateFocused((field) => {
        const nextValue = removeAtCursor(field.value, field.cursor, key.backspace ? "backward" : "forward");
        const nextCursor = key.backspace ? field.cursor - 1 : field.cursor;
        return { value: nextValue, cursor: clampCursor(nextCursor, nextValue.length) };
      });
      return;
    }
    if (value && !key.ctrl && !key.meta) {
      updateFocused((field) => {
        const nextValue = insertAtCursor(field.value, field.cursor, value);
        return { value: nextValue, cursor: clampCursor(field.cursor + value.length, nextValue.length) };
      });
    }
  });

  const panelWidth = Math.max(40, Math.min(columns - 4, 72));

  return (
    <Box width={columns} height={rows} alignItems="center" justifyContent="center">
      <Box flexDirection="column" width={panelWidth} borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
        <Text bold color="cyan">{i18n.t("tui.cli.setup.welcome", "Welcome to AstrBot TUI")}</Text>
        <Text dimColor>{i18n.t("tui.cli.setup.intro", "No saved session found. Let's connect to your AstrBot Dashboard.")}</Text>
        <Text> </Text>
        <Field
          label={i18n.t("tui.cli.setup.serverPrompt", "AstrBot Dashboard URL")}
          field={fields.server}
          focused={focus === "server"}
          disabled={submitting}
        />
        <Field
          label={i18n.t("features.auth.username", "Username")}
          field={fields.username}
          focused={focus === "username"}
          disabled={submitting}
        />
        <Field
          label={i18n.t("features.auth.password", "Password")}
          field={fields.password}
          focused={focus === "password"}
          disabled={submitting}
          mask
        />
        <Text> </Text>
        {submitting ? (
          <Text color="yellow">
            {i18n.t("tui.cli.setup.connecting", "Connecting to {serverUrl}...", {
              serverUrl: fields.server.value.trim(),
            })}
          </Text>
        ) : error ? (
          <Text color="red">{error}</Text>
        ) : (
          <Text dimColor>{i18n.t("tui.cli.setup.hint", "Tab / arrows switch fields   Enter next/connect   Esc quit")}</Text>
        )}
      </Box>
    </Box>
  );
}

function Field({
  label,
  field,
  focused,
  disabled,
  mask = false,
}: {
  label: string;
  field: FieldState;
  focused: boolean;
  disabled?: boolean;
  mask?: boolean;
}) {
  const display = mask ? "*".repeat(field.value.length) : field.value;
  const chars = Array.from(display);
  const cursor = clampCursor(field.cursor, chars.length);
  const left = chars.slice(0, cursor).join("");
  const cursorChar = chars[cursor] ?? " ";
  const right = chars.slice(cursor + (cursor < chars.length ? 1 : 0)).join("");
  const pointerColor = focused ? "cyan" : "gray";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={focused ? "cyan" : "white"}>
        <Text color={pointerColor}>{focused ? "> " : "  "}</Text>
        {label}
      </Text>
      <Box>
        <Text color={pointerColor}>{"  | "}</Text>
        {focused && !disabled ? (
          <Text>
            {left}
            <Text inverse>{cursorChar}</Text>
            {right}
          </Text>
        ) : (
          <Text>{display || " "}</Text>
        )}
      </Box>
    </Box>
  );
}
