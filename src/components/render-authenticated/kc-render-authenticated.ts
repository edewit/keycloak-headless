import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit/context";

import { authContext, type AuthState } from "../provider/kc-context.js";

@customElement("kc-render-authenticated")
export class KcRenderAuthenticated extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  render() {
    if (this.auth.authenticated === true) {
      return html`<slot></slot>`;
    }
    return html``;
  }
}
