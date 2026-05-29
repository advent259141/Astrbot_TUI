import { DashboardClient } from "../api/client.js";
import { createTokenStore } from "./tokenStore.js";
import { loadProfile, resolveServerUrl, saveProfile } from "../config/index.js";

export interface LoginOptions {
  serverUrl: string;
  username: string;
  password: string;
}

export async function login(options: LoginOptions): Promise<{
  username: string;
  tokenStoreKind: string;
}> {
  const client = new DashboardClient({ baseUrl: options.serverUrl });
  const data = await client.login(options.username, options.password);
  const store = await createTokenStore();
  await store.set(options.serverUrl, data.token);
  await saveProfile({
    serverUrl: options.serverUrl,
    username: data.username || options.username,
  });
  return {
    username: data.username || options.username,
    tokenStoreKind: store.kind,
  };
}

export async function logout(serverFlag?: string): Promise<{
  serverUrl: string;
  tokenStoreKind: string;
}> {
  const profile = await loadProfile();
  const serverUrl = resolveServerUrl(serverFlag || profile?.serverUrl);
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
  const serverUrl = resolveServerUrl(serverFlag || profile?.serverUrl);
  const store = await createTokenStore();
  const token = await store.get(serverUrl);
  if (!token) {
    throw new Error(`No token for ${serverUrl}. Run astr-tui login first.`);
  }
  return {
    client: new DashboardClient({ baseUrl: serverUrl, token }),
    serverUrl,
    username: profile?.username,
    tokenStoreKind: store.kind,
  };
}
