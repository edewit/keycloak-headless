import { html, LitElement } from "lit";
import { provide } from "@lit/context";
import { customElement, property, state } from "lit/decorators.js";
import Keycloak, {
  type KeycloakError as KeycloakJsError,
  type KeycloakInitOptions,
  type KeycloakOnLoad,
} from "keycloak-js";

import { authContext, type AuthState } from "./kc-context.js";
import {
  KeycloakError,
  ErrorCodes,
  wrapError,
  isConfigError,
} from "../../errors/keycloak-errors.js";
import {
  type ErrorLogger,
  defaultErrorLogger,
  LogLevel,
} from "../../errors/error-logger.js";

/**
 * Event detail types for custom events
 */
export interface KcErrorDetail {
  error: KeycloakError;
  timestamp: number;
  canRetry: boolean;
}

export interface KcRetryDetail {
  attempt: number;
  maxAttempts: number;
  delay: number;
  error: unknown;
}

export interface KcStateChangeDetail {
  previous: AuthState;
  current: AuthState;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Converter for boolean init flags: omit the attribute to use Keycloak defaults.
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

/**
 * Initializes Keycloak authentication and provides auth context to child components.
 *
 * This component must be placed at the root of your application to enable authentication.
 * All child components can access the auth state through Lit context. The provider handles
 * the complete authentication lifecycle including initialization, token refresh, and logout.
 *
 * @element kc-provider
 *
 * @attr {string} url - Keycloak server URL (e.g., "https://keycloak.example.com/" or "https://keycloak.example.com/auth/" for older versions)
 * @attr {string} realm - Keycloak realm name
 * @attr {string} client-id - Client ID registered in Keycloak
 * @attr {string} [scope] - Optional OAuth scopes (space-separated, e.g., "openid profile email")
 * @attr {string} [on-load="check-sso"] - Initialization behavior: "check-sso" (silent check) or "login-required" (force login)
 * @attr {boolean} [use-nonce] - Enable nonce validation for enhanced security (omit for Keycloak default)
 * @attr {string} [adapter] - Keycloak adapter type: "default", "cordova", or "cordova-native"
 * @attr {boolean} [check-login-iframe] - Enable iframe-based session checking (omit for Keycloak default)
 * @attr {number} [check-login-iframe-interval] - Iframe check interval in seconds (default: 5)
 * @attr {string} [response-mode] - OAuth response mode: "query" or "fragment"
 * @attr {string} [redirect-uri] - Custom redirect URI after login (defaults to current URL)
 * @attr {string} [silent-check-sso-redirect-uri] - URI for silent SSO check iframe
 * @attr {boolean} [silent-check-sso-fallback] - Enable fallback if silent SSO fails
 * @attr {string} [flow] - OAuth flow: "standard" (authorization code), "implicit", or "hybrid"
 * @attr {string} [pkce-method] - PKCE method: "S256" (recommended) or "false" to disable
 * @attr {boolean} [enable-logging] - Enable Keycloak debug logging to console
 * @attr {number} [message-receive-timeout] - Timeout for iframe messages in milliseconds
 * @attr {string} [locale] - Preferred locale for Keycloak UI (e.g., "en", "de", "fr")
 * @attr {string} [logout-method] - HTTP method for logout: "GET" or "POST"
 *
 * @prop {string} [token] - JWT access token (can be set programmatically to restore session)
 * @prop {string} [refreshToken] - JWT refresh token (can be set programmatically to restore session)
 * @prop {string} [idToken] - JWT ID token (can be set programmatically to restore session)
 * @prop {number} [timeSkew] - Time difference between local and server in seconds
 *
 * @fires {CustomEvent} auth-success - Fired when authentication succeeds (via Keycloak.onAuthSuccess)
 * @fires {CustomEvent} auth-error - Fired when authentication fails (via Keycloak.onAuthError)
 * @fires {CustomEvent} auth-refresh-success - Fired when token refresh succeeds
 * @fires {CustomEvent} auth-refresh-error - Fired when token refresh fails
 * @fires {CustomEvent} auth-logout - Fired when user logs out
 * @fires {CustomEvent} token-expired - Fired when token expires
 *
 * @example Basic setup with check-sso
 * ```html
 * <kc-provider
 *   url="https://keycloak.example.com/"
 *   realm="myrealm"
 *   client-id="my-spa"
 *   on-load="check-sso">
 *   <kc-render-authenticated>
 *     <p>Welcome, authenticated user!</p>
 *   </kc-render-authenticated>
 *   <kc-render-guest>
 *     <kc-login-button>
 *       <button>Login</button>
 *     </kc-login-button>
 *   </kc-render-guest>
 * </kc-provider>
 * ```
 *
 * @example Force login on page load
 * ```html
 * <kc-provider
 *   url="https://keycloak.example.com/"
 *   realm="myrealm"
 *   client-id="my-spa"
 *   on-load="login-required">
 *   <kc-render-authenticated>
 *     <h1>Protected Application</h1>
 *   </kc-render-authenticated>
 * </kc-provider>
 * ```
 *
 * @example Programmatic token restoration
 * ```typescript
 * const provider = document.querySelector('kc-provider');
 * // Restore from localStorage or secure storage
 * provider.token = savedToken;
 * provider.refreshToken = savedRefreshToken;
 * provider.idToken = savedIdToken;
 * ```
 *
 * @example With custom scopes and PKCE
 * ```html
 * <kc-provider
 *   url="https://keycloak.example.com/"
 *   realm="myrealm"
 *   client-id="my-spa"
 *   scope="openid profile email"
 *   pkce-method="S256"
 *   on-load="check-sso">
 *   <slot></slot>
 * </kc-provider>
 * ```
 */
@customElement("kc-provider")
export class KcProvider extends LitElement {
  /**
   * Keycloak server URL. Must include protocol and trailing slash.
   * For Keycloak 17+, typically just the base URL (e.g., "https://keycloak.example.com/").
   * For older versions, include "/auth/" path (e.g., "https://keycloak.example.com/auth/").
   *
   * @default "http://localhost:8080/"
   */
  @property({ type: String })
  url: string = "http://localhost:8080/";

