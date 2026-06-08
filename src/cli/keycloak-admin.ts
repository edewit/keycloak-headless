import KcAdminClient from "@keycloak/keycloak-admin-client";
import type ClientRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js";

export const DEFAULT_KEYCLOAK_BASE_URL = "http://127.0.0.1:8080";
export const DEFAULT_KEYCLOAK_TIMEOUT_MS = 120_000;
export const DEFAULT_VITE_DEV_ORIGIN = "http://localhost:5173";

export type SpaClientStatus = "created" | "updated" | "unchanged";

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForKeycloak(
  baseUrl: string,
  realm: string,
  timeoutMs = DEFAULT_KEYCLOAK_TIMEOUT_MS,
): Promise<void> {
  const normalized = normalizeKeycloakBaseUrl(baseUrl);
  const started = Date.now();
  let attempt = 0;
  const healthUrl = `${normalized}/health/ready`;
  const realmUrl = `${normalized}/realms/${encodeURIComponent(realm)}`;

  while (Date.now() - started < timeoutMs) {
    for (const url of [healthUrl, realmUrl]) {
      try {
        const res = await fetch(url, { method: "GET" });
        if (res.ok) {
          return;
        }
      } catch {
        // retry
      }
    }

    const backoff = Math.min(500 + attempt * 200, 3000);
    attempt += 1;
    await delay(backoff);
  }

  throw new Error(
    `Keycloak did not become ready within ${timeoutMs}ms (${normalized})`,
  );
}

export async function isKeycloakReady(
  baseUrl: string,
  realm: string,
): Promise<boolean> {
  try {
    await waitForKeycloak(baseUrl, realm, 1_000);
    return true;
  } catch {
    return false;
  }
}

export async function authenticateAdminClient(options: {
  baseUrl: string;
  realm: string;
  credentials?: AdminCredentials;
}): Promise<KcAdminClient> {
  const credentials = options.credentials ?? resolveAdminCredentials();
  const client = new KcAdminClient({
    baseUrl: normalizeKeycloakBaseUrl(options.baseUrl),
    realmName: options.realm,
  });

  await client.auth({
    username: credentials.username,
    password: credentials.password,
    grantType: "password",
    clientId: "admin-cli",
  });

  return client;
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
    redirectUris: [`${devOrigin}/*`],
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
