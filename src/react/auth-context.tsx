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

/**
 * React context for Keycloak authentication state.
 * Provides auth state to all child components via the `useAuth` hook.
 */
export const AuthReactContext = createContext<AuthState>({});

/**
 * Internal bridge component that connects Lit context to React context.
 *
 * This component subscribes to the Lit context from `<kc-provider>` and
 * propagates auth state changes to React components via React Context.
 *
 * @internal
 * @component
 * @param props - Component props
 * @param props.children - React children to render
 */
export function AuthBridge({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [auth, setAuth] = useState<AuthState>({});

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    // Subscribe to Lit context and update React state on changes
    return subscribeAuthContext(el, setAuth);
  }, []);

  return (
    <AuthReactContext.Provider value={auth}>
      <div ref={hostRef}>{children}</div>
    </AuthReactContext.Provider>
  );
}

/**
 * React hook to access Keycloak authentication state.
 *
 * This hook provides access to the current authentication state including
 * the Keycloak instance, authentication status, and any errors. It must be
 * used within a component tree wrapped by `<KeycloakProvider>`.
 *
 * @returns {AuthState} Current authentication state
 * @returns {Keycloak | undefined} returns.keycloak - Keycloak instance (undefined during initialization)
 * @returns {boolean | undefined} returns.authenticated - Authentication status (true/false/undefined)
 * @returns {Error | KeycloakError | undefined} returns.error - Authentication error if any
 *
 * @example Basic usage
 * ```tsx
 * import { useAuth } from 'keycloak-headless/react';
 *
 * function MyComponent() {
 *   const { keycloak, authenticated } = useAuth();
 *
 *   if (authenticated) {
 *     return <p>Welcome, {keycloak?.tokenParsed?.preferred_username}!</p>;
 *   }
 *
 *   return <p>Please log in</p>;
 * }
 * ```
 *
 * @example Accessing token
 * ```tsx
 * function UserProfile() {
 *   const { keycloak, authenticated } = useAuth();
 *
 *   if (!authenticated || !keycloak) {
 *     return <div>Not authenticated</div>;
 *   }
 *
 *   const token = keycloak.token;
 *   const username = keycloak.tokenParsed?.preferred_username;
 *   const email = keycloak.tokenParsed?.email;
 *
 *   return (
 *     <div>
 *       <h2>{username}</h2>
 *       <p>{email}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Handling errors
 * ```tsx
 * function AuthStatus() {
 *   const { authenticated, error } = useAuth();
 *
 *   if (error) {
 *     return <div className="error">Auth error: {error.message}</div>;
 *   }
 *
 *   if (authenticated === undefined) {
 *     return <div>Checking authentication...</div>;
 *   }
 *
 *   return authenticated ? <div>Logged in</div> : <div>Logged out</div>;
 * }
 * ```
 *
 * @example Manual token refresh
 * ```tsx
 * function TokenRefreshButton() {
 *   const { keycloak } = useAuth();
 *
 *   const handleRefresh = async () => {
 *     try {
 *       const refreshed = await keycloak?.updateToken(30);
 *       console.log('Token refreshed:', refreshed);
 *     } catch (error) {
 *       console.error('Token refresh failed:', error);
 *     }
 *   };
 *
 *   return <button onClick={handleRefresh}>Refresh Token</button>;
 * }
 * ```
 */
export function useAuth(): AuthState {
  return useContext(AuthReactContext);
}
