/**
 * Error codes for Keycloak-related errors
 */
export const ErrorCodes = {
  // Initialization errors (1xxx)
  INIT_FAILED: 'KC_INIT_1000',
  SERVER_UNREACHABLE: 'KC_INIT_1001',
  INVALID_CONFIG: 'KC_INIT_1002',
  REALM_NOT_FOUND: 'KC_INIT_1003',
  CLIENT_NOT_FOUND: 'KC_INIT_1004',
  
  // Authentication errors (2xxx)
  AUTH_FAILED: 'KC_AUTH_2000',
  LOGIN_REQUIRED: 'KC_AUTH_2001',
  INVALID_CREDENTIALS: 'KC_AUTH_2002',
  ACCOUNT_LOCKED: 'KC_AUTH_2003',
  SESSION_EXPIRED: 'KC_AUTH_2004',
  
  // Token errors (3xxx)
  TOKEN_REFRESH_FAILED: 'KC_TOKEN_3000',
  TOKEN_EXPIRED: 'KC_TOKEN_3001',
  INVALID_TOKEN: 'KC_TOKEN_3002',
  REFRESH_TOKEN_EXPIRED: 'KC_TOKEN_3003',
  
  // Network errors (4xxx)
  NETWORK_ERROR: 'KC_NET_4000',
  TIMEOUT: 'KC_NET_4001',
  CORS_ERROR: 'KC_NET_4002',
  
  // Configuration errors (5xxx)
  MISSING_URL: 'KC_CONFIG_5000',
  MISSING_REALM: 'KC_CONFIG_5001',
  MISSING_CLIENT_ID: 'KC_CONFIG_5002',
  INVALID_REDIRECT_URI: 'KC_CONFIG_5003',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * User-friendly error messages for each error code
 */
const ERROR_MESSAGES: Record<string, string> = {
  [ErrorCodes.INIT_FAILED]: 'Unable to connect to authentication service',
  [ErrorCodes.SERVER_UNREACHABLE]: 'Authentication server is not responding',
  [ErrorCodes.INVALID_CONFIG]: 'Authentication is not configured correctly',
  [ErrorCodes.REALM_NOT_FOUND]: 'Authentication realm not found',
  [ErrorCodes.CLIENT_NOT_FOUND]: 'Application is not registered',
  
  [ErrorCodes.AUTH_FAILED]: 'Authentication failed',
  [ErrorCodes.LOGIN_REQUIRED]: 'Please log in to continue',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid username or password',
  [ErrorCodes.ACCOUNT_LOCKED]: 'Your account has been locked',
  [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired',
  
  [ErrorCodes.TOKEN_REFRESH_FAILED]: 'Unable to refresh your session',
  [ErrorCodes.TOKEN_EXPIRED]: 'Your session has expired',
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]: 'Please log in again',
  
  [ErrorCodes.NETWORK_ERROR]: 'Network connection error',
  [ErrorCodes.TIMEOUT]: 'Request timed out',
  [ErrorCodes.CORS_ERROR]: 'Cross-origin request blocked',
  
  [ErrorCodes.MISSING_URL]: 'Keycloak URL is required',
  [ErrorCodes.MISSING_REALM]: 'Realm name is required',
  [ErrorCodes.MISSING_CLIENT_ID]: 'Client ID is required',
};

/**
 * Suggested recovery actions for each error code
 */
const RECOVERY_ACTIONS: Record<string, string> = {
  [ErrorCodes.SERVER_UNREACHABLE]: 'Check your internet connection and try again',
  [ErrorCodes.INVALID_CONFIG]: 'Contact your system administrator',
  [ErrorCodes.SESSION_EXPIRED]: 'Click here to log in again',
  [ErrorCodes.TOKEN_REFRESH_FAILED]: 'Click here to log in again',
  [ErrorCodes.NETWORK_ERROR]: 'Check your connection and try again',
  [ErrorCodes.TIMEOUT]: 'Try again',
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]: 'Click here to log in again',
};

/**
 * Base error class for all Keycloak-related errors
 */
export class KeycloakError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'KeycloakError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KeycloakError);
    }
  }

  /**
   * User-friendly message suitable for display
   */
  get userMessage(): string {
    return ERROR_MESSAGES[this.code] ?? this.message;
  }

  /**
   * Suggested action for recovery
   */
  get suggestedAction(): string | null {
    return RECOVERY_ACTIONS[this.code] ?? null;
  }

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      userMessage: this.userMessage,
      suggestedAction: this.suggestedAction,
      cause: this.cause instanceof Error ? {
        name: this.cause.name,
        message: this.cause.message,
      } : this.cause,
    };
  }
}

/**
 * Initialization errors (server unreachable, invalid config, etc.)
 */
export class KeycloakInitError extends KeycloakError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, true, cause);
    this.name = 'KeycloakInitError';
  }
}

/**
 * Authentication errors (login failed, invalid credentials, etc.)
 */
export class KeycloakAuthError extends KeycloakError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, true, cause);
    this.name = 'KeycloakAuthError';
  }
}

/**
 * Token refresh errors (expired refresh token, network issues, etc.)
 */
export class KeycloakTokenError extends KeycloakError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, true, cause);
    this.name = 'KeycloakTokenError';
  }
}

/**
 * Configuration errors (missing required params, invalid values, etc.)
 */
export class KeycloakConfigError extends KeycloakError {
  constructor(message: string, code: string) {
    super(message, code, false);
    this.name = 'KeycloakConfigError';
  }
}

/**
 * Network errors (timeout, connection refused, etc.)
 */
export class KeycloakNetworkError extends KeycloakError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, true, cause);
    this.name = 'KeycloakNetworkError';
  }
}

/**
 * Helper function to wrap unknown errors into typed Keycloak errors
 */
export function wrapError(error: unknown, defaultCode: ErrorCode): KeycloakError {
  if (error instanceof KeycloakError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const errorMessage = message.toLowerCase();

  // Detect error type from message
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return new KeycloakNetworkError(message, ErrorCodes.NETWORK_ERROR, error);
  }
  
  if (errorMessage.includes('timeout')) {
    return new KeycloakNetworkError(message, ErrorCodes.TIMEOUT, error);
  }
  
  if (errorMessage.includes('cors')) {
    return new KeycloakNetworkError(message, ErrorCodes.CORS_ERROR, error);
  }
  
  if (errorMessage.includes('realm')) {
    return new KeycloakInitError(message, ErrorCodes.REALM_NOT_FOUND, error);
  }
  
  if (errorMessage.includes('client')) {
    return new KeycloakInitError(message, ErrorCodes.CLIENT_NOT_FOUND, error);
  }
  
  if (errorMessage.includes('token') && errorMessage.includes('refresh')) {
    return new KeycloakTokenError(message, ErrorCodes.TOKEN_REFRESH_FAILED, error);
  }
  
  if (errorMessage.includes('token') && errorMessage.includes('expired')) {
    return new KeycloakTokenError(message, ErrorCodes.TOKEN_EXPIRED, error);
  }

  // Default to the provided code
  return new KeycloakError(message, defaultCode, true, error);
}

/**
 * Check if an error is a configuration error (non-recoverable)
 */
export function isConfigError(error: unknown): boolean {
  if (error instanceof KeycloakConfigError) {
    return true;
  }
  
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('realm') || 
         message.includes('client') || 
         message.includes('config') ||
         message.includes('url') ||
         message.includes('redirect');
}

/**
 * Check if an error is a network error (recoverable with retry)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof KeycloakNetworkError) {
    return true;
  }
  
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('network') || 
         message.includes('timeout') || 
         message.includes('fetch') ||
         message.includes('cors');
}


