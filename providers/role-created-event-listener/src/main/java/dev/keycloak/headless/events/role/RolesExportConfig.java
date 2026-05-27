package dev.keycloak.headless.events.role;

import java.nio.file.Path;

public final class RolesExportConfig {

    public static final String DEFAULT_FILE_NAME_TEMPLATE = "{realm}-roles.json";

    private final boolean enabled;
    private final Path exportDirectory;
    private final String fileNameTemplate;

    public RolesExportConfig(boolean enabled, Path exportDirectory, String fileNameTemplate) {
        this.enabled = enabled;
        this.exportDirectory = exportDirectory;
        this.fileNameTemplate = fileNameTemplate;
    }

    public boolean enabled() {
        return enabled;
    }

    public Path exportDirectory() {
        return exportDirectory;
    }

    public String fileNameTemplate() {
        return fileNameTemplate;
    }

    public Path resolveExportFile(String realmName) {
        String fileName = fileNameTemplate.replace("{realm}", sanitizeFileName(realmName));
        return exportDirectory.resolve(fileName);
    }

    private static String sanitizeFileName(String realmName) {
        if (realmName == null || realmName.isEmpty()) {
            return "unknown-realm";
        }
        return realmName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
