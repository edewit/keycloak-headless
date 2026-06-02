export { KeycloakProvider } from "./keycloak-provider.js";
export type { KeycloakProviderProps } from "./keycloak-provider.js";
export { AuthBridge, AuthReactContext, useAuth } from "./auth-context.js";
export { authContext, type AuthState } from "../components/provider/kc-context.js";
export { subscribeAuthContext } from "../subscribe-auth-context.js";
export { useKeycloakConfigRoles, useRealmRoles } from "./use-realm-roles.js";
export type { KeycloakRolesConfig } from "../roles/keycloak-config.js";
export {
  createClientRoleChecker,
  createRealmRoleChecker,
  createRoleCheckerFromConfig,
} from "../roles/create-role-checker.js";

// Error handling components
export { ErrorDisplay } from "./error-display.js";
export type { ErrorDisplayProps } from "./error-display.js";
export { ErrorBoundary } from "./error-boundary.js";
export type { ErrorBoundaryProps, ErrorBoundaryState } from "./error-boundary.js";

// Re-export error types for convenience
export {
  KeycloakError,
  KeycloakInitError,
  KeycloakAuthError,
  KeycloakTokenError,
  KeycloakConfigError,
  KeycloakNetworkError,
  ErrorCodes,
  type ErrorCode,
} from "../errors/keycloak-errors.js";
