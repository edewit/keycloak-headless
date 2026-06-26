import { oidcEarlyInit } from "oidc-spa/core";

const { shouldLoadApp } = oidcEarlyInit({
  BASE_URL: import.meta.env.BASE_URL,
});

if (shouldLoadApp) {
  void import("./main.lazy");
}
