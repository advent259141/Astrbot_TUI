#!/usr/bin/env node
import { useState } from "react";
import { Command } from "commander";
import { input, password } from "@inquirer/prompts";
import { render } from "ink";
import { App } from "../ui/App.js";
import { SetupView, type SetupValues } from "../ui/SetupView.js";
import { ApiError, messageFromUnknown } from "../api/errors.js";
import type { I18n } from "../i18n/index.js";
import {
  loadProfile,
  normalizeServerUrl,
  resolveServerUrl,
} from "../config/index.js";
import { createI18n } from "../i18n/index.js";
import {
  isServerSetupRequired,
  isTotpRequiredError,
  getAuthenticatedClient,
  login as loginSession,
  NoStoredTokenError,
  logout as logoutSession,
} from "../auth/session.js";

interface RootOptions {
  server?: string;
  lang?: string;
}

interface LoginCommandOptions extends RootOptions {
  username?: string;
  passwordStdin?: boolean;
  code?: string;
}

const program = new Command();
const i18n = createI18n();

program
  .name("astr-tui")
  .description(i18n.t("tui.cli.description", "Terminal workbench for AstrBot Dashboard"))
  .option("-s, --server <url>", i18n.t("tui.cli.options.server", "AstrBot Dashboard URL"))
  .option("--lang <locale>", i18n.t("tui.cli.options.language", "TUI language: en-US or zh-CN"))
  .action(async (options: RootOptions) => {
    const rootOptions = program.opts<RootOptions>();
    await startWorkbench(
      options.server || rootOptions.server,
      options.lang || rootOptions.lang,
    );
  });

program
  .command("login")
  .description(i18n.t("tui.cli.login.description", "Log in to AstrBot Dashboard and store the JWT"))
  .option("-s, --server <url>", i18n.t("tui.cli.options.server", "AstrBot Dashboard URL"))
  .option("-u, --username <name>", i18n.t("tui.cli.login.options.username", "Dashboard username"))
  .option("--password-stdin", i18n.t("tui.cli.login.options.passwordStdin", "Read the Dashboard password from stdin"))
  .option("--code <code>", i18n.t("tui.cli.login.options.code", "TOTP or recovery code"))
  .action(async (options: LoginCommandOptions) => {
    let serverUrl = "";
    let username = options.username || "";
    try {
      const rootOptions = program.opts<RootOptions>();
      const actionI18n = createI18n(options.lang || rootOptions.lang);
      const profile = await loadProfile();
      serverUrl = resolveServerUrl(options.server || rootOptions.server, profile?.serverUrl);
      const setupRequired = await isServerSetupRequired(serverUrl);
      const profileUsername = profile?.serverUrl === serverUrl ? profile.username : undefined;
      if (setupRequired) {
        console.log(actionI18n.t(
          "tui.cli.setup.firstAccount",
          "This Dashboard has no account yet. The next step will create its first account.",
        ));
      }
      if (!username) {
        username = await input({
          message: setupRequired
            ? actionI18n.t("tui.cli.setup.username", "Create the first Dashboard username")
            : actionI18n.t("features.auth.username", "Username"),
          default: profileUsername || "astrbot",
        });
      }
      const passwordValue = options.passwordStdin
        ? await readPasswordFromStdin()
        : await password({
            message: setupRequired
              ? actionI18n.t("tui.cli.setup.password", "Choose a Dashboard password")
              : actionI18n.t("features.auth.password", "Password"),
            mask: "*",
          });
      const confirmPassword = setupRequired
        ? await password({
            message: actionI18n.t("tui.cli.setup.confirmPassword", "Confirm the Dashboard password"),
            mask: "*",
          })
        : undefined;
      let code = options.code;
      let result: Awaited<ReturnType<typeof loginSession>>;
      try {
        result = await loginSession({
          serverUrl,
          username,
          password: passwordValue,
          confirmPassword,
          code,
        });
      } catch (error) {
        if (!setupRequired && !code && isTotpRequiredError(error)) {
          code = await password({
            message: actionI18n.t("tui.cli.login.options.code", "TOTP or recovery code"),
            mask: "*",
          });
          result = await loginSession({
            serverUrl,
            username,
            password: passwordValue,
            code,
          });
        } else {
          throw error;
        }
      }
      console.log(
        actionI18n.t("tui.cli.login.success", "Logged in as {username}. Token stored with {kind}.", {
          username: result.username,
          kind: result.tokenStoreKind,
        }),
      );
    } catch (error) {
      const actionI18n = createI18n(options.lang || program.opts<RootOptions>().lang);
      console.error(actionI18n.t("tui.cli.login.failed", "Login failed: {error}", {
        error: messageFromUnknown(error),
      }));
      console.error(actionI18n.t("tui.cli.labels.server", "Server: {serverUrl}", { serverUrl }));
      console.error(actionI18n.t("tui.cli.labels.username", "Username: {username}", { username }));
      process.exitCode = 1;
    }
  });

