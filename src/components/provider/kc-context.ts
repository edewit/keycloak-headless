import { createContext } from "@lit/context";
import Keycloak from "keycloak-js";

export interface AuthState {
  keycloak?: Keycloak;
  authenticated?: boolean;
  /** Set when Keycloak initialization fails, or when the adapter reports an auth error. */
  error?: unknown;
  /** Indicates if authentication is currently loading/initializing */
  loading?: boolean;
  /** Optional message to display during loading */
  loadingMessage?: string;
}

export const authContext = createContext<AuthState>(Symbol("authContext"));
