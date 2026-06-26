import KcAdminClient from "@keycloak/keycloak-admin-client";
import type ClientRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";

export const DEFAULT_KEYCLOAK_BASE_URL = "http://127.0.0.1:8080";
export const DEFAULT_KEYCLOAK_TIMEOUT_MS = 120_000;
export const DEFAULT_VITE_DEV_ORIGIN = "http://localhost:5173";

export type SpaClientStatus = "created" | "updated" | "unchanged";
export type RealmStatus = "created" | "unchanged";
export type RealmUserStatus = "created" | "unchanged";

export const DEFAULT_REALM_USER_ROLE = "admin";

export interface AdminCredentials {
  username: string;
  password: string;
}

export function normalizeKeycloakBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function resolveAdminCredentials(): AdminCredentials {
  return {
    username:
      process.env.KEYCLOAK_ADMIN_USERNAME ??
      process.env.KEYCLOAK_ADMIN_USER ??
      "admin",
    password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin",
  };
}

export function resolveRealmUserCredentials(): AdminCredentials {
  return {
    username: process.env.KEYCLOAK_REALM_USERNAME ?? "user",
    password: process.env.KEYCLOAK_REALM_PASSWORD ?? "user",
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SERVER_PROBE_REALM = "master";
const REALM_READY_TIMEOUT_MS = 30_000;

function buildRealmUrl(baseUrl: string, realm: string): string {
  return `${normalizeKeycloakBaseUrl(baseUrl)}/realms/${encodeURIComponent(realm)}`;
}

function expandHostVariants(baseUrl: string): string[] {
  const normalized = normalizeKeycloakBaseUrl(baseUrl);
  const variants = new Set([normalized]);

  try {
    const url = new URL(normalized);
    const port = url.port ? `:${url.port}` : "";

    if (url.hostname === "localhost") {
      variants.add(`${url.protocol}//127.0.0.1${port}`);
    } else if (url.hostname === "127.0.0.1") {
      variants.add(`${url.protocol}//localhost${port}`);
    }
  } catch {
    // keep the original URL only
  }

  return [...variants];
}

function buildRealmProbeUrls(baseUrl: string, realm: string): string[] {
  const urls = new Set<string>();
  for (const base of expandHostVariants(baseUrl)) {
    urls.add(buildRealmUrl(base, realm));
  }
  return [...urls];
}

function buildServerProbeUrls(baseUrl: string): string[] {
  return buildRealmProbeUrls(baseUrl, SERVER_PROBE_REALM);
}

async function probeKeycloakUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

async function probeKeycloakUrls(urls: string[]): Promise<boolean> {
  if (urls.length === 0) {
    return false;
  }

  const results = await Promise.all(urls.map((url) => probeKeycloakUrl(url)));
  return results.some(Boolean);
}

export async function isKeycloakServerUp(baseUrl: string): Promise<boolean> {
  return probeKeycloakUrls(buildServerProbeUrls(baseUrl));
}

export async function isKeycloakRealmUp(
  baseUrl: string,
  realm: string,
): Promise<boolean> {
  return probeKeycloakUrls(buildRealmProbeUrls(baseUrl, realm));
}

export async function waitForKeycloakRealm(
  baseUrl: string,
  realm: string,
  timeoutMs = DEFAULT_KEYCLOAK_TIMEOUT_MS,
): Promise<void> {
  const normalized = normalizeKeycloakBaseUrl(baseUrl);
  const realmUrls = buildRealmProbeUrls(normalized, realm);
  const started = Date.now();
  let attempt = 0;

  while (Date.now() - started < timeoutMs) {
    if (await probeKeycloakUrls(realmUrls)) {
      return;
    }

    const backoff = Math.min(500 + attempt * 200, 3000);
    attempt += 1;
    await delay(backoff);
  }

  throw new Error(
    `Realm "${realm}" did not become ready within ${timeoutMs}ms (${normalized})`,
  );
}

export async function waitForKeycloakServer(
  baseUrl: string,
  timeoutMs = DEFAULT_KEYCLOAK_TIMEOUT_MS,
): Promise<void> {
  return waitForKeycloakRealm(baseUrl, SERVER_PROBE_REALM, timeoutMs);
}

export async function waitForKeycloak(
  baseUrl: string,
  realm: string,
  timeoutMs = DEFAULT_KEYCLOAK_TIMEOUT_MS,
): Promise<void> {
  return waitForKeycloakRealm(baseUrl, realm, timeoutMs);
}

export async function isKeycloakReady(
  baseUrl: string,
  realm: string,
): Promise<boolean> {
  if (await isKeycloakRealmUp(baseUrl, realm)) {
    return true;
  }

  return isKeycloakServerUp(baseUrl);
}

export async function authenticateAdminClient(options: {
  baseUrl: string;
  realm?: string;
  credentials?: AdminCredentials;
}): Promise<KcAdminClient> {
  const credentials = options.credentials ?? resolveAdminCredentials();
  const client = new KcAdminClient({
    baseUrl: normalizeKeycloakBaseUrl(options.baseUrl),
    realmName: SERVER_PROBE_REALM,
  });

  await client.auth({
    username: credentials.username,
    password: credentials.password,
    grantType: "password",
    clientId: "admin-cli",
  });

  if (options.realm && options.realm !== SERVER_PROBE_REALM) {
    client.setConfig({ realmName: options.realm });
  }

  return client;
}

export async function ensureRealm(options: {
  baseUrl: string;
  realm: string;
  credentials?: AdminCredentials;
}): Promise<RealmStatus> {
  if (await isKeycloakRealmUp(options.baseUrl, options.realm)) {
    return "unchanged";
  }

  const admin = await authenticateAdminClient({
    baseUrl: options.baseUrl,
    credentials: options.credentials,
  });

  const existing = await admin.realms.findOne({ realm: options.realm });
  if (existing?.id) {
    await waitForKeycloakRealm(
      options.baseUrl,
      options.realm,
      REALM_READY_TIMEOUT_MS,
    );
    return "unchanged";
  }

  await admin.realms.create({
    realm: options.realm,
    enabled: true,
  });

  await waitForKeycloakRealm(
    options.baseUrl,
    options.realm,
    REALM_READY_TIMEOUT_MS,
  );
  return "created";
}

async function ensureRealmRole(
  admin: KcAdminClient,
  roleName: string,
): Promise<RoleRepresentation> {
  const existing = await admin.roles.findOneByName({ name: roleName });
  if (existing) {
    return existing;
  }

  await admin.roles.create({ name: roleName });
  const created = await admin.roles.findOneByName({ name: roleName });
  if (!created) {
    throw new Error(`Failed to create realm role "${roleName}".`);
  }

  return created;
}

export async function ensureRealmUser(options: {
  baseUrl: string;
  realm: string;
  credentials?: AdminCredentials;
  user?: AdminCredentials;
  roleName?: string;
}): Promise<RealmUserStatus> {
  const userCredentials = options.user ?? resolveRealmUserCredentials();
  const roleName = options.roleName ?? DEFAULT_REALM_USER_ROLE;
  const admin = await authenticateAdminClient({
    baseUrl: options.baseUrl,
    realm: options.realm,
    credentials: options.credentials,
  });

  const existingUsers = await admin.users.find({
    username: userCredentials.username,
    exact: true,
    max: 1,
  });
  if (existingUsers[0]?.id) {
    return "unchanged";
  }

  const { id: userId } = await admin.users.create({
    username: userCredentials.username,
    enabled: true,
    emailVerified: true,
    firstName: "Demo",
    lastName: "User",
  });

  await admin.users.resetPassword({
    id: userId,
    credential: {
      type: "password",
      value: userCredentials.password,
      temporary: false,
    },
  });

  const role = await ensureRealmRole(admin, roleName);
  await admin.users.addRealmRoleMappings({
    id: userId,
    roles: [{ id: role.id!, name: role.name! }],
  });

  return "created";
}

function buildSpaClientRepresentation(clientId: string): ClientRepresentation {
  const devOrigin = DEFAULT_VITE_DEV_ORIGIN;
  return {
    clientId,
    name: clientId,
    enabled: true,
    protocol: "openid-connect",
    publicClient: true,
    standardFlowEnabled: true,
    directAccessGrantsEnabled: false,
    implicitFlowEnabled: false,
    redirectUris: [`${devOrigin}/`],
    webOrigins: [devOrigin],
    attributes: {
      "pkce.code.challenge.method": "S256",
    },
  };
}

function spaClientNeedsUpdate(
  existing: ClientRepresentation,
  desired: ClientRepresentation,
): boolean {
  const sameRedirectUris =
    JSON.stringify([...(existing.redirectUris ?? [])].sort()) ===
    JSON.stringify([...(desired.redirectUris ?? [])].sort());
  const sameWebOrigins =
    JSON.stringify([...(existing.webOrigins ?? [])].sort()) ===
    JSON.stringify([...(desired.webOrigins ?? [])].sort());

  return (
    existing.enabled !== desired.enabled ||
    existing.publicClient !== desired.publicClient ||
    existing.standardFlowEnabled !== desired.standardFlowEnabled ||
    !sameRedirectUris ||
    !sameWebOrigins
  );
}

export async function ensureSpaClient(options: {
  baseUrl: string;
  realm: string;
  clientId: string;
  credentials?: AdminCredentials;
}): Promise<SpaClientStatus> {
  const admin = await authenticateAdminClient({
    baseUrl: options.baseUrl,
    realm: options.realm,
    credentials: options.credentials,
  });

  const desired = buildSpaClientRepresentation(options.clientId);
  const matches = await admin.clients.find({
    clientId: options.clientId,
    max: 1,
  });
  const existing = matches[0];

  if (!existing?.id) {
    await admin.clients.create(desired);
    return "created";
  }

  if (!spaClientNeedsUpdate(existing, desired)) {
    return "unchanged";
  }

  await admin.clients.update(
    { id: existing.id },
    {
      ...existing,
      ...desired,
      clientId: options.clientId,
    },
  );
  return "updated";
}