program
  .command("logout")
  .description(i18n.t("tui.cli.logout.description", "Remove the stored Dashboard JWT"))
  .option("-s, --server <url>", i18n.t("tui.cli.options.server", "AstrBot Dashboard URL"))
  .action(async (options: RootOptions) => {
    const rootOptions = program.opts<RootOptions>();
    const actionI18n = createI18n(options.lang || rootOptions.lang);
    try {
      const result = await logoutSession(options.server || rootOptions.server);
      console.log(
        actionI18n.t("tui.cli.logout.success", "Logged out from {serverUrl}. Token removed from {kind}.", {
          serverUrl: result.serverUrl,
          kind: result.tokenStoreKind,
        }),
      );
    } catch (error) {
      console.error(actionI18n.t("tui.cli.logout.failed", "Logout failed: {error}", {
        error: messageFromUnknown(error),
      }));
      process.exitCode = 1;
    }
  });

program
  .command("status")
  .description(i18n.t("tui.cli.status.description", "Check the stored session and Dashboard version"))
  .option("-s, --server <url>", i18n.t("tui.cli.options.server", "AstrBot Dashboard URL"))
  .action(async (options: RootOptions) => {
    const rootOptions = program.opts<RootOptions>();
    const actionI18n = createI18n(options.lang || rootOptions.lang);
    try {
      const { client, serverUrl, username, tokenStoreKind } =
        await getAuthenticatedClient(options.server || rootOptions.server);
      const version = await client.getVersion();
      console.log(actionI18n.t("tui.cli.labels.server", "Server: {serverUrl}", { serverUrl }));
      console.log(actionI18n.t("tui.cli.labels.user", "User: {username}", {
        username: username || actionI18n.t("tui.common.unknown", "unknown"),
      }));
      console.log(actionI18n.t("tui.cli.labels.tokenStore", "Token store: {kind}", { kind: tokenStoreKind }));
      console.log(`AstrBot: v${version.version}`);
      if (version.dashboard_version) {
        console.log(`${actionI18n.t("core.navigation.dashboard", "Dashboard")}: ${version.dashboard_version}`);
      }
    } catch (error) {
      console.error(actionI18n.t("tui.cli.status.failed", "Status check failed: {error}", {
        error: messageFromUnknown(error),
      }));
      process.exitCode = 1;
    }
  });

type Session = Awaited<ReturnType<typeof getAuthenticatedClient>>;

async function startWorkbench(serverFlag?: string, localeFlag?: string): Promise<void> {
  let session: Session | null = null;
  let sessionExpired = false;
  const profile = await loadProfile();
  const defaultServerUrl = resolveServerUrl(serverFlag, profile?.serverUrl);
  try {
    session = await getAuthenticatedClient(serverFlag);
    try {
      await session.client.getVersion();
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        session = null;
        sessionExpired = true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    // A missing token or an expired JWT falls through to the sign-in screen.
    if (!(error instanceof NoStoredTokenError)) {
      throw error;
    }
  }

  const defaultUsername = profile?.serverUrl === defaultServerUrl
    ? profile.username || "astrbot"
    : "astrbot";
  const workbenchI18n = createI18n(localeFlag);
  render(
    <Root
      i18n={workbenchI18n}
      initialSession={session}
      sessionExpired={sessionExpired}
      defaultServerUrl={defaultServerUrl}
      defaultUsername={defaultUsername}
      locale={localeFlag}
    />,
  );
}

function Root({
  i18n: rootI18n,
  initialSession,
  sessionExpired,
  defaultServerUrl,
  defaultUsername,
  locale,
}: {
  i18n: I18n;
  initialSession: Session | null;
  sessionExpired: boolean;
  defaultServerUrl: string;
  defaultUsername: string;
  locale?: string;
}) {
  const [session, setSession] = useState<Session | null>(initialSession);

  if (!session) {
    return (
      <SetupView
        i18n={rootI18n}
        sessionExpired={sessionExpired}
        defaultServerUrl={defaultServerUrl}
        defaultUsername={defaultUsername}
        onSubmit={async (values: SetupValues) => {
          const serverUrl = normalizeServerUrl(values.serverUrl);
          await loginSession({
            serverUrl,
            username: values.username,
            password: values.password,
            confirmPassword: values.confirmPassword,
            code: values.code,
          });
          setSession(await getAuthenticatedClient(serverUrl));
        }}
      />
    );
  }

  return (
    <App
      client={session.client}
      serverUrl={session.serverUrl}
      username={session.username}
      tokenStoreKind={session.tokenStoreKind}
      locale={locale}
    />
  );
}

async function readPasswordFromStdin(): Promise<string> {
  process.stdin.setEncoding("utf8");
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
  }
  return raw.replace(/\r?\n$/, "");
}

try {
  await program.parseAsync();
} catch (error) {
  console.error(messageFromUnknown(error));
  process.exitCode = 1;
}
