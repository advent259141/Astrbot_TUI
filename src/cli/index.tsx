#!/usr/bin/env node
import React from "react";
import { Command } from "commander";
import { input, password } from "@inquirer/prompts";
import { render } from "ink";
import { App } from "../ui/App.js";
import { messageFromUnknown } from "../api/errors.js";
import { loadProfile, resolveServerUrl } from "../config/index.js";
import { createI18n } from "../i18n/index.js";
import {
  getAuthenticatedClient,
  login as loginSession,
  logout as logoutSession,
} from "../auth/session.js";

interface RootOptions {
  server?: string;
  lang?: string;
}

interface LoginCommandOptions extends RootOptions {
  username?: string;
  passwordStdin?: boolean;
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
  .action(async (options: LoginCommandOptions) => {
    const rootOptions = program.opts<RootOptions>();
    const profile = await loadProfile();
    const serverUrl = resolveServerUrl(
      options.server || rootOptions.server || profile?.serverUrl,
    );
    const username =
      options.username ||
      (await input({
        message: i18n.t("features.auth.username", "Username"),
        default: profile?.username || "astrbot",
      }));
    const passwordValue = options.passwordStdin
      ? await readPasswordFromStdin()
      : await password({
          message: i18n.t("features.auth.password", "Password"),
          mask: "*",
        });

    try {
      const result = await loginSession({
        serverUrl,
        username,
        password: passwordValue,
      });
      console.log(
        i18n.t("tui.cli.login.success", "Logged in as {username}. Token stored with {kind}.", {
          username: result.username,
          kind: result.tokenStoreKind,
        }),
      );
    } catch (error) {
      console.error(i18n.t("tui.cli.login.failed", "Login failed: {error}", {
        error: messageFromUnknown(error),
      }));
      console.error(i18n.t("tui.cli.labels.server", "Server: {serverUrl}", { serverUrl }));
      console.error(i18n.t("tui.cli.labels.username", "Username: {username}", { username }));
      process.exitCode = 1;
    }
  });

program
  .command("logout")
  .description(i18n.t("tui.cli.logout.description", "Remove the stored Dashboard JWT"))
  .option("-s, --server <url>", i18n.t("tui.cli.options.server", "AstrBot Dashboard URL"))
  .action(async (options: RootOptions) => {
    const rootOptions = program.opts<RootOptions>();
    try {
      const result = await logoutSession(options.server || rootOptions.server);
      console.log(
        i18n.t("tui.cli.logout.success", "Logged out from {serverUrl}. Token removed from {kind}.", {
          serverUrl: result.serverUrl,
          kind: result.tokenStoreKind,
        }),
      );
    } catch (error) {
      console.error(i18n.t("tui.cli.logout.failed", "Logout failed: {error}", {
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
    try {
      const { client, serverUrl, username, tokenStoreKind } =
        await getAuthenticatedClient(options.server || rootOptions.server);
      const version = await client.getVersion();
      console.log(i18n.t("tui.cli.labels.server", "Server: {serverUrl}", { serverUrl }));
      console.log(i18n.t("tui.cli.labels.user", "User: {username}", {
        username: username || i18n.t("tui.common.unknown", "unknown"),
      }));
      console.log(i18n.t("tui.cli.labels.tokenStore", "Token store: {kind}", { kind: tokenStoreKind }));
      console.log(`AstrBot: v${version.version}`);
      if (version.dashboard_version) {
        console.log(`${i18n.t("core.navigation.dashboard", "Dashboard")}: ${version.dashboard_version}`);
      }
    } catch (error) {
      console.error(messageFromUnknown(error));
      process.exitCode = 1;
    }
  });

async function startWorkbench(serverFlag?: string, localeFlag?: string): Promise<void> {
  try {
    const { client, serverUrl, username, tokenStoreKind } =
      await getAuthenticatedClient(serverFlag);
    render(
      <App
        client={client}
        serverUrl={serverUrl}
        username={username}
        tokenStoreKind={tokenStoreKind}
        locale={localeFlag}
      />,
    );
  } catch (error) {
    console.error(messageFromUnknown(error));
    process.exitCode = 1;
  }
}

async function readPasswordFromStdin(): Promise<string> {
  process.stdin.setEncoding("utf8");
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
  }
  return raw.replace(/\r?\n$/, "");
}

await program.parseAsync();
