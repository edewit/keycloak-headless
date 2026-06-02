import { createComponent } from "@lit/react";
import * as React from "react";

import { KcProvider } from "../components/provider/kc-provider.js";

import { AuthBridge } from "./auth-context.js";

/**
 * React wrapper for the Keycloak web component.
 * @private
 */
const KcProviderElement = createComponent({
  react: React,
  tagName: "kc-provider",
  elementClass: KcProvider,
  events: {},
});

/**
 * Props for the KeycloakProvider component.
 * Extends all properties from the underlying `<kc-provider>` web component.
 */
export type KeycloakProviderProps = React.ComponentProps<
  typeof KcProviderElement
> & {
  /** React children to render within the provider */
  children?: React.ReactNode;
};

/**
 * React provider component for Keycloak authentication.
 *
 * This component wraps the `<kc-provider>` web component and provides React-specific
 * context integration. It must be placed at the root of your React application to
 * enable authentication throughout your component tree.
 *
 * @component
 * @example Basic setup
 * ```tsx
 * import { KeycloakProvider } from 'keycloak-headless/react';
 *
 * function App() {
 *   return (
 *     <KeycloakProvider
 *       url="https://keycloak.example.com/"
 *       realm="myrealm"
 *       clientId="my-spa"
 *       onLoad="check-sso"
 *     >
 *       <YourApp />
 *     </KeycloakProvider>
 *   );
 * }
 * ```
 *
 * @example With custom configuration
 * ```tsx
 * <KeycloakProvider
 *   url="https://keycloak.example.com/"
 *   realm="myrealm"
 *   clientId="my-spa"
 *   scope="openid profile email"
 *   pkceMethod="S256"
 *   onLoad="check-sso"
 *   enableLogging={true}
 * >
 *   <App />
 * </KeycloakProvider>
 * ```
 *
 * @example Force login
 * ```tsx
 * <KeycloakProvider
 *   url="https://keycloak.example.com/"
 *   realm="myrealm"
 *   clientId="my-spa"
 *   onLoad="login-required"
 * >
 *   <ProtectedApp />
 * </KeycloakProvider>
 * ```
 *
 * @param props - Component props including Keycloak configuration and children
 * @returns React element wrapping children with auth context
 */
export function KeycloakProvider({
  children,
  ...props
}: KeycloakProviderProps) {
  return (
    <KcProviderElement {...props}>
      <AuthBridge>{children}</AuthBridge>
    </KcProviderElement>
  );
}
