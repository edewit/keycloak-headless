import { describe, expect, it } from "vitest";

import {
  createClientRoleChecker,
  createRealmRoleChecker,
  createRoleCheckerFromConfig,
} from "./create-role-checker.js";

function mockKeycloak(
  realm: Record<string, boolean>,
  resource?: Record<string, boolean>,
) {
  return {
    hasRealmRole(role: string) {
      return realm[role] === true;
    },
    hasResourceRole(role: string, clientId?: string) {
      const key =
        clientId == null || clientId === ""
          ? `_:${role}`
          : `${clientId}:${role}`;
      return resource?.[key] === true;
    },
  };
}

describe("createRoleChecker", () => {
  it("createRealmRoleChecker checks realm roles", () => {
    const kc = mockKeycloak({ admin: true, editor: false });
    const { hasRealmRole } = createRealmRoleChecker(kc, ["admin", "editor"] as const);
    expect(hasRealmRole("admin")).toBe(true);
    expect(hasRealmRole("editor")).toBe(false);
  });

  it("createClientRoleChecker checks client roles", () => {
    const kc = mockKeycloak({}, { "my-api:read": true });
    const { hasClientRole } = createClientRoleChecker(
      kc,
      "my-api",
      ["read", "write"] as const,
    );
    expect(hasClientRole("read")).toBe(true);
    expect(hasClientRole("write")).toBe(false);
  });

  it("createRoleCheckerFromConfig exposes realm and client helpers", () => {
    const kc = mockKeycloak(
      { admin: true },
      { "example-spa:read": true },
    );
    const checker = createRoleCheckerFromConfig(kc, {
      realm: "master",
      roles: ["admin"] as const,
      clientRoles: {
        "example-spa": ["read", "write"] as const,
      },
    });
    expect(checker.hasRealmRole("admin")).toBe(true);
    expect(checker.hasClientRole("example-spa", "read")).toBe(true);
    expect(checker.hasClientRole("example-spa", "write")).toBe(false);
  });
});
