import { html, LitElement } from "lit";
import { provide } from "@lit/context";
import { customElement, property, state } from "lit/decorators.js";
import Keycloak, { type KeycloakError } from "keycloak-js";

import { authContext, type AuthState } from "./kc-context.js";

@customElement("kc-provider")
export class KcProvider extends LitElement {
  @property({ type: String })
  url: string = "http://localhost:8080/";

  @property({ type: String })
  realm: string = "master";

  @property({ type: String })
  clientId: string = "";

  @property({ type: String })
  scope?: string;

  @provide({ context: authContext })
  @state()
  authData: AuthState = { keycloak: undefined };
  override async firstUpdated() {
    const keycloak = new Keycloak({
      url: this.url,
      realm: this.realm,
      clientId: this.clientId,
    });
    const syncAuthFromKeycloak = (patch?: Partial<AuthState>) => {
      this.authData = {
        keycloak,
        authenticated: keycloak.authenticated === true,
        ...patch,
      };
    };
    keycloak.onAuthSuccess = () => {
      syncAuthFromKeycloak({ error: undefined });
    };
    keycloak.onAuthRefreshSuccess = () => {
      syncAuthFromKeycloak({ error: undefined });
    };
    keycloak.onAuthLogout = () => {
      syncAuthFromKeycloak({ error: undefined });
    };
    keycloak.onAuthError = (errorData?: KeycloakError) => {
      syncAuthFromKeycloak({
        error: errorData ?? new Error("Keycloak authentication error"),
      });
    };
    keycloak.onAuthRefreshError = () => {
      syncAuthFromKeycloak({
        error: new Error("Keycloak token refresh failed"),
      });
    };
    keycloak.onTokenExpired = () => {
      syncAuthFromKeycloak();
    };
    keycloak.onActionUpdate = () => {
      syncAuthFromKeycloak();
    };
    try {
      const authenticated = await keycloak.init({
        onLoad: "check-sso", // or "login-required"
        scope: this.scope,
      });

      this.authData = { keycloak, authenticated, error: undefined };
    } catch (error) {
      console.error("Keycloak init failed:", error);
      this.authData = { keycloak, authenticated: false, error };
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}
