import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
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
    return tokens[accountFor(serverUrl)] || null;
  }

  async set(serverUrl: string, token: string): Promise<void> {
    const tokens = await this.readTokens();
    tokens[accountFor(serverUrl)] = token;
    await this.writeTokens(tokens);
  }

  async delete(serverUrl: string): Promise<void> {
    const tokens = await this.readTokens();
    delete tokens[accountFor(serverUrl)];
    await this.writeTokens(tokens);
  }

  private async readTokens(): Promise<Record<string, string>> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, string>)
        : {};
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }

  private async writeTokens(tokens: Record<string, string>): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(tokens, null, 2)}\n`, "utf8");
    try {
      await chmod(this.filePath, 0o600);
    } catch {
      // Windows may ignore POSIX file modes.
    }
  }
}

function accountFor(serverUrl: string): string {
  return serverUrl.replace(/\/+$/, "");
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
