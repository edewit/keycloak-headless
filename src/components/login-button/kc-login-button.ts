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
    void this.auth.keycloak?.login();
  };

  render() {
    if (this.auth.keycloak != null && this.auth.authenticated !== true) {
      return html`<slot @click=${this.onLoginClick}></slot>`;
    }
    return html``;
  }
}
