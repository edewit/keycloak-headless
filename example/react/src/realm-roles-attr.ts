import type { RealmRole } from "./keycloak-config.generated.js";

/** Comma-separated roles attribute for `<kc-render-roles>`. */
export function realmRolesAttr(...roles: RealmRole[]): string {
  return roles.join(",");
}
