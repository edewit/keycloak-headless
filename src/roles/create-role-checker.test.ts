import { describe, expect, it } from "vitest";

import {
  createClientRoleChecker,
  createRealmRoleChecker,
  createRoleCheckerFromConfig,
} from "./create-role-checker.js";

describe("createRoleChecker", () => {
  it("createRealmRoleChecker checks realm roles", () => {
    const { hasRealmRole } = createRealmRoleChecker(["admin"], [
      "admin",
      "editor",
    ] as const);
    expect(hasRealmRole("admin")).toBe(true);
    expect(hasRealmRole("editor")).toBe(false);
  });

  it("createClientRoleChecker checks client roles", () => {
    const { hasClientRole } = createClientRoleChecker(["read"], "my-api", [
      "read",
      "write",
    ] as const);
    expect(hasClientRole("read")).toBe(true);
    expect(hasClientRole("write")).toBe(false);
  });

  it("createRoleCheckerFromConfig exposes realm and client helpers", () => {
    const oidc = {
      isUserLoggedIn: true as const,
      issuerUri: "http://localhost:8080/realms/master",
      clientId: "example-spa",
      validRedirectUri: "http://localhost:5173/",
      getDecodedIdToken: () => ({
        realm_access: { roles: ["admin"] },
        resource_access: {
          "example-spa": { roles: ["read"] },
        },
      }),
    };

    const checker = createRoleCheckerFromConfig(oidc, {
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
