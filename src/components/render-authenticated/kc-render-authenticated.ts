import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit/context";

import { authContext, type AuthState } from "../provider/kc-context.js";

/**
 * Conditionally renders content only when the user is authenticated.
 *
 * This component acts as a guard that shows its children only after successful
 * authentication. It's useful for protecting UI elements that should only be
 * visible to logged-in users.
 *
 * @element kc-render-authenticated
 *
 * @slot - Content to display when authenticated
 *
 * @example Basic usage
 * ```html
 * <kc-render-authenticated>
 *   <p>Welcome back! You are logged in.</p>
 *   <kc-logout-button>
 *     <button>Logout</button>
 *   </kc-logout-button>
 * </kc-render-authenticated>
 * ```
 *
 * @example With user information
 * ```html
 * <kc-render-authenticated>
 *   <div class="user-profile">
 *     <h2>Dashboard</h2>
 *     <kc-account-link>
 *       <a>Manage Account</a>
 *     </kc-account-link>
 *   </div>
 * </kc-render-authenticated>
 * ```
 *
 * @example Combined with guest view
 * ```html
 * <kc-render-authenticated>
 *   <nav>
 *     <a href="/dashboard">Dashboard</a>
 *     <a href="/profile">Profile</a>
 *     <kc-logout-button><button>Logout</button></kc-logout-button>
 *   </nav>
 * </kc-render-authenticated>
 *
 * <kc-render-guest>
 *   <nav>
 *     <a href="/">Home</a>
 *     <kc-login-button><button>Login</button></kc-login-button>
 *   </nav>
 * </kc-render-guest>
 * ```
 *
 * @example Loading state handling
 * ```html
 * <kc-render-authenticated>
 *   <div>Content loaded after authentication</div>
 * </kc-render-authenticated>
 *
 * <!-- Show loading indicator while auth state is being determined -->
 * <div id="loading">Checking authentication...</div>
 * <script>
 *   // Hide loading when auth state is known
 *   document.querySelector('kc-provider').addEventListener('auth-success', () => {
 *     document.getElementById('loading').style.display = 'none';
 *   });
 * </script>
 * ```
 *
 * @remarks
 * The component subscribes to the auth context provided by `<kc-provider>`.
 * Content is only rendered when `authenticated === true`. During initialization
 * or when not authenticated, the component renders nothing.
 */
@customElement("kc-render-authenticated")
export class KcRenderAuthenticated extends LitElement {
  @consume({ context: authContext, subscribe: true })
  @state()
  private auth: AuthState = {};

  /**
   * Renders the slot content only when user is authenticated.
   * Returns empty template when not authenticated or auth state is unknown.
   */
  render() {
    if (this.auth.authenticated === true) {
      return html`<slot></slot>`;
    }
    return html``;
  }
}
