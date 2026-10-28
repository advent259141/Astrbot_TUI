import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SERVER_URL,
  loadProfile,
  normalizeServerUrl,
  resolveServerUrl,
  saveProfile,
} from "./index.js";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "astr-tui-config-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("server URL configuration", () => {
  it("normalizes hosts while preserving reverse-proxy path prefixes", () => {
    expect(normalizeServerUrl(" https://EXAMPLE.com:443/astrbot/// ")).toBe(
      "https://example.com/astrbot",
    );
    expect(normalizeServerUrl("localhost:6185/")).toBe("http://localhost:6185");
    expect(normalizeServerUrl("127.0.0.1:6185/astrbot/")).toBe(
      "http://127.0.0.1:6185/astrbot",
    );
    expect(normalizeServerUrl("[::1]:6185/")).toBe("http://[::1]:6185");
    expect(normalizeServerUrl(undefined)).toBe(DEFAULT_SERVER_URL);
  });

  it("rejects URLs that cannot safely identify a Dashboard origin", () => {
    expect(() => normalizeServerUrl("ftp://example.com")).toThrow("http or https");
    expect(() => normalizeServerUrl("https://user:password@example.com")).toThrow(
      "must not contain a username or password",
    );
    expect(() => normalizeServerUrl("https://example.com/?token=secret")).toThrow(
      "query string or fragment",
    );
  });

  it("uses explicit server, then environment overrides, then profile", () => {
    const previous = {
      astrTui: process.env.ASTR_TUI_SERVER,
      astrbot: process.env.ASTRBOT_DASHBOARD_URL,
      dashboard: process.env.DASHBOARD_URL,
    };
    try {
      process.env.ASTR_TUI_SERVER = "https://env-one.example";
      process.env.ASTRBOT_DASHBOARD_URL = "https://env-two.example";
      process.env.DASHBOARD_URL = "https://env-three.example";
      expect(resolveServerUrl(undefined, "https://profile.example")).toBe(
        "https://env-one.example",
      );
      expect(resolveServerUrl("https://flag.example", "https://profile.example")).toBe(
        "https://flag.example",
      );
      delete process.env.ASTR_TUI_SERVER;
      expect(resolveServerUrl(undefined, "https://profile.example")).toBe(
        "https://env-two.example",
      );
    } finally {
      restoreEnv("ASTR_TUI_SERVER", previous.astrTui);
      restoreEnv("ASTRBOT_DASHBOARD_URL", previous.astrbot);
      restoreEnv("DASHBOARD_URL", previous.dashboard);
    }
  });
});

describe("profile persistence", () => {
  it("normalizes and atomically saves a profile", async () => {
    const profilePath = join(tempDir, "nested", "config.json");
    await saveProfile(
      { serverUrl: "https://EXAMPLE.com:443/astrbot/", username: "astrbot" },
      profilePath,
    );

    expect(await loadProfile(profilePath)).toEqual({
      serverUrl: "https://example.com/astrbot",
      username: "astrbot",
    });
    const raw = await readFile(profilePath, "utf8");
    expect(JSON.parse(raw).username).toBe("astrbot");
    expect((await stat(profilePath)).isFile()).toBe(true);
    if (process.platform !== "win32") {
      expect((await stat(profilePath)).mode & 0o777).toBe(0o600);
    }
  });

  it("returns null for missing or invalid-shape profile files", async () => {
    expect(await loadProfile(join(tempDir, "missing.json"))).toBeNull();
    const profilePath = join(tempDir, "config.json");
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(profilePath, "[]", "utf8"),
    );
    expect(await loadProfile(profilePath)).toBeNull();
  });

  it("preserves a malformed profile error instead of silently replacing it", async () => {
    const profilePath = join(tempDir, "config.json");
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(profilePath, "{broken", "utf8"),
    );
    await expect(loadProfile(profilePath)).rejects.toThrow();
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
