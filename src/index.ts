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

// Error handling exports
export {
  KeycloakError,
  KeycloakInitError,
  KeycloakAuthError,
  KeycloakTokenError,
  KeycloakConfigError,
  KeycloakNetworkError,
  ErrorCodes,
  wrapError,
  isConfigError,
  isNetworkError,
  type ErrorCode,
} from "./errors/keycloak-errors.js";

// Error logging exports
export {
  ConsoleErrorLogger,
  MemoryErrorLogger,
  RemoteErrorLogger,
  CompositeErrorLogger,
  defaultErrorLogger,
  LogLevel,
  type ErrorLogger,
  type ErrorLogEntry,
} from "./errors/error-logger.js";

// Event detail types
export type {
  KcErrorDetail,
  KcRetryDetail,
  KcStateChangeDetail,
} from "./components/provider/kc-provider.js";
