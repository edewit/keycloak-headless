import type { KeycloakRolesConfig } from "../roles/keycloak-config.js";
import {
  createRealmRoleChecker,
  createRoleCheckerFromConfig,
} from "../roles/create-role-checker.js";

import { useAuth } from "./auth-context.js";

export function useRealmRoles<const T extends readonly string[]>(roles: T) {
  const { keycloak } = useAuth();
  return createRealmRoleChecker(keycloak, roles);
}

export function useKeycloakConfigRoles<const C extends KeycloakRolesConfig>(
  config: C,
) {
  const { keycloak } = useAuth();
  return createRoleCheckerFromConfig(keycloak, config);
}
