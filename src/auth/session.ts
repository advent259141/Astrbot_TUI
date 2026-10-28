import { ApiError } from "../api/errors.js";
import { DashboardClient } from "../api/client.js";
import type { LoginResponse } from "../api/types.js";
import { loadProfile, normalizeServerUrl, resolveServerUrl, saveProfile } from "../config/index.js";
import { createTokenStore } from "./tokenStore.js";

export interface LoginOptions {
  serverUrl: string;
  username: string;
  password: string;
  code?: string;
  confirmPassword?: string;
}

export class DashboardSetupRequiredError extends Error {
  constructor() {
    super("This Dashboard has not been set up. Create its first account to continue.");
    this.name = "DashboardSetupRequiredError";
  }
}

export class DashboardSetupCompletedError extends Error {
  constructor() {
    super("Dashboard setup is already complete. Sign in with the existing account credentials.");
    this.name = "DashboardSetupCompletedError";
  }
}

export class NoStoredTokenError extends Error {
  constructor(serverUrl: string) {
    super(`No token for ${serverUrl}. Run astr-tui login first.`);
    this.name = "NoStoredTokenError";
  }
}

export function isTotpRequiredError(error: unknown): boolean {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== "object") {
    return false;
  }
  return (error.data as { totp_required?: unknown }).totp_required === true;
}

export async function isServerSetupRequired(serverUrl: string): Promise<boolean> {
  const client = new DashboardClient({ baseUrl: normalizeServerUrl(serverUrl) });
  try {
    const status = await client.getAuthSetupStatus();
    return status.setup_required === true;
  } catch (error) {
    // Older Dashboard versions do not expose setup-status; preserve their login flow.
    if (error instanceof ApiError && error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

export async function login(options: LoginOptions): Promise<{
  username: string;
  tokenStoreKind: string;
}> {
  const serverUrl = normalizeServerUrl(options.serverUrl);
  const client = new DashboardClient({ baseUrl: serverUrl });
  const setupRequired = await isServerSetupRequired(serverUrl);
  let data: LoginResponse;
  if (setupRequired) {
    if (options.confirmPassword === undefined) {
      throw new DashboardSetupRequiredError();
    }
    if (options.password !== options.confirmPassword) {
      throw new Error("Passwords do not match.");
    }
    data = await client.setup(options.username, options.password, options.confirmPassword);
  } else {
    if (options.confirmPassword !== undefined) {
      throw new DashboardSetupCompletedError();
    }
    data = await client.login(options.username, options.password, options.code);
  }
  if (typeof data.token !== "string" || !data.token.trim()) {
    throw new ApiError("Dashboard login returned an empty token.");
  }

  const store = await createTokenStore();
  await store.set(serverUrl, data.token);
  const username = data.username || options.username;
  await saveProfile({ serverUrl, username });
  return {
    username,
    tokenStoreKind: store.kind,
  };
}

export async function logout(serverFlag?: string): Promise<{
  serverUrl: string;
  tokenStoreKind: string;
}> {
  const profile = await loadProfile();
  const serverUrl = resolveServerUrl(serverFlag, profile?.serverUrl);
  const store = await createTokenStore();
  const token = await store.get(serverUrl);
  if (token) {
    await new DashboardClient({ baseUrl: serverUrl, token }).logout().catch(() => {});
  }
  await store.delete(serverUrl);
  return {
    serverUrl,
    tokenStoreKind: store.kind,
  };
}

export async function getAuthenticatedClient(serverFlag?: string): Promise<{
  client: DashboardClient;
  serverUrl: string;
  username?: string;
  tokenStoreKind: string;
}> {
  const profile = await loadProfile();
  const serverUrl = resolveServerUrl(serverFlag, profile?.serverUrl);
  const store = await createTokenStore();
  const token = await store.get(serverUrl);
  if (!token) {
    throw new NoStoredTokenError(serverUrl);
  }
  return {
    client: new DashboardClient({ baseUrl: serverUrl, token }),
    serverUrl,
    username: profile?.serverUrl === serverUrl ? profile.username : undefined,
    tokenStoreKind: store.kind,
  };
}
