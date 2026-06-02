import { consume } from "@lit/context";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authContext, type AuthState } from "../provider/kc-context.js";

/**
 * A button component that triggers Keycloak logout when clicked.
 *
 * This component only renders when the user IS authenticated. It wraps your custom
 * button element and adds the logout click handler. The logout action will end the
 * Keycloak session and optionally redirect to a specified URL.
 *
 * @element kc-logout-button
 *
 * @slot - Default slot for custom button content (e.g., `<button>Logout</button>`)
 *
 * @example Basic usage
 * ```html
 * <kc-logout-button>
 *   <button>Logout</button>
 * </kc-logout-button>
 * ```
 *
 * @example Custom styled button
 * ```html
 * <kc-logout-button>
 *   <button class="btn btn-secondary">
 *     <i class="icon-logout"></i> Sign Out
 *   </button>
 * </kc-logout-button>
 * ```
 *
 * @example With user info
 * ```html
 * <kc-logout-button>
 *   <button>
 *     Logout (john@example.com)
 *   </button>
 * </kc-logout-button>
 * ```
 *
 * @remarks
 * The logout behavior is controlled by the `logout-method` attribute on `<kc-provider>`.
 * By default, Keycloak will redirect to the server logout endpoint and then back to your app.
 */
@customElement("kc-logout-button")
export class KcLogoutButton extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  /**
   * Handles logout button click by calling Keycloak's logout method.
   * This ends the user's session and typically redirects to Keycloak logout page.
   *
   * @private
   */
  private onLogoutClick = () => {
    void this.auth.keycloak?.logout();
  };

  /**
   * Renders the slot with logout click handler only when user is authenticated.
   * Returns empty template when not authenticated or Keycloak is not initialized.
   */
  render() {
    if (this.auth.keycloak != null && this.auth.authenticated === true) {
      return html`<slot @click=${this.onLogoutClick}></slot>`;
    }
    return html``;
  }
}
