import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { RealmRolesExport } from "../types/realm-roles-export.js";

function sortedRoleNames(
  roles: { name?: string }[] | undefined,
): string[] {
  return (roles ?? [])
    .map((r) => r.name)
    .filter((name): name is string => name != null && name !== "")
    .sort((a, b) => a.localeCompare(b));
}

function sortedClientRoles(
  client: Record<string, { name?: string }[]> | undefined,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (client == null) {
    return out;
  }
  const clientIds = Object.keys(client).sort((a, b) => a.localeCompare(b));
  for (const clientId of clientIds) {
    const names = sortedRoleNames(client[clientId]);
    if (names.length > 0) {
      out[clientId] = names;
    }
  }
  return out;
}

function formatStringArray(values: string[]): string {
  if (values.length === 0) {
    return "[] as const";
  }
  const items = values.map((v) => JSON.stringify(v)).join(", ");
  return `[${items}] as const`;
}

function formatClientRoles(clientRoles: Record<string, string[]>): string | null {
  const entries = Object.entries(clientRoles);
  if (entries.length === 0) {
    return null;
  }
  const lines = entries.map(
    ([clientId, roles]) => `    ${JSON.stringify(clientId)}: ${formatStringArray(roles)},`,
  );
  return `  clientRoles: {\n${lines.join("\n")}\n  },`;
}

/**
 * Generate TypeScript source for KEYCLOAK_CONFIG from a realm roles export document.
 */
export function generateKeycloakConfig(
  data: RealmRolesExport,
  sourceLabel = "realm roles export",
): string {
  const realmRoles = sortedRoleNames(data.roles?.realm);
  const clientRoles = sortedClientRoles(data.roles?.client);

  const clientBlock = formatClientRoles(clientRoles);
  const configBody = [
    `  realm: ${JSON.stringify(data.realm)},`,
    `  exportedAt: ${data.exportedAt},`,
    `  roles: ${formatStringArray(realmRoles)},`,
    ...(clientBlock != null ? [clientBlock] : []),
  ].join("\n");

  return `/** Generated from ${sourceLabel} — do not edit. */
export const KEYCLOAK_CONFIG = {
${configBody}
} as const;

export type RealmRole = (typeof KEYCLOAK_CONFIG.roles)[number];
type ClientRolesById = (typeof KEYCLOAK_CONFIG)["clientRoles"];
export type ClientId = ClientRolesById extends Record<string, readonly string[]>
  ? keyof ClientRolesById
  : never;
export type ClientRole<C extends ClientId> = ClientRolesById extends Record<
  string,
  readonly string[]
>
  ? C extends keyof ClientRolesById
    ? ClientRolesById[C][number]
    : never
  : never;
`;
}

export function parseRealmRolesExport(json: string): RealmRolesExport {
  const data = JSON.parse(json) as RealmRolesExport;
  if (data == null || typeof data.realm !== "string") {
    throw new Error("Invalid realm roles export: missing realm");
  }
  if (typeof data.exportedAt !== "number") {
    throw new Error("Invalid realm roles export: missing exportedAt");
  }
  if (data.roles == null || typeof data.roles !== "object") {
    throw new Error("Invalid realm roles export: missing roles");
  }
  return data;
}

/**
 * Read export JSON from disk and write generated config if content changed.
 * @returns true when the output file was updated
 */
export function generateKeycloakConfigFile(
  inputPath: string,
  outputPath: string,
): boolean {
  const resolvedInput = resolve(inputPath);
  const resolvedOutput = resolve(outputPath);
  const json = readFileSync(resolvedInput, "utf8");
  const data = parseRealmRolesExport(json);
  const sourceLabel = resolvedInput;
  const next = generateKeycloakConfig(data, sourceLabel);

  let previous: string | undefined;
  try {
    previous = readFileSync(resolvedOutput, "utf8");
  } catch {
    previous = undefined;
  }

  if (previous === next) {
    return false;
  }

  writeFileSync(resolvedOutput, next, "utf8");
  return true;
}

/** Resolve paths relative to an optional project root (Vite config.root). */
export function resolveKeycloakRolesPaths(
  options: { input: string; output: string },
  root?: string,
): { input: string; output: string } {
  const base = root != null ? resolve(root) : process.cwd();
  return {
    input: resolve(base, options.input),
    output: resolve(base, options.output),
  };
}
