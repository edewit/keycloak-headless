// Main entry: context types only (no custom element registration).
// Import `keycloak-headless/provider` to register web components.
export { authContext, type AuthState } from "./components/provider/kc-context.js";
export { subscribeAuthContext } from "./subscribe-auth-context.js";
export type {
  RealmRolesExport,
  RoleRepresentation,
  RolesRepresentation,
} from "./types/realm-roles-export.js";
export type { KeycloakRolesConfig } from "./roles/keycloak-config.js";
export {
  createClientRoleChecker,
  createRealmRoleChecker,
  createRoleCheckerFromConfig,
} from "./roles/create-role-checker.js";
