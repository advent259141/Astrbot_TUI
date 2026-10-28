import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export const DEFAULT_SERVER_URL = "http://localhost:6185";

export interface AstrTuiProfile {
  serverUrl: string;
  username?: string;
}

export interface RuntimeConfig {
  serverUrl: string;
  profilePath: string;
}

const CONFIG_DIR = join(homedir(), ".astr-tui");
const PROFILE_PATH = join(CONFIG_DIR, "config.json");

export function normalizeServerUrl(value: string | undefined): string {
  const raw = value?.trim() || DEFAULT_SERVER_URL;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    throw new Error("Dashboard URL must use http or https.");
  }
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`Invalid Dashboard URL: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Dashboard URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new Error("Dashboard URL must not contain a username or password.");
  }
  if (url.search || url.hash) {
    throw new Error("Dashboard URL must not contain a query string or fragment.");
  }

  // Keep a reverse-proxy prefix such as `/astrbot`, but remove the final slash.
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

export function resolveServerUrl(flagValue?: string, profileValue?: string): string {
  return normalizeServerUrl(
    flagValue ||
      process.env.ASTR_TUI_SERVER ||
      process.env.ASTRBOT_DASHBOARD_URL ||
      process.env.DASHBOARD_URL ||
      profileValue,
  );
}

export async function loadProfile(filePath = PROFILE_PATH): Promise<AstrTuiProfile | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const profile = parsed as Partial<AstrTuiProfile>;
    if (!profile.serverUrl || typeof profile.serverUrl !== "string") {
      return null;
    }
    return {
      serverUrl: normalizeServerUrl(profile.serverUrl),
      username: typeof profile.username === "string" ? profile.username : undefined,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveProfile(
  profile: AstrTuiProfile,
  filePath = PROFILE_PATH,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(
        {
          ...profile,
          serverUrl: normalizeServerUrl(profile.serverUrl),
        },
        null,
        2,
      )}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    if (process.platform !== "win32") {
      await chmod(temporaryPath, 0o600);
    }
    await rename(temporaryPath, filePath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

export function getProfilePath(): string {
  return PROFILE_PATH;
}
