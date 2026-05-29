import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

export function resolveServerUrl(flagValue?: string): string {
  return normalizeServerUrl(
    flagValue ||
      process.env.ASTR_TUI_SERVER ||
      process.env.ASTRBOT_DASHBOARD_URL ||
      process.env.DASHBOARD_URL,
  );
}

export async function loadProfile(): Promise<AstrTuiProfile | null> {
  try {
    const raw = await readFile(PROFILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AstrTuiProfile>;
    if (!parsed.serverUrl || typeof parsed.serverUrl !== "string") {
      return null;
    }
    return {
      serverUrl: normalizeServerUrl(parsed.serverUrl),
      username: typeof parsed.username === "string" ? parsed.username : undefined,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveProfile(profile: AstrTuiProfile): Promise<void> {
  await mkdir(dirname(PROFILE_PATH), { recursive: true });
  await writeFile(
    PROFILE_PATH,
    `${JSON.stringify(
      {
        ...profile,
        serverUrl: normalizeServerUrl(profile.serverUrl),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export function getProfilePath(): string {
  return PROFILE_PATH;
}