  /**
   * Keycloak realm name. Must match an existing realm in your Keycloak instance.
   *
   * @default "master"
   */
  @property({ type: String })
  realm: string = "master";

  /**
   * Client ID registered in Keycloak. Must be a public client configured for your application.
   * Ensure "Valid Redirect URIs" and "Web Origins" are properly configured in Keycloak.
   *
   * @required
   */
  @property({ type: String, attribute: "client-id" })
  clientId: string = "";

  /**
   * OAuth scopes to request (space-separated). Common scopes include:
   * - "openid" - Required for OIDC
   * - "profile" - User profile information
   * - "email" - User email address
   * - "roles" - User roles
   *
   * @example "openid profile email"
   */
  @property({ type: String })
  scope?: string;

  /**
   * Initialization behavior when the page loads:
   * - "check-sso" - Silently check if user is already authenticated (recommended for SPAs)
   * - "login-required" - Force login redirect if not authenticated
   *
   * @default "check-sso"
   */
  @property({ type: String, attribute: "on-load" })
  onLoad: KeycloakOnLoad = "check-sso";

  /**
   * Enable nonce validation for enhanced security against replay attacks.
   * Omit to use Keycloak's default behavior.
   */
  @property({ converter: optionalBoolean, attribute: "use-nonce" })
  useNonce?: boolean;

  /**
   * Keycloak adapter type for different platforms:
   * - "default" - Standard web browser
   * - "cordova" - Apache Cordova/PhoneGap
   * - "cordova-native" - Cordova with native browser
   */
  @property({ type: String })
  adapter?: "default" | "cordova" | "cordova-native";

  /**
   * Enable iframe-based session checking to detect logout in other tabs.
   * Omit to use Keycloak's default behavior (typically enabled).
   */
  @property({ converter: optionalBoolean, attribute: "check-login-iframe" })
  checkLoginIframe?: boolean;

  /**
   * Interval in seconds for checking session status via iframe.
   * Lower values provide faster logout detection but increase server load.
   *
   * @default 5
   */
  @property({ type: Number, attribute: "check-login-iframe-interval" })
  checkLoginIframeInterval?: number;

