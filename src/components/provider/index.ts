import "../account-link/kc-account-link.js";
import "../login-button/kc-login-button.js";
import "../logout-button/kc-logout-button.js";
import "../render-authenticated/kc-render-authenticated.js";
import "../render-guest/kc-render-guest.js";
import "../render-roles/kc-render-roles.js";
import "../error-display/kc-error-display.js";
import "../loading/kc-loading.js";

export { KcProvider } from "./kc-provider.js";
export type { KcErrorDetail, KcRetryDetail, KcStateChangeDetail } from "./kc-provider.js";
export { authContext, type AuthState } from "./kc-context.js";
export { subscribeAuthContext } from "../../subscribe-auth-context.js";
export { KcAccountLink } from "../account-link/kc-account-link.js";
export { KcLoginButton } from "../login-button/kc-login-button.js";
export { KcLogoutButton } from "../logout-button/kc-logout-button.js";
export { KcRenderAuthenticated } from "../render-authenticated/kc-render-authenticated.js";
export { KcRenderGuest } from "../render-guest/kc-render-guest.js";
export { KcRenderRoles } from "../render-roles/kc-render-roles.js";
export { KcErrorDisplay } from "../error-display/kc-error-display.js";
export { KcLoading } from "../loading/kc-loading.js";

export {
  buildIssuerUri,
  getRealmRoles,
  getClientRoles,
  hasRealmRole,
  hasClientRole,
  setupOidcEarlyInit,
  wrapOidcError,
  wrapOidcInitializationError,
} from "../../oidc/index.js";
export type { Oidc } from "../../oidc/index.js";

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
} from "../../errors/keycloak-errors.js";
