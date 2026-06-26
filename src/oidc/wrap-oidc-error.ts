import { OidcInitializationError } from "oidc-spa/core";

import {
  ErrorCodes,
  KeycloakError,
  KeycloakInitError,
  KeycloakNetworkError,
  wrapError,
  type ErrorCode,
} from "../errors/keycloak-errors.js";

/**
 * Maps oidc-spa initialization errors into the library's KeycloakError hierarchy.
 */
export function wrapOidcError(
  error: unknown,
  defaultCode: ErrorCode = ErrorCodes.INIT_FAILED,
): KeycloakError {
  if (error instanceof OidcInitializationError) {
    if (error.isAuthServerLikelyDown) {
      return new KeycloakNetworkError(
        error.message,
        ErrorCodes.NETWORK_ERROR,
        error,
      );
    }
    return new KeycloakInitError(error.message, defaultCode, error);
  }

  return wrapError(error, defaultCode);
}

export function wrapOidcInitializationError(
  error: OidcInitializationError | undefined,
): KeycloakError | undefined {
  if (error == null) {
    return undefined;
  }
  return wrapOidcError(error);
}