  /**
   * OAuth response mode for authorization code:
   * - "query" - Parameters in query string
   * - "fragment" - Parameters in URL fragment (more secure for SPAs)
   */
  @property({ type: String, attribute: "response-mode" })
  responseMode?: "query" | "fragment";

  /**
   * Custom redirect URI after login. Defaults to current page URL.
   * Must match one of the "Valid Redirect URIs" in Keycloak client settings.
   */
  @property({ type: String, attribute: "redirect-uri" })
  redirectUri?: string;

  /**
   * URI for the silent SSO check iframe. Used when on-load="check-sso".
   * Should be a minimal HTML page that loads Keycloak.
   */
  @property({ type: String, attribute: "silent-check-sso-redirect-uri" })
  silentCheckSsoRedirectUri?: string;

  /**
   * Enable fallback to regular login if silent SSO check fails.
   * Useful for handling third-party cookie blocking.
   */
  @property({
    converter: optionalBoolean,
    attribute: "silent-check-sso-fallback",
  })
  silentCheckSsoFallback?: boolean;

  /**
   * OAuth 2.0 flow type:
   * - "standard" - Authorization Code Flow (recommended, most secure)
   * - "implicit" - Implicit Flow (legacy, less secure)
   * - "hybrid" - Hybrid Flow (combination of both)
   */
  @property({ type: String })
  flow?: "standard" | "implicit" | "hybrid";

  /**
   * PKCE (Proof Key for Code Exchange) method for enhanced security:
   * - "S256" - SHA-256 hashing (recommended)
   * - "false" - Disable PKCE (not recommended)
   *
   * PKCE protects against authorization code interception attacks.
   */
  @property({ type: String, attribute: "pkce-method" })
  pkceMethod?: "S256" | "false";

  /**
   * Enable Keycloak debug logging to browser console.
   * Useful for troubleshooting authentication issues.
   */
  @property({ converter: optionalBoolean, attribute: "enable-logging" })
  enableLogging?: boolean;

  /**
   * Timeout in milliseconds for receiving messages from iframe.
   * Increase if experiencing timeout errors on slow networks.
   *
   * @default 10000
   */
  @property({ type: Number, attribute: "message-receive-timeout" })
  messageReceiveTimeout?: number;

  /**
   * Preferred locale for Keycloak login and account pages.
   * Must be enabled in Keycloak realm settings.
   *
   * @example "en" | "de" | "fr" | "es"
   */
  @property({ type: String })
  locale?: string;

  /**
   * HTTP method for logout endpoint:
   * - "GET" - Traditional logout (may have CSRF risks)
   * - "POST" - More secure logout method (recommended)
   */
  @property({ type: String, attribute: "logout-method" })
  logoutMethod?: "GET" | "POST";

  /**
   * JWT access token. Can be set programmatically to restore a session.
   * Not exposed as an HTML attribute for security reasons.
   */
  @property({ type: String, attribute: false })
  token?: string;

  /**
   * JWT refresh token. Can be set programmatically to restore a session.
   * Not exposed as an HTML attribute for security reasons.
   */
  @property({ type: String, attribute: false })
  refreshToken?: string;

  /**
   * JWT ID token. Can be set programmatically to restore a session.
   * Not exposed as an HTML attribute for security reasons.
   */
  @property({ type: String, attribute: false })
  idToken?: string;

  /**
   * Time difference between local and Keycloak server in seconds.
   * Used to adjust token expiration checks for clock skew.
   */
  @property({ type: Number, attribute: false })
  timeSkew?: number;

  /**
   * Maximum number of retry attempts for failed initialization.
   * Set to 1 to disable retry (single attempt only).
   *
   * @default 3
   */
  @property({ type: Number, attribute: "retry-attempts" })
  retryAttempts: number = 3;

  /**
   * Initial delay in milliseconds before first retry.
   * Subsequent retries use exponential backoff.
   *
   * @default 1000
   */
  @property({ type: Number, attribute: "retry-delay" })
  retryDelay: number = 1000;

