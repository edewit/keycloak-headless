import { consume } from "@lit/context";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authContext, type AuthState } from "../provider/kc-context.js";

@customElement("kc-logout-button")
export class KcLogoutButton extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  private onLogoutClick = () => {
    void this.auth.keycloak?.logout();
  };

  render() {
    if (this.auth.keycloak != null && this.auth.authenticated === true) {
      return html`<slot @click=${this.onLogoutClick}></slot>`;
    }
    return html``;
  }
}
