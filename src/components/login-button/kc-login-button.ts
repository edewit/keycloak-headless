import { consume } from "@lit/context";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authContext, type AuthState } from "../provider/kc-context.js";

@customElement("kc-login-button")
export class KcLoginButton extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  private onLoginClick = () => {
    const oidc = this.auth.oidc;
    if (oidc != null && oidc.isUserLoggedIn === false) {
      void oidc.login();
    }
  };

  render() {
    if (this.auth.oidc != null && this.auth.authenticated !== true) {
      return html`<slot @click=${this.onLoginClick}></slot>`;
    }
    return html``;
  }
}
