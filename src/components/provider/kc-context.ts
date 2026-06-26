import { createContext } from "@lit/context";
import type { Oidc } from "oidc-spa/core";

export interface AuthState {
  oidc?: Oidc;
  authenticated?: boolean;
  /** Set when OIDC initialization fails, or when the client reports an auth error. */
  error?: unknown;
  /** Indicates if authentication is currently loading/initializing */
  loading?: boolean;
  /** Optional message to display during loading */
  loadingMessage?: string;
}

export const authContext = createContext<AuthState>(Symbol("authContext"));
