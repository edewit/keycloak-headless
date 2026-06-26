import { html, LitElement } from "lit";
import { provide } from "@lit/context";
import { customElement, property, state } from "lit/decorators.js";
import { createOidc, type Oidc } from "oidc-spa/core";

import { buildIssuerUri } from "../../oidc/build-issuer-uri.js";
import {
  wrapOidcError,
  wrapOidcInitializationError,
} from "../../oidc/wrap-oidc-error.js";
import { authContext, type AuthState } from "./kc-context.js";
import {
  KeycloakError,
  ErrorCodes,
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
 * Converter for boolean init flags: omit the attribute to use defaults.
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
 * Initializes OIDC authentication via oidc-spa and provides auth context to child components.
 *
 * @element kc-provider
 *
 * @attr {string} url - Keycloak server URL (e.g., "https://keycloak.example.com/")
 * @attr {string} realm - Keycloak realm name
 * @attr {string} client-id - Client ID registered in Keycloak
 * @attr {string} [scope] - Optional OAuth scopes (space-separated, e.g., "profile email")
 * @attr {string} [on-load="check-sso"] - "check-sso" (silent check) or "login-required" (force login)
 * @attr {string} [base-url="/"] - App base URL path (must match Vite `import.meta.env.BASE_URL`)
 * @attr {boolean} [enable-logging] - Enable oidc-spa debug logging to console
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
 */
@customElement("kc-provider")
export class KcProvider extends LitElement {
  @property({ type: String })
  url: string = "http://localhost:8080/";

  @property({ type: String })
  realm: string = "master";

  @property({ type: String, attribute: "client-id" })
  clientId: string = "";

  @property({ type: String })
  scope?: string;

  @property({ type: String, attribute: "on-load" })
  onLoad: "check-sso" | "login-required" = "check-sso";

  @property({ type: String, attribute: "base-url" })
  baseUrl: string = "/";

  @property({ converter: optionalBoolean, attribute: "enable-logging" })
  enableLogging?: boolean;

  @property({ type: String, attribute: "redirect-uri" })
  redirectUri?: string;

  @property({ type: Number, attribute: "retry-attempts" })
  retryAttempts: number = 3;

  @property({ type: Number, attribute: "retry-delay" })
  retryDelay: number = 1000;

  @property({ type: Boolean, attribute: "auto-retry" })
  autoRetry: boolean = true;

  @property({ attribute: false })
  onError?: (error: KeycloakError) => void;

  @property({ attribute: false })
  onRetry?: (detail: KcRetryDetail) => void;

  @property({ attribute: false })
  onStateChange?: (detail: KcStateChangeDetail) => void;

  @property({ attribute: false })
  errorLogger?: ErrorLogger;

  @provide({ context: authContext })
  @state()
  authData: AuthState = { oidc: undefined };

  @state()
  private initAttempt: number = 0;

  @state()
  private isRetrying: boolean = false;

  private getErrorLogger(): ErrorLogger {
    return this.errorLogger ?? defaultErrorLogger;
  }

  private dispatchError(
    error: KeycloakError,
    context?: Record<string, unknown>,
  ): void {
    const timestamp = Date.now();

    this.getErrorLogger().log({
      timestamp,
      level: LogLevel.ERROR,
      error,
      context,
    });

    this.dispatchEvent(
      new CustomEvent<KcErrorDetail>("kc-error", {
        detail: {
          error,
          timestamp,
          canRetry: error.recoverable,
        },
        bubbles: true,
        composed: true,
      }),
    );

    this.onError?.(error);
  }

  private dispatchStateChange(previous: AuthState, current: AuthState): void {
    this.dispatchEvent(
      new CustomEvent<KcStateChangeDetail>("kc-state-change", {
        detail: { previous, current },
        bubbles: true,
        composed: true,
      }),
    );
    this.onStateChange?.({ previous, current });
  }

  private updateAuthData(newData: AuthState): void {
    const previous = this.authData;
    this.authData = newData;

    this.dispatchStateChange(previous, newData);

    if (newData.error && newData.error instanceof KeycloakError) {
      this.dispatchError(newData.error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildCreateOidcParams() {
    const issuerUri = buildIssuerUri(this.url, this.realm);
    const scopes =
      this.scope != null && this.scope.trim() !== ""
        ? this.scope.trim().split(/\s+/).filter(Boolean)
        : undefined;

    const params = {
      issuerUri,
      clientId: this.clientId,
      autoLogin: this.onLoad === "login-required",
      BASE_URL: this.baseUrl,
      ...(scopes != null ? { scopes } : {}),
      ...(this.enableLogging === true ? { debugLogs: true } : {}),
      ...(this.redirectUri != null && this.redirectUri !== ""
        ? { postLoginRedirectUrl: this.redirectUri }
        : {}),
    } as const;

    return params;
  }

  private authStateFromOidc(oidc: Oidc, patch?: Partial<AuthState>): AuthState {
    const initError =
      oidc.isUserLoggedIn === false ? oidc.initializationError : undefined;

    return {
      oidc,
      authenticated: oidc.isUserLoggedIn,
      error: wrapOidcInitializationError(initError),
      loading: false,
      ...patch,
    };
  }

  private async initWithRetry(): Promise<Oidc> {
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

        if (this.isRetrying) {
          this.updateAuthData({
            ...this.authData,
            loading: true,
            loadingMessage: `Retrying... (attempt ${attempt} of ${retryConfig.maxAttempts})`,
          });
        }

        const params = this.buildCreateOidcParams();
        const oidc = await createOidc(
          params.autoLogin
            ? { ...params, autoLogin: true as const }
            : { ...params, autoLogin: false as const },
        );
        this.isRetrying = false;
        return oidc;
      } catch (error) {
        lastError = error;

        if (isConfigError(error)) {
          throw wrapOidcError(error, ErrorCodes.INVALID_CONFIG);
        }

        if (attempt === retryConfig.maxAttempts) {
          throw wrapOidcError(error, ErrorCodes.INIT_FAILED);
        }

        const delay = Math.min(
          retryConfig.initialDelay *
            Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay,
        );

        const retryDetail: KcRetryDetail = {
          attempt,
          maxAttempts: retryConfig.maxAttempts,
          delay,
          error,
        };

        this.dispatchEvent(
          new CustomEvent<KcRetryDetail>("kc-retry", {
            detail: retryDetail,
            bubbles: true,
            composed: true,
          }),
        );
        this.onRetry?.(retryDetail);

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  public async retry(): Promise<void> {
    this.updateAuthData({
      oidc: this.authData.oidc,
      error: undefined,
      loading: true,
      loadingMessage: "Retrying initialization...",
    });
    await this.firstUpdated();
  }

  override async firstUpdated() {
    this.updateAuthData({
      loading: true,
      loadingMessage: "Initializing authentication...",
    });

    try {
      const oidc = await this.initWithRetry();
      const state = this.authStateFromOidc(oidc);
      this.updateAuthData(state);

      if (state.authenticated === true) {
        this.dispatchEvent(
          new CustomEvent("auth-success", { bubbles: true, composed: true }),
        );
      } else if (state.error) {
        this.dispatchEvent(
          new CustomEvent("auth-error", {
            detail: { error: state.error },
            bubbles: true,
            composed: true,
          }),
        );
      }
    } catch (error) {
      console.error("OIDC init failed:", error);
      const wrappedError =
        error instanceof KeycloakError
          ? error
          : wrapOidcError(error, ErrorCodes.INIT_FAILED);

      this.updateAuthData({
        oidc: undefined,
        authenticated: false,
        error: wrappedError,
        loading: false,
      });
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}
