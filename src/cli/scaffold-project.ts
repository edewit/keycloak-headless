import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type Framework = "react" | "vue" | "solid" | "svelte";

export interface ScaffoldOptions {
  framework: Framework;
  projectName: string;
  targetDir: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
  keycloakHeadlessVersion: string;
  keycloakRoleCreatedVersion: string;
  packageRoot?: string;
}

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
  ".html",
  ".json",
  ".js",
  ".mjs",
  ".cjs",
]);

const PLACEHOLDERS: Record<string, (options: ScaffoldOptions) => string> = {
  __PROJECT_NAME__: (o) => o.projectName,
  __KEYCLOAK_URL__: (o) => o.keycloakUrl,
  __KEYCLOAK_REALM__: (o) => o.keycloakRealm,
  __KEYCLOAK_CLIENT_ID__: (o) => o.keycloakClientId,
  __KEYCLOAK_HEADLESS_VERSION__: (o) => o.keycloakHeadlessVersion,
  __KEYCLOAK_ROLE_CREATED_VERSION__: (o) => o.keycloakRoleCreatedVersion,
};

export function getPackageRoot(fromModuleUrl: string): string {
  const cliDir = dirname(fileURLToPath(fromModuleUrl));
  return resolve(cliDir, "../..");
}

export function validateTargetDirectory(targetDir: string): void {
  if (!existsSync(targetDir)) {
    return;
  }

  const entries = readdirSync(targetDir);
  if (entries.length > 0) {
    throw new Error(
      `Target directory "${targetDir}" already exists and is not empty.`,
    );
  }
}

function substitutePlaceholders(
  content: string,
  options: ScaffoldOptions,
): string {
  let result = content;
  for (const [token, getValue] of Object.entries(PLACEHOLDERS)) {
    result = result.replaceAll(token, getValue(options));
  }
  return result;
}

function copyTemplateDirectory(
  sourceDir: string,
  targetDir: string,
  options: ScaffoldOptions,
): void {
  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir)) {
    const sourcePath = join(sourceDir, entry);
    const targetPath = join(targetDir, entry);
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      copyTemplateDirectory(sourcePath, targetPath, options);
      continue;
    }

    const ext = entry.includes(".") ? `.${entry.split(".").pop()}` : "";
    if (TEXT_EXTENSIONS.has(ext)) {
      const content = readFileSync(sourcePath, "utf8");
      writeFileSync(targetPath, substitutePlaceholders(content, options), "utf8");
    } else {
      cpSync(sourcePath, targetPath);
    }
  }
}

export function scaffoldProject(options: ScaffoldOptions): void {
  const packageRoot = options.packageRoot ?? getPackageRoot(import.meta.url);
  const templateDir = join(packageRoot, "templates", options.framework);
  const rolesFixture = join(packageRoot, "scripts", "fixtures", "master-roles.json");

  if (!existsSync(templateDir)) {
    throw new Error(`Template not found for framework "${options.framework}".`);
  }

  if (!existsSync(rolesFixture)) {
    throw new Error(`Roles fixture not found at "${rolesFixture}".`);
  }

  validateTargetDirectory(options.targetDir);
  mkdirSync(options.targetDir, { recursive: true });

  copyTemplateDirectory(templateDir, options.targetDir, options);
  copyFileSync(rolesFixture, join(options.targetDir, "keycloak-roles.json"));
}
