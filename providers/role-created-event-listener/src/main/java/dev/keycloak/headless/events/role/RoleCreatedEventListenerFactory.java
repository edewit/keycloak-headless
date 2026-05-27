package dev.keycloak.headless.events.role;

import java.nio.file.Path;

import org.keycloak.Config;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventListenerProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.provider.ProviderConfigurationBuilder;
import org.jboss.logging.Logger;

import java.util.List;

public class RoleCreatedEventListenerFactory implements EventListenerProviderFactory {

    public static final String ID = "headless-role-created";

    private static final Logger LOG = Logger.getLogger(RoleCreatedEventListenerFactory.class);

    private Logger.Level logLevel = Logger.Level.INFO;
    private RolesExportConfig exportConfig = new RolesExportConfig(
            true,
            Path.of(System.getProperty("java.io.tmpdir"), "keycloak-role-exports"),
            RolesExportConfig.DEFAULT_FILE_NAME_TEMPLATE);

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new RoleCreatedEventListener(session, logLevel, exportConfig);
    }

    @Override
    public void init(Config.Scope config) {
        String configuredLevel = config.get("log-level", "info");
        try {
            logLevel = Logger.Level.valueOf(configuredLevel.toUpperCase());
        } catch (IllegalArgumentException e) {
            LOG.warnf("Invalid log-level '%s' for %s, using INFO", configuredLevel, ID);
            logLevel = Logger.Level.INFO;
        }

        boolean exportEnabled = config.getBoolean("export-enabled", true);
        String exportDirectory = config.get("export-directory", Path.of(System.getProperty("java.io.tmpdir"), "keycloak-role-exports").toString());
        String fileNameTemplate = config.get("export-file-name", RolesExportConfig.DEFAULT_FILE_NAME_TEMPLATE);

        exportConfig = new RolesExportConfig(exportEnabled, Path.of(exportDirectory), fileNameTemplate);
        LOG.infof("%s role export: enabled=%s, directory=%s, fileName=%s",
                ID, exportEnabled, exportDirectory, fileNameTemplate);
    }

    @Override
    public boolean isGlobal() {
        // Active on every realm when the provider JAR is installed; no need to add the id under Realm → Events.
        return true;
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
    }

    @Override
    public void close() {
    }

    @Override
    public String getId() {
        return ID;
    }

    @Override
    public List<ProviderConfigProperty> getConfigMetadata() {
        return ProviderConfigurationBuilder.create()
                .property()
                .name("log-level")
                .type("string")
                .helpText("JBoss Logging level used when a role is created.")
                .defaultValue("info")
                .add()
                .property()
                .name("export-enabled")
                .type("boolean")
                .helpText("When true, writes all realm and client roles to a JSON file after each role creation.")
                .defaultValue("true")
                .add()
                .property()
                .name("export-directory")
                .type("string")
                .helpText("Directory for JSON export files. Use a persistent volume in containers.")
                .defaultValue(Path.of(System.getProperty("java.io.tmpdir"), "keycloak-role-exports").toString())
                .add()
                .property()
                .name("export-file-name")
                .type("string")
                .helpText("Output file name template. {realm} is replaced with the realm name.")
                .defaultValue(RolesExportConfig.DEFAULT_FILE_NAME_TEMPLATE)
                .add()
                .build();
    }
}
