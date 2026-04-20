// Main entry: context types only (no custom element registration).
// Import `keycloak-headless/provider` to register web components.
export { authContext, type AuthState } from "./components/provider/kc-context.js";
export { subscribeAuthContext } from "./subscribe-auth-context.js";
