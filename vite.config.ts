import { defineConfig } from "vite";
import { resolve } from "path";
import { readdirSync, statSync } from "fs";
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

export default defineConfig({
  plugins: [
    dts({
      include: ["src"],
      exclude: ["**/*.test.ts"],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "react/index": resolve(__dirname, "src/react/index.ts"),
        "components/provider/index": resolve(
          __dirname,
          "src/components/provider/index.ts",
        ),
        ...getComponentEntries("src/components"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "lit",
        "lit/decorators.js",
        "lit/directives/class-map.js",
        "react",
        "react/jsx-runtime",
        "@lit/react",
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
    minify: false,
  },
});
