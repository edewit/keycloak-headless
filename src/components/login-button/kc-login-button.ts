import { consume } from "@lit/context";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authContext, type AuthState } from "../provider/kc-context.js";

/**
 * A button component that triggers Keycloak login when clicked.
 *
 * This component only renders when the user is NOT authenticated. It wraps your custom
 * button element and adds the login click handler. Use the default slot to provide
 * your own button styling and content.
 *
 * @element kc-login-button
 *
 * @slot - Default slot for custom button content (e.g., `<button>Login</button>`)
 *
 * @example Basic usage
 * ```html
 * <kc-login-button>
 *   <button>Login</button>
 * </kc-login-button>
 * ```
 *
 * @example Custom styled button
 * ```html
 * <kc-login-button>
 *   <button class="btn btn-primary">
 *     <i class="icon-login"></i> Sign In
 *   </button>
 * </kc-login-button>
 * ```
 *
 * @example With accessibility attributes
 * ```html
 * <kc-login-button>
 *   <button aria-label="Login to your account">
 *     Login
 *   </button>
 * </kc-login-button>
 * ```
 */
@customElement("kc-login-button")
export class KcLoginButton extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  /**
   * Handles login button click by calling Keycloak's login method.
   * This redirects the user to the Keycloak login page.
   *
   * @private
   */
  private onLoginClick = () => {
    void this.auth.keycloak?.login();
  };

  /**
   * Renders the slot with login click handler only when user is not authenticated.
   * Returns empty template when authenticated or Keycloak is not initialized.
   */
  render() {
    if (this.auth.keycloak != null && this.auth.authenticated !== true) {
      return html`<slot @click=${this.onLoginClick}></slot>`;
    }
    return html``;
  }
}
