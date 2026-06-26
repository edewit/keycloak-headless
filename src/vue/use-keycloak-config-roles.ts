import type { Ref } from "vue";
import { computed } from "vue";

import type { AuthState } from "../components/provider/kc-context.js";
import type { KeycloakRolesConfig } from "../roles/keycloak-config.js";
import { createRoleCheckerFromConfig } from "../roles/create-role-checker.js";

/** Typed realm/client role checks from exported Keycloak config + `useKeycloakAuth`. */
export function useKeycloakConfigRoles<const C extends KeycloakRolesConfig>(
  auth: Ref<AuthState>,
  config: C,
) {
  return computed(() => createRoleCheckerFromConfig(auth.value.oidc, config));
}
