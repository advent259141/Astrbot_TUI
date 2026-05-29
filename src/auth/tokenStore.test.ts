import { mkdtemp, rm } from "node:fs/promises";
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
    const store = new FileTokenStore(join(tempDir, "tokens.json"));
    await store.set("http://localhost:6185", "token-a");
    await store.set("http://localhost:7000", "token-b");

    expect(await store.get("http://localhost:6185")).toBe("token-a");
    expect(await store.get("http://localhost:7000")).toBe("token-b");

    await store.delete("http://localhost:6185");
    expect(await store.get("http://localhost:6185")).toBeNull();
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