  /**
   * Enable automatic retry on initialization failure.
   * If false, only one initialization attempt is made.
   *
   * @default true
   */
  @property({ type: Boolean, attribute: "auto-retry" })
  autoRetry: boolean = true;

  /**
   * Callback function called when an error occurs.
   * Receives the wrapped KeycloakError with user-friendly messages.
   */
  @property({ attribute: false })
  onError?: (error: KeycloakError) => void;

  /**
   * Callback function called when a retry attempt is made.
   */
  @property({ attribute: false })
  onRetry?: (detail: KcRetryDetail) => void;

  /**
   * Callback function called when auth state changes.
   */
  @property({ attribute: false })
  onStateChange?: (detail: KcStateChangeDetail) => void;

  /**
   * Error logger instance for logging errors.
   * Defaults to console logger if not provided.
   */
  @property({ attribute: false })
  errorLogger?: ErrorLogger;

  @provide({ context: authContext })
  @state()
  authData: AuthState = { keycloak: undefined };

  @state()
  private initAttempt: number = 0;

  @state()
  private isRetrying: boolean = false;

  /**
   * Get the error logger instance (use default if not set)
   */
  private getErrorLogger(): ErrorLogger {
    return this.errorLogger ?? defaultErrorLogger;
  }

  /**
   * Dispatch error event and call error callback
   */
  private dispatchError(error: KeycloakError, context?: Record<string, unknown>): void {
    const timestamp = Date.now();
    
    // Log the error
    this.getErrorLogger().log({
      timestamp,
      level: LogLevel.ERROR,
      error,
      context,
    });
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent<KcErrorDetail>('kc-error', {
      detail: {
        error,
        timestamp,
        canRetry: error.recoverable,
      },
      bubbles: true,
      composed: true,
    }));
    
    // Call callback
    this.onError?.(error);
  }

  /**
   * Dispatch state change event and call state change callback
   */
  private dispatchStateChange(previous: AuthState, current: AuthState): void {
    this.dispatchEvent(new CustomEvent<KcStateChangeDetail>('kc-state-change', {
      detail: { previous, current },
      bubbles: true,
      composed: true,
    }));
    this.onStateChange?.({ previous, current });
  }

