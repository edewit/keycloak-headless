import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";
import { resolve } from "path";
import { copyFileSync, readdirSync, statSync } from "fs";
import dts from "vite-plugin-dts";

function getComponentEntries(dir: string): Record<string, string> {
  const entries: Record<string, string> = {};
  const componentsDir = resolve(__dirname, dir);

  try {
    const components = readdirSync(componentsDir);
    for (const component of components) {
      const componentPath = resolve(componentsDir, component);
      if (statSync(componentPath).isDirectory()) {
        const mainFile = resolve(componentPath, `kc-${component}.ts`);
        entries[`components/${component}/kc-${component}`] = mainFile;
      }
    }
  } catch {
    // Components directory doesn't exist yet
  }

  return entries;
}

const externalPackages = new Set([
  "vite",
  "node:fs",
  "node:path",
  "node:url",
  "node:os",
  "node:child_process",
  "@keycloak/keycloak-admin-client",
  "@inquirer/prompts",
  "commander",
  "lit",
  "lit/decorators.js",
  "lit/directives/class-map.js",
  "react",
  "react/jsx-runtime",
  "@lit/react",
  "vue",
  "svelte",
  "svelte/store",
  "solid-js",
]);

function isExternal(id: string): boolean {
  if (externalPackages.has(id)) return true;
  if (id.startsWith("svelte/")) return true;
  if (id.includes("/svelte/src/internal/")) return true;
  return false;
}

/** Map resolved Svelte internals to stable package subpath imports in dist. */
function svelteInternalPath(id: string): string | undefined {
  const match = id.match(/svelte\/src\/internal\/(.+)\.js$/);
  if (!match) return undefined;
  return `svelte/internal/${match[1]}.js`;
}

function copySvelteModuleTypes(): Plugin {
  const src = resolve(__dirname, "src/svelte/use-keycloak-auth.svelte.d.ts");
  const dest = resolve(__dirname, "dist/svelte/use-keycloak-auth.svelte.d.ts");
  return {
    name: "copy-svelte-module-types",
    closeBundle() {
      copyFileSync(src, dest);
    },
  };
}

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        runes: true,
      },
    }),
    dts({
      include: ["src"],
      exclude: ["**/*.test.ts", "**/*.svelte.ts"],
    }),
    copySvelteModuleTypes(),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "react/index": resolve(__dirname, "src/react/index.ts"),
        "vue/index": resolve(__dirname, "src/vue/index.ts"),
        "svelte/index": resolve(__dirname, "src/svelte/index.ts"),
        "solid/index": resolve(__dirname, "src/solid/index.ts"),
        "vite/index": resolve(__dirname, "src/vite/index.ts"),
        "components/provider/index": resolve(
          __dirname,
          "src/components/provider/index.ts",
        ),
        "cli/fetch-keycloak-roles": resolve(
          __dirname,
          "src/cli/fetch-keycloak-roles.ts",
        ),
        "cli/create": resolve(__dirname, "src/cli/create.ts"),
        "cli/keycloak-headless": resolve(
          __dirname,
          "src/cli/keycloak-headless.ts",
        ),
        ...getComponentEntries("src/components"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: isExternal,
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
        paths: (id) => svelteInternalPath(id) ?? id,
      },
    },
    sourcemap: true,
    minify: false,
  },
});
