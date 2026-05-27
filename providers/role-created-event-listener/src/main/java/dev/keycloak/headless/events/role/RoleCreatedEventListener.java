package dev.keycloak.headless.events.role;

import java.nio.file.Path;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.events.admin.OperationType;
import org.keycloak.events.admin.ResourceType;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.jboss.logging.Logger;

/**
 * Receives admin events when realm or client roles are created through the Admin API.
 */
public class RoleCreatedEventListener implements EventListenerProvider {

    private static final Logger LOG = Logger.getLogger(RoleCreatedEventListener.class);

    private final KeycloakSession session;
    private final Logger.Level logLevel;
    private final RolesExportConfig exportConfig;
    private final RoleExportTransaction exportTx;

    public RoleCreatedEventListener(KeycloakSession session, Logger.Level logLevel, RolesExportConfig exportConfig) {
        this.session = session;
        this.logLevel = logLevel;
        this.exportConfig = exportConfig;
        this.exportTx = new RoleExportTransaction();
        session.getTransactionManager().enlistAfterCompletion(exportTx);
    }

    @Override
    public void onEvent(Event event) {
    }

    @Override
    public void onEvent(AdminEvent event, boolean includeRepresentation) {
        if (event.getError() != null) {
            return;
        }

        if (event.getOperationType() != OperationType.CREATE) {
            return;
        }

        ResourceType resourceType = event.getResourceType();
        if (resourceType != ResourceType.REALM_ROLE && resourceType != ResourceType.CLIENT_ROLE) {
            return;
        }

        if (LOG.isEnabled(logLevel)) {
            String roleName = roleNameFromResourcePath(event.getResourcePath());
            LOG.logf(logLevel,
                    "Role created: name=%s, type=%s, realm=%s, path=%s",
                    roleName,
                    resourceType,
                    event.getRealmName(),
                    event.getResourcePath());

            if (includeRepresentation && event.getRepresentation() != null) {
                LOG.logf(logLevel, "Role representation: %s", event.getRepresentation());
            }
        }

        if (!exportConfig.enabled()) {
            return;
        }

        RealmModel realm = session.realms().getRealm(event.getRealmId());
        if (realm == null) {
            LOG.warnf("Cannot export roles: realm %s not found", event.getRealmId());
            return;
        }

        RealmRolesExport snapshot = RolesJsonExporter.buildExport(realm);
        Path outputFile = exportConfig.resolveExportFile(realm.getName());
        LOG.debugf("Scheduled role export for realm '%s' to %s after transaction commit", realm.getName(), outputFile);
        exportTx.scheduleExport(snapshot, outputFile);
    }

    private static String roleNameFromResourcePath(String resourcePath) {
        if (resourcePath == null || resourcePath.isEmpty()) {
            return null;
        }
        int slashIndex = resourcePath.lastIndexOf('/');
        if (slashIndex < 0 || slashIndex == resourcePath.length() - 1) {
            return resourcePath;
        }
        return resourcePath.substring(slashIndex + 1);
    }

    @Override
    public void close() {
    }
}