  /**
   * Update auth data and dispatch events
   */
  private updateAuthData(newData: AuthState): void {
    const previous = this.authData;
    this.authData = newData;
    
    this.dispatchStateChange(previous, newData);
    
    if (newData.error && newData.error instanceof KeycloakError) {
      this.dispatchError(newData.error);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize Keycloak with retry logic
   */
  private async initWithRetry(keycloak: Keycloak, config: KeycloakInitOptions): Promise<boolean> {
    const retryConfig: RetryConfig = {
      maxAttempts: this.autoRetry ? this.retryAttempts : 1,
      initialDelay: this.retryDelay,
      maxDelay: 30000,
      backoffMultiplier: 2,
    };

    let lastError: unknown;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      this.initAttempt = attempt;
      
      try {
        this.isRetrying = attempt > 1;
        
        // Update loading message during retry
        if (this.isRetrying) {
          this.updateAuthData({
            ...this.authData,
            loading: true,
            loadingMessage: `Retrying... (attempt ${attempt} of ${retryConfig.maxAttempts})`,
          });
        }
        
        const authenticated = await keycloak.init(config);
        this.isRetrying = false;
        return authenticated;
      } catch (error) {
        lastError = error;
        
        // Don't retry on configuration errors
        if (isConfigError(error)) {
          throw wrapError(error, ErrorCodes.INVALID_CONFIG);
        }
        
        // Last attempt - throw error
        if (attempt === retryConfig.maxAttempts) {
          throw wrapError(error, ErrorCodes.INIT_FAILED);
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );
        
        // Dispatch retry event
        const retryDetail: KcRetryDetail = {
          attempt,
          maxAttempts: retryConfig.maxAttempts,
          delay,
          error,
        };
        
        this.dispatchEvent(new CustomEvent<KcRetryDetail>('kc-retry', {
          detail: retryDetail,
          bubbles: true,
          composed: true,
        }));
        this.onRetry?.(retryDetail);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Manually retry initialization
   */
  public async retry(): Promise<void> {
    this.updateAuthData({
      keycloak: this.authData.keycloak,
      error: undefined,
      loading: true,
      loadingMessage: 'Retrying initialization...',
    });
    await this.firstUpdated();
  }

  /**
   * Builds Keycloak initialization options from component properties.
   * Only includes options that have been explicitly set to avoid overriding Keycloak defaults.
   *
   * @private
   * @returns {KeycloakInitOptions} Configuration object for Keycloak.init()
   */
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
    // Only set checkLoginIframeInterval if provided and valid
    // Default is 5 seconds in Keycloak; custom values must be positive integers
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
    // Convert string "false" to boolean false for PKCE method
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

  /**
   * Lifecycle method called after the first render.
   * Initializes Keycloak instance and sets up event handlers for auth state changes.
   *
   * @private
   */
  override async firstUpdated() {
    // Set initial loading state
    this.updateAuthData({
      loading: true,
      loadingMessage: 'Initializing authentication...'
    });

    const keycloak = new Keycloak({
      url: this.url,
      realm: this.realm,
      clientId: this.clientId,
    });
    
    // Helper to sync auth state from Keycloak instance to Lit context
    const syncAuthFromKeycloak = (patch?: Partial<AuthState>) => {
      this.updateAuthData({
        keycloak,
        authenticated: keycloak.authenticated === true,
        ...patch,
      });
    };
    
    // Set up Keycloak event handlers to propagate auth state changes
    keycloak.onAuthSuccess = () => {
      syncAuthFromKeycloak({ error: undefined, loading: false });
      this.dispatchEvent(new CustomEvent('auth-success', {
        bubbles: true,
        composed: true,
      }));
    };
    
    keycloak.onAuthRefreshSuccess = () => {
      syncAuthFromKeycloak({ error: undefined });
      this.dispatchEvent(new CustomEvent('auth-refresh-success', {
        bubbles: true,
        composed: true,
      }));
    };
    
    keycloak.onAuthLogout = () => {
      syncAuthFromKeycloak({ error: undefined });
      this.dispatchEvent(new CustomEvent('auth-logout', {
        bubbles: true,
        composed: true,
      }));
    };
    
    keycloak.onAuthError = (errorData?: KeycloakJsError) => {
      const error = wrapError(
        errorData ?? new Error("Keycloak authentication error"),
        ErrorCodes.AUTH_FAILED
      );
      syncAuthFromKeycloak({ error });
      this.dispatchEvent(new CustomEvent('auth-error', {
        detail: { error },
        bubbles: true,
        composed: true,
      }));
    };
    
    keycloak.onAuthRefreshError = () => {
      const error = wrapError(
        new Error("Keycloak token refresh failed"),
        ErrorCodes.TOKEN_REFRESH_FAILED
      );
      syncAuthFromKeycloak({ error });
      this.dispatchEvent(new CustomEvent('auth-refresh-error', {
        detail: { error },
        bubbles: true,
        composed: true,
      }));
    };
    
    keycloak.onTokenExpired = () => {
      syncAuthFromKeycloak();
      this.dispatchEvent(new CustomEvent('token-expired', {
        bubbles: true,
        composed: true,
      }));
    };
    
    keycloak.onActionUpdate = () => {
      syncAuthFromKeycloak();
    };
    
    // Initialize Keycloak with retry logic
    try {
      const authenticated = await this.initWithRetry(keycloak, this.buildInitOptions());

      this.updateAuthData({
        keycloak,
        authenticated,
        error: undefined,
        loading: false,
      });
    } catch (error) {
      console.error("Keycloak init failed:", error);
      const wrappedError = error instanceof KeycloakError
        ? error
        : wrapError(error, ErrorCodes.INIT_FAILED);
      
      this.updateAuthData({
        keycloak,
        authenticated: false,
        error: wrappedError,
        loading: false,
      });
    }
  }

  /**
   * Renders the component's slot to display child components.
   * The slot allows any child components to access the auth context.
   */
  render() {
    return html`<slot></slot>`;
  }
}
