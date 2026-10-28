import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const SERVICE_NAME = "astr-tui";
const FALLBACK_TOKEN_PATH = join(homedir(), ".astr-tui", "tokens.json");

export interface TokenStore {
  kind: "keychain" | "file";
  get(serverUrl: string): Promise<string | null>;
  set(serverUrl: string, token: string): Promise<void>;
  delete(serverUrl: string): Promise<void>;
}

interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export async function createTokenStore(): Promise<TokenStore> {
  const keytar = await loadKeytar();
  if (keytar) {
    return new KeychainTokenStore(keytar);
  }
  return new FileTokenStore(FALLBACK_TOKEN_PATH);
}

export class KeychainTokenStore implements TokenStore {
  readonly kind = "keychain" as const;

  constructor(private readonly keytar: KeytarLike) {}

  get(serverUrl: string): Promise<string | null> {
    return this.keytar.getPassword(SERVICE_NAME, accountFor(serverUrl));
  }

  set(serverUrl: string, token: string): Promise<void> {
    return this.keytar.setPassword(SERVICE_NAME, accountFor(serverUrl), token);
  }

  async delete(serverUrl: string): Promise<void> {
    await this.keytar.deletePassword(SERVICE_NAME, accountFor(serverUrl));
  }
}

export class FileTokenStore implements TokenStore {
  readonly kind = "file" as const;

  constructor(private readonly filePath: string) {}

  async get(serverUrl: string): Promise<string | null> {
    const tokens = await this.readTokens();
    const key = accountFor(serverUrl);
    const legacyKey = Object.keys(tokens).find((candidate) => accountFor(candidate) === key);
    const token = tokens[key] ?? (legacyKey ? tokens[legacyKey] : undefined);
    return typeof token === "string" && token ? token : null;
  }

  async set(serverUrl: string, token: string): Promise<void> {
    const tokens = await this.readTokens();
    const key = accountFor(serverUrl);
    for (const candidate of Object.keys(tokens)) {
      if (candidate !== key && accountFor(candidate) === key) {
        delete tokens[candidate];
      }
    }
    tokens[key] = token;
    await this.writeTokens(tokens);
  }

  async delete(serverUrl: string): Promise<void> {
    const tokens = await this.readTokens();
    const key = accountFor(serverUrl);
    for (const candidate of Object.keys(tokens)) {
      if (candidate === key || accountFor(candidate) === key) {
        delete tokens[candidate];
      }
    }
    await this.writeTokens(tokens);
  }

  private async readTokens(): Promise<Record<string, string>> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`Invalid token store format in ${this.filePath}.`);
      }
      const tokens = Object.create(null) as Record<string, string>;
      for (const [serverUrl, token] of Object.entries(parsed)) {
        if (typeof token !== "string") {
          throw new Error(`Invalid token entry for ${serverUrl} in ${this.filePath}.`);
        }
        tokens[serverUrl] = token;
      }
      return tokens;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }

  private async writeTokens(tokens: Record<string, string>): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(
        temporaryPath,
        `${JSON.stringify(tokens, null, 2)}\n`,
        { encoding: "utf8", mode: 0o600, flag: "wx" },
      );
      if (process.platform !== "win32") {
        await chmod(temporaryPath, 0o600);
      }
      await rename(temporaryPath, this.filePath);
    } finally {
      await unlink(temporaryPath).catch(() => {});
    }
  }
}

function accountFor(serverUrl: string): string {
  const raw = serverUrl.trim().replace(/\/+$/, "");
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    return raw;
  }
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    ) {
      return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
    }
  } catch {
    // Preserve unusual legacy account keys so they can still be removed.
  }
  return raw;
}

async function loadKeytar(): Promise<KeytarLike | null> {
  try {
    const module = (await import("keytar")) as Partial<KeytarLike> & {
      default?: Partial<KeytarLike>;
    };
    if (isKeytarLike(module)) {
      return module;
    }
    if (module.default && isKeytarLike(module.default)) {
      return module.default;
    }
    return null;
  } catch {
    return null;
  }
}

function isKeytarLike(value: unknown): value is KeytarLike {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<KeytarLike>;
  return (
    typeof candidate.getPassword === "function" &&
    typeof candidate.setPassword === "function" &&
    typeof candidate.deletePassword === "function"
  );
}
