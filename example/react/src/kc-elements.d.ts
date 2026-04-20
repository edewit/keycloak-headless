import type { DetailedHTMLProps, HTMLAttributes } from "react";

type KcRenderRolesAttrs = HTMLAttributes<HTMLElement> & {
  roles?: string;
  match?: string;
  resource?: string;
  "role-kind"?: string;
};

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "kc-render-authenticated": DetailedHTMLProps<
          HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        "kc-render-guest": DetailedHTMLProps<
          HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        "kc-login-button": DetailedHTMLProps<
          HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        "kc-logout-button": DetailedHTMLProps<
          HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
        "kc-account-link": DetailedHTMLProps<
          HTMLAttributes<HTMLElement> & { "redirect-uri"?: string },
          HTMLElement
        >;
        "kc-render-roles": DetailedHTMLProps<
          KcRenderRolesAttrs,
          HTMLElement
        >;
      }
    }
  }
}

export {};
