import { useState } from "react";
import { Box, Text, useApp } from "ink";
import { useTerminalInput } from "./useTerminalInput.js";
import type { I18n } from "../i18n/index.js";
import {
  DashboardSetupCompletedError,
  DashboardSetupRequiredError,
  isTotpRequiredError,
} from "../auth/session.js";
import { useTerminalSize } from "./appHelpers.js";
import { clampCursor, editWindow, insertAtCursor, removeAtCursor } from "./dialogControls.js";
import { truncateCells } from "./terminal.js";

export interface SetupValues {
  serverUrl: string;
  username: string;
  password: string;
  confirmPassword?: string;
  code?: string;
}

type FieldKey = "server" | "username" | "password" | "confirmPassword" | "code";

const BASE_FIELD_ORDER: FieldKey[] = ["server", "username", "password"];

interface FieldState {
  value: string;
  cursor: number;
}

export function SetupView({
  i18n,
  sessionExpired,
  defaultServerUrl,
  defaultUsername,
  onSubmit,
}: {
  i18n: I18n;
  sessionExpired?: boolean;
  defaultServerUrl: string;
  defaultUsername: string;
  onSubmit: (values: SetupValues) => Promise<void>;
}) {
  const { exit } = useApp();
  const [columns, rows] = useTerminalSize();
  const [fields, setFields] = useState<Record<FieldKey, FieldState>>({
    server: { value: defaultServerUrl, cursor: Array.from(defaultServerUrl).length },
    username: { value: defaultUsername, cursor: Array.from(defaultUsername).length },
    password: { value: "", cursor: 0 },
    confirmPassword: { value: "", cursor: 0 },
    code: { value: "", cursor: 0 },
  });
  const [focus, setFocus] = useState<FieldKey>("server");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);
  const [totpRequired, setTotpRequired] = useState(false);
  const fieldOrder = setupRequired
    ? [...BASE_FIELD_ORDER, "confirmPassword" as const]
    : totpRequired
      ? [...BASE_FIELD_ORDER, "code" as const]
      : BASE_FIELD_ORDER;

  const moveFocus = (delta: number) => {
    const index = fieldOrder.indexOf(focus);
    const next = fieldOrder[(index + delta + fieldOrder.length) % fieldOrder.length];
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
      confirmPassword: setupRequired ? fields.confirmPassword.value : undefined,
      code: totpRequired ? fields.code.value.trim() : undefined,
    };
    if (!values.serverUrl || !values.username) {
      setError(i18n.t("tui.cli.setup.fillAll", "Please fill in the server address and username."));
      return;
    }
    if (!values.password) {
      setError(i18n.t("features.auth.setup.validation.passwordRequired", "Enter a password."));
      setFocus("password");
      return;
    }
    if (setupRequired && values.password !== values.confirmPassword) {
      setError(i18n.t("features.auth.setup.validation.passwordMatch", "Passwords do not match."));
      setFocus("confirmPassword");
      return;
    }
    if (totpRequired && !values.code) {
      setError(i18n.t("tui.cli.setup.totpRequired", "Enter the TOTP or recovery code."));
      setFocus("code");
      return;
    }
    setSubmitting(true);
    setError("");
    void onSubmit(values).catch((err: unknown) => {
      if (err instanceof DashboardSetupRequiredError) {
        setSetupRequired(true);
        setTotpRequired(false);
        setFocus("confirmPassword");
        setError(i18n.t(
          "tui.cli.setup.firstAccount",
          "This Dashboard has no account yet. Confirm the password to create its first account.",
        ));
      } else if (err instanceof DashboardSetupCompletedError) {
        setSetupRequired(false);
        setFocus("password");
        setError(err.message);
      } else if (isTotpRequiredError(err)) {
        setTotpRequired(true);
        setFocus("code");
        setError(i18n.t(
          "tui.cli.setup.totpRequired",
          "This Dashboard requires a TOTP or recovery code.",
        ));
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      setSubmitting(false);
    });
  };

  useTerminalInput((value, key) => {
    if (submitting) {
      return;
    }
    if (key.escape || (key.ctrl && value === "c")) {
      exit();
      return;
    }
    if (key.ctrl && value === "u") {
      updateFocused(() => ({ value: "", cursor: 0 }));
      return;
    }
    if (key.ctrl && (value === "a" || value === "e")) {
      updateFocused((field) => ({ ...field, cursor: value === "a" ? 0 : Array.from(field.value).length }));
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
      if (focus === fieldOrder[fieldOrder.length - 1]) {
        submit();
      } else {
        moveFocus(1);
      }
      return;
    }
    if (key.leftArrow) {
      updateFocused((field) => ({ ...field, cursor: clampCursor(field.cursor - 1, Array.from(field.value).length) }));
      return;
    }
    if (key.rightArrow) {
      updateFocused((field) => ({ ...field, cursor: clampCursor(field.cursor + 1, Array.from(field.value).length) }));
      return;
    }
    if (key.backspace || key.delete) {
      updateFocused((field) => {
        const nextValue = removeAtCursor(field.value, field.cursor, key.backspace ? "backward" : "forward");
        const nextCursor = key.backspace ? field.cursor - 1 : field.cursor;
        return { value: nextValue, cursor: clampCursor(nextCursor, Array.from(nextValue).length) };
      });
      return;
    }
    if (value && !key.ctrl && !key.meta) {
      // Strip newlines/control chars so pasted text (e.g. a URL with a trailing
      // newline) can never break the value across multiple lines.
      const clean = value.replace(/[\u0000-\u001f\u007f]+/g, "");
      if (!clean) {
        return;
      }
      updateFocused((field) => {
        const nextValue = insertAtCursor(field.value, field.cursor, clean);
        return { value: nextValue, cursor: clampCursor(field.cursor + Array.from(clean).length, Array.from(nextValue).length) };
      });
    }
  });

  const panelWidth = Math.max(1, Math.min(columns, 72));
  const compactLayout = panelWidth < 40;
  const horizontalPadding = compactLayout ? 0 : 2;
  const fieldWidth = Math.max(1, panelWidth - (compactLayout ? 6 : 10));
  const title = setupRequired
    ? i18n.t("features.auth.setup.title", "Create the first Dashboard account")
    : i18n.t("tui.cli.setup.welcome", "Welcome to AstrBot TUI");
  const intro = setupRequired
    ? i18n.t("features.auth.setup.subtitle", "Create the account used to manage AstrBot")
    : sessionExpired
      ? i18n.t("tui.cli.setup.sessionExpired", "The saved session expired. Sign in again.")
      : i18n.t("tui.cli.setup.intro", "No saved session found. Let's connect to your AstrBot Dashboard.");

  return (
    <Box width={columns} height={rows} alignItems="center" justifyContent="center">
      <Box flexDirection="column" width={panelWidth} borderStyle="round" borderColor="cyan" paddingX={horizontalPadding} paddingY={1}>
        <Text bold color="cyan">{title}</Text>
        <Text dimColor>{intro}</Text>
        <Text> </Text>
        <Field
          label={i18n.t("tui.cli.setup.serverPrompt", "AstrBot Dashboard URL")}
          field={fields.server}
          focused={focus === "server"}
          disabled={submitting}
          width={fieldWidth}
        />
        <Field
          label={setupRequired
            ? i18n.t("tui.cli.setup.username", "Create the first Dashboard username")
            : i18n.t("features.auth.username", "Username")}
          field={fields.username}
          focused={focus === "username"}
          disabled={submitting}
          width={fieldWidth}
        />
        <Field
          label={setupRequired
            ? i18n.t("tui.cli.setup.password", "Choose a Dashboard password")
            : i18n.t("features.auth.password", "Password")}
          field={fields.password}
          focused={focus === "password"}
          disabled={submitting}
          width={fieldWidth}
          mask
        />
        {setupRequired && (
          <Field
            label={i18n.t("tui.cli.setup.confirmPassword", "Confirm new password")}
            field={fields.confirmPassword}
            focused={focus === "confirmPassword"}
            disabled={submitting}
            width={fieldWidth}
            mask
          />
        )}
        {totpRequired && (
          <Field
            label={i18n.t("tui.cli.setup.totpPrompt", "TOTP / recovery code")}
            field={fields.code}
            focused={focus === "code"}
            disabled={submitting}
            width={fieldWidth}
            mask
          />
        )}
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
          <Text dimColor>{i18n.t("tui.cli.setup.hint", "Tab / arrows switch fields   Ctrl+U clear   Enter next/connect   Esc quit")}</Text>
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
  width,
  mask = false,
}: {
  label: string;
  field: FieldState;
  focused: boolean;
  disabled?: boolean;
  width: number;
  mask?: boolean;
}) {
  const display = mask ? "*".repeat(Array.from(field.value).length) : field.value;
  const pointerColor = focused ? "cyan" : "gray";
  const view = editWindow(display, clampCursor(field.cursor, Array.from(display).length), width);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={focused ? "cyan" : "white"}>
        <Text color={pointerColor}>{focused ? "> " : "  "}</Text>
        {truncateCells(label, Math.max(1, width + 2))}
      </Text>
      <Box>
        <Text color={pointerColor}>{"  | "}</Text>
        <Box width={width} flexShrink={0}>
          {focused && !disabled ? (
            <Text>
              {view.left}
              <Text inverse>{view.cursor || " "}</Text>
              {view.right}
            </Text>
          ) : (
            <Text>{truncateCells(display, width) || " "}</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
