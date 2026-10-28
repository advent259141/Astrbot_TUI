import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileTokenStore, KeychainTokenStore } from "./tokenStore.js";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "astr-tui-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("FileTokenStore", () => {
  it("stores tokens by server URL", async () => {
    const filePath = join(tempDir, "tokens.json");
    const store = new FileTokenStore(filePath);
    await store.set("http://localhost:6185", "token-a");
    await store.set("http://localhost:7000", "token-b");

    expect(await store.get("http://localhost:6185")).toBe("token-a");
    expect(await store.get("http://localhost:7000")).toBe("token-b");

    await store.delete("http://localhost:6185");
    expect(await store.get("http://localhost:6185")).toBeNull();
    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({
      "http://localhost:7000": "token-b",
    });
    if (process.platform !== "win32") {
      expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    }
  });

  it("rejects a malformed token file instead of overwriting stored data", async () => {
    const filePath = join(tempDir, "tokens.json");
    await writeFile(filePath, "[]", "utf8");
    const store = new FileTokenStore(filePath);

    await expect(store.get("http://localhost:6185")).rejects.toThrow(
      "Invalid token store format",
    );
    await expect(store.set("http://localhost:6185", "token-a")).rejects.toThrow(
      "Invalid token store format",
    );
    expect(await readFile(filePath, "utf8")).toBe("[]");
  });

  it("finds legacy tokens across equivalent host casing and default ports", async () => {
    const filePath = join(tempDir, "tokens.json");
    await writeFile(filePath, JSON.stringify({ "http://LOCALHOST:80/": "legacy-token" }), "utf8");
    const store = new FileTokenStore(filePath);

    expect(await store.get("http://localhost")).toBe("legacy-token");
    await store.set("http://localhost", "renewed-token");
    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({
      "http://localhost": "renewed-token",
    });
  });
});

describe("KeychainTokenStore", () => {
  it("delegates to keytar-compatible storage", async () => {
    const values = new Map<string, string>();
    const keytar = {
      async getPassword(service: string, account: string) {
        return values.get(`${service}:${account}`) || null;
      },
      async setPassword(service: string, account: string, token: string) {
        values.set(`${service}:${account}`, token);
      },
      async deletePassword(service: string, account: string) {
        return values.delete(`${service}:${account}`);
      },
    };
    const store = new KeychainTokenStore(keytar);

    await store.set("http://localhost:6185/", "jwt");
    expect(await store.get("http://localhost:6185")).toBe("jwt");
    await store.delete("http://localhost:6185");
    expect(await store.get("http://localhost:6185")).toBeNull();
  });
});
