import { createRoleCheckerFromConfig } from "./create-role-checker.js";

const config = {
  realm: "master",
  roles: ["admin", "editor"] as const,
  clientRoles: {
    "example-spa": ["read", "write"] as const,
  },
} as const;

const checker = createRoleCheckerFromConfig(undefined, config);

checker.hasRealmRole("admin");
checker.hasRealmRole("editor");
// @ts-expect-error — not a configured realm role
checker.hasRealmRole("typo");

checker.hasClientRole("example-spa", "read");
// @ts-expect-error — not a configured client role
checker.hasClientRole("example-spa", "typo");
// @ts-expect-error — unknown client id
checker.hasClientRole("other-client", "read");
