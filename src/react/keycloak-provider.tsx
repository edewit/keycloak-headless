import { createComponent } from "@lit/react";
import * as React from "react";

import { KcProvider } from "../components/provider/kc-provider.js";

import { AuthBridge } from "./auth-context.js";

const KcProviderElement = createComponent({
  react: React,
  tagName: "kc-provider",
  elementClass: KcProvider,
  events: {},
});

export type KeycloakProviderProps = React.ComponentProps<
  typeof KcProviderElement
> & {
  children?: React.ReactNode;
};

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
