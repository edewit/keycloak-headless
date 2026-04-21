import { html, LitElement } from "lit";
import { provide } from "@lit/context";
import { customElement, property, state } from "lit/decorators.js";
import Keycloak, {
  type KeycloakError,
  type KeycloakInitOptions,
  type KeycloakOnLoad,
} from "keycloak-js";

import { authContext, type AuthState } from "./kc-context.js";

/**
 * For boolean init flags: omit the attribute to use Keycloak defaults.
 * Use `true` / `false` (or `0` / `no` as false) when set as an attribute.
 */
const optionalBoolean = {
  fromAttribute(value: string | null): boolean | undefined {
    if (value == null || value === "") return undefined;
    const v = value.trim().toLowerCase();
    if (v === "false" || v === "0" || v === "no") return false;
    return true;
  },
  toAttribute(value: boolean | undefined): string | null {
    if (value === undefined) return null;
    return value ? "true" : "false";
  },
};

@customElement("kc-provider")
export class KcProvider extends LitElement {
  @property({ type: String })
  url: string = "http://localhost:8080/";

  @property({ type: String })
  realm: string = "master";

  @property({ type: String, attribute: "client-id" })
  clientId: string = "";

  @property({ type: String })
  scope?: string;

  @property({ type: String, attribute: "on-load" })
  onLoad: KeycloakOnLoad = "check-sso";

  @property({ converter: optionalBoolean, attribute: "use-nonce" })
  useNonce?: boolean;

  @property({ type: String })
  adapter?: "default" | "cordova" | "cordova-native";

  @property({ converter: optionalBoolean, attribute: "check-login-iframe" })
  checkLoginIframe?: boolean;

  @property({ type: Number, attribute: "check-login-iframe-interval" })
  checkLoginIframeInterval?: number;

  @property({ type: String, attribute: "response-mode" })
  responseMode?: "query" | "fragment";

  @property({ type: String, attribute: "redirect-uri" })
  redirectUri?: string;

  @property({ type: String, attribute: "silent-check-sso-redirect-uri" })
  silentCheckSsoRedirectUri?: string;

  @property({
    converter: optionalBoolean,
    attribute: "silent-check-sso-fallback",
  })
  silentCheckSsoFallback?: boolean;

  @property({ type: String })
  flow?: "standard" | "implicit" | "hybrid";

  /** Use `S256` or `false` (string) to match Keycloak `pkceMethod`. */
  @property({ type: String, attribute: "pkce-method" })
  pkceMethod?: "S256" | "false";

  @property({ converter: optionalBoolean, attribute: "enable-logging" })
  enableLogging?: boolean;

  @property({ type: Number, attribute: "message-receive-timeout" })
  messageReceiveTimeout?: number;

  @property({ type: String })
  locale?: string;

  @property({ type: String, attribute: "logout-method" })
  logoutMethod?: "GET" | "POST";

  @property({ type: String, attribute: false })
  token?: string;

  @property({ type: String, attribute: false })
  refreshToken?: string;

  @property({ type: String, attribute: false })
  idToken?: string;

  @property({ type: Number, attribute: false })
  timeSkew?: number;

  @provide({ context: authContext })
  @state()
  authData: AuthState = { keycloak: undefined };

  private buildInitOptions(): KeycloakInitOptions {
    const options: KeycloakInitOptions = {
      onLoad: this.onLoad,
    };
    if (this.scope != null && this.scope !== "") {
      options.scope = this.scope;
    }
    if (this.useNonce !== undefined) {
      options.useNonce = this.useNonce;
    }
    if (this.adapter) {
      options.adapter = this.adapter;
    }
    if (this.checkLoginIframe !== undefined) {
      options.checkLoginIframe = this.checkLoginIframe;
    }
    if (
      this.checkLoginIframeInterval != null &&
      !Number.isNaN(this.checkLoginIframeInterval)
    ) {
      options.checkLoginIframeInterval = this.checkLoginIframeInterval;
    }
    if (this.responseMode) {
      options.responseMode = this.responseMode;
    }
    if (this.redirectUri != null && this.redirectUri !== "") {
      options.redirectUri = this.redirectUri;
    }
    if (
      this.silentCheckSsoRedirectUri != null &&
      this.silentCheckSsoRedirectUri !== ""
    ) {
      options.silentCheckSsoRedirectUri = this.silentCheckSsoRedirectUri;
    }
    if (this.silentCheckSsoFallback !== undefined) {
      options.silentCheckSsoFallback = this.silentCheckSsoFallback;
    }
    if (this.flow) {
      options.flow = this.flow;
    }
    if (this.pkceMethod) {
      options.pkceMethod =
        this.pkceMethod === "false" ? false : this.pkceMethod;
    }
    if (this.enableLogging !== undefined) {
      options.enableLogging = this.enableLogging;
    }
    if (
      this.messageReceiveTimeout != null &&
      !Number.isNaN(this.messageReceiveTimeout)
    ) {
      options.messageReceiveTimeout = this.messageReceiveTimeout;
    }
    if (this.locale != null && this.locale !== "") {
      options.locale = this.locale;
    }
    if (this.logoutMethod) {
      options.logoutMethod = this.logoutMethod;
    }
    if (this.token != null && this.token !== "") {
      options.token = this.token;
    }
    if (this.refreshToken != null && this.refreshToken !== "") {
      options.refreshToken = this.refreshToken;
    }
    if (this.idToken != null && this.idToken !== "") {
      options.idToken = this.idToken;
    }
    if (this.timeSkew != null && !Number.isNaN(this.timeSkew)) {
      options.timeSkew = this.timeSkew;
    }
    return options;
  }

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
      const authenticated = await keycloak.init(this.buildInitOptions());

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
