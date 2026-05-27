package dev.keycloak.headless.events.role;

import java.util.ArrayList;
import java.util.List;

import org.keycloak.models.AbstractKeycloakTransaction;

final class RoleExportTransaction extends AbstractKeycloakTransaction {

    private final List<PendingExport> pendingExports = new ArrayList<>();

    void scheduleExport(RealmRolesExport export, java.nio.file.Path outputFile) {
        pendingExports.add(new PendingExport(export, outputFile));
    }

    @Override
    protected void commitImpl() {
        for (PendingExport pending : pendingExports) {
            RolesJsonExporter.writeExport(pending.export(), pending.outputFile());
        }
    }

    @Override
    protected void rollbackImpl() {
        pendingExports.clear();
    }

    private static final class PendingExport {
        private final RealmRolesExport export;
        private final java.nio.file.Path outputFile;

        private PendingExport(RealmRolesExport export, java.nio.file.Path outputFile) {
            this.export = export;
            this.outputFile = outputFile;
        }

        private RealmRolesExport export() {
            return export;
        }

        private java.nio.file.Path outputFile() {
            return outputFile;
        }
    }
}
