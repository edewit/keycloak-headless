import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  generateKeycloakConfig,
  parseRealmRolesExport,
} from "./generate-keycloak-config.js";

const fixturePath = resolve(
  import.meta.dirname,
  "../../scripts/fixtures/master-roles.json",
);

describe("generateKeycloakConfig", () => {
  it("emits sorted realm and client roles with as const", () => {
    const data = parseRealmRolesExport(readFileSync(fixturePath, "utf8"));
    const out = generateKeycloakConfig(data, "master-roles.json");

    expect(out).toContain('realm: "master"');
    expect(out).toContain("exportedAt: 1710000000000");
    expect(out).toContain(
      'roles: ["admin", "editor", "viewer"] as const',
    );
    expect(out).toContain('"example-spa": ["read", "write"] as const');
    expect(out).toContain("export type RealmRole");
    expect(out).toContain("export type ClientId");
    expect(out).toContain("type ClientRolesById = (typeof KEYCLOAK_CONFIG)[\"clientRoles\"]");
  });

  it("omits clientRoles when export has no client roles", () => {
    const data = parseRealmRolesExport(readFileSync(fixturePath, "utf8"));
    const out = generateKeycloakConfig({
      ...data,
      roles: { realm: data.roles.realm },
    });

    expect(out).not.toMatch(/clientRoles:\s*\{/);
    expect(out).toContain('roles: ["admin", "editor", "viewer"] as const');
  });
});
