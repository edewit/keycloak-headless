import { consume } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { authContext, type AuthState } from "../provider/kc-context.js";

@customElement("kc-account-link")
export class KcAccountLink extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  /**
   * URI to return to after leaving the Account Console (Keycloak `referrer_uri`).
   */
  @property({ type: String, attribute: "redirect-uri" })
  redirectUri?: string;

  private onAccountClick = () => {
    const kc = this.auth.keycloak;
    if (kc == null) {
      return;
    }
    try {
      const opts =
        this.redirectUri != null && this.redirectUri !== ""
          ? { redirectUri: this.redirectUri }
          : undefined;
      window.location.assign(kc.createAccountUrl(opts));
    } catch {
      // Generic OIDC adapters may not support account URLs.
    }
  };

  render() {
    if (this.auth.keycloak != null && this.auth.authenticated === true) {
      return html`<slot @click=${this.onAccountClick}></slot>`;
    }
    return html``;
  }
}
