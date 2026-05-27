import "keycloak-headless/provider";
import {
  KeycloakProvider,
  useAuth,
  useKeycloakConfigRoles,
} from "keycloak-headless/react";

import { KEYCLOAK_CONFIG } from "./keycloak-config.generated.js";
import { realmRolesAttr } from "./realm-roles-attr.js";

function AuthDemo() {
  const { keycloak, authenticated, error } = useAuth();
  const { hasRealmRole } = useKeycloakConfigRoles(KEYCLOAK_CONFIG);

  return (
    <div style={{ fontFamily: "system-ui", padding: "1rem" }}>
      <h1>kc-provider + React</h1>
      {!keycloak && !error && <p>Initializing Keycloak…</p>}
      {error != null && (
        <p style={{ color: "crimson" }}>
          Init error (expected if Keycloak is not running):{" "}
          {String((error as Error)?.message ?? error)}
        </p>
      )}
      {keycloak && (
        <>
          <p>Authenticated: {String(authenticated)}</p>
          <kc-render-authenticated>
            <p style={{ background: "#e8f5e9", padding: "0.5rem" }}>
              Members-only: you are signed in (via{" "}
              <code>kc-render-authenticated</code>).
            </p>
            <p>
              <kc-account-link>
                <button type="button">Account console</button>
              </kc-account-link>{" "}
              — via <code>kc-account-link</code>{" "}
              <kc-logout-button>
                <button type="button">Logout</button>
              </kc-logout-button>{" "}
              — via <code>kc-logout-button</code>
            </p>
            {hasRealmRole("admin") && (
              <p style={{ background: "#f3e5f5", padding: "0.5rem" }}>
                Typed check: you have the <code>admin</code> realm role (
                <code>useKeycloakConfigRoles</code>).
              </p>
            )}
            <kc-render-roles
              roles={realmRolesAttr("admin")}
              role-kind="realm"
              match="any"
            >
              <p style={{ background: "#e3f2fd", padding: "0.5rem" }}>
                You have the configured realm role (via{" "}
                <code>kc-render-roles</code>).
              </p>
            </kc-render-roles>
          </kc-render-authenticated>
          <kc-render-guest>
            <p style={{ background: "#fff3e0", padding: "0.5rem" }}>
              <kc-login-button>
                <button type="button">Get started (guest)</button>
              </kc-login-button>{" "}
              — login via <code>kc-login-button</code> inside{" "}
              <code>kc-render-guest</code>
            </p>
          </kc-render-guest>
        </>
      )}
    </div>
  );
}

export function App() {
  return (
    <KeycloakProvider
      url="http://localhost:8080/"
      realm="master"
      clientId="example-spa"
    >
      <AuthDemo />
    </KeycloakProvider>
  );
}
