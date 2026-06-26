import { consume } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createKeycloakUtils } from "oidc-spa/keycloak";

import { authContext, type AuthState } from "../provider/kc-context.js";

@customElement("kc-account-link")
export class KcAccountLink extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  @property({ type: String, attribute: "redirect-uri" })
  redirectUri?: string;

  private onAccountClick = () => {
    const oidc = this.auth.oidc;
    if (oidc == null || oidc.isUserLoggedIn !== true) {
      return;
    }

    try {
      const keycloakUtils = createKeycloakUtils({ issuerUri: oidc.issuerUri });
      const accountUrl = keycloakUtils.getAccountUrl({
        clientId: oidc.clientId,
        validRedirectUri: oidc.validRedirectUri,
      });
      window.location.assign(accountUrl);
    } catch {
      // Silently ignore if account URL cannot be generated.
    }
  };

  render() {
    if (this.auth.oidc != null && this.auth.authenticated === true) {
      return html`<slot @click=${this.onAccountClick}></slot>`;
    }
    return html``;
  }
}
