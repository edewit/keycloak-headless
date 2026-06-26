import type { KeycloakRolesConfig } from "../roles/keycloak-config.js";
import {
  createRealmRoleChecker,
  createRoleCheckerFromConfig,
} from "../roles/create-role-checker.js";
import { getRealmRoles } from "../oidc/extract-roles.js";

import { useAuth } from "./auth-context.js";

export function useRealmRoles<const T extends readonly string[]>(roles: T) {
  const { oidc } = useAuth();
  const userRealmRoles =
    oidc != null && oidc.isUserLoggedIn === true
      ? getRealmRoles(oidc.getDecodedIdToken())
      : undefined;
  return createRealmRoleChecker(userRealmRoles, roles);
}

export function useKeycloakConfigRoles<const C extends KeycloakRolesConfig>(
  config: C,
) {
  const { oidc } = useAuth();
  return createRoleCheckerFromConfig(oidc, config);
}
