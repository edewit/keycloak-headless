import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { type AuthState } from "../components/provider/kc-context.js";
import { subscribeAuthContext } from "../subscribe-auth-context.js";

export const AuthReactContext = createContext<AuthState>({});

export function AuthBridge({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [auth, setAuth] = useState<AuthState>({});

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    return subscribeAuthContext(el, setAuth);
  }, []);

  return (
    <AuthReactContext.Provider value={auth}>
      <div ref={hostRef}>{children}</div>
    </AuthReactContext.Provider>
  );
}

/**
 * React hook to access OIDC authentication state.
 *
 * @returns {AuthState} Current authentication state
 * @returns {Oidc | undefined} returns.oidc - oidc-spa client (undefined during initialization)
 * @returns {boolean | undefined} returns.authenticated - Authentication status
 */
export function useAuth(): AuthState {
  return useContext(AuthReactContext);
}
