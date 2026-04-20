import { createContext } from "@lit/context";
import Keycloak from "keycloak-js";

export interface AuthState {
  keycloak?: Keycloak;
  authenticated?: boolean;
  /** Set when Keycloak initialization fails, or when the adapter reports an auth error. */
  error?: unknown;
}

export const authContext = createContext<AuthState>(Symbol("authContext"));
